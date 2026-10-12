import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import {
  decodeEventLog,
  encodeFunctionData,
  isAddress,
  type Address,
} from "viem";
import { CONTRACTS } from "../config/contracts";
import { altoRouterAbi } from "../abis/altoRouter";
import { borrowerOperationsAbi } from "../abis/borrowerOperations";
import { troveManagerAbi } from "../abis/troveManager";
import { stabilityPoolAbi } from "../abis/stabilityPool";
import { computeInsertHints } from "../lib/hints";
import { toErrorMessage } from "../lib/errors";

function storedProxyKey(owner: string): string {
  return `alto-proxy-${owner.toLowerCase()}`;
}

function loadStoredProxy(owner: string | undefined): Address | null {
  if (owner == null) return null;
  try {
    const raw = window.localStorage.getItem(storedProxyKey(owner));
    if (raw != null && isAddress(raw)) return raw;
  } catch {
    return null;
  }
  return null;
}

export interface UseLoopAccountResult {
  proxy: Address | null;
  isCreating: boolean;
  createError: string | null;
  createAccount: () => Promise<void>;
  proxyColl: bigint;
  proxyDebt: bigint;
  proxyStatus: number;
  proxySpDeposit: bigint;
  positionLoading: boolean;
  refetchPosition: () => void;
  openLoopedTrove: (btcWei: bigint, musdWei: bigint) => Promise<void>;
  loopMore: (additionalDebt: bigint) => Promise<void>;
  isActing: boolean;
  actionError: string | null;
}

function toBigint(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

export function useLoopAccount(): UseLoopAccountResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [saved, setSaved] = useState<{
    owner: string;
    proxy: Address;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // The active proxy always belongs to the connected wallet: prefer the
  // just-created one, otherwise fall back to this wallet's stored proxy.
  const activeProxy =
    address == null
      ? null
      : saved != null && saved.owner === address.toLowerCase()
        ? saved.proxy
        : loadStoredProxy(address);

  const enabled = activeProxy != null;

  const {
    data: collRaw,
    isLoading: collLoading,
    refetch: refetchColl,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveColl",
    args: activeProxy != null ? [activeProxy] : undefined,
    query: { enabled },
  });
  const {
    data: debtRaw,
    isLoading: debtLoading,
    refetch: refetchDebt,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveDebt",
    args: activeProxy != null ? [activeProxy] : undefined,
    query: { enabled },
  });
  const {
    data: statusRaw,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveStatus",
    args: activeProxy != null ? [activeProxy] : undefined,
    query: { enabled },
  });
  const {
    data: spRaw,
    isLoading: spLoading,
    refetch: refetchSp,
  } = useReadContract({
    address: CONTRACTS.STABILITY_POOL,
    abi: stabilityPoolAbi,
    functionName: "getCompoundedMUSDDeposit",
    args: activeProxy != null ? [activeProxy] : undefined,
    query: { enabled },
  });

  const positionLoading =
    collLoading || debtLoading || statusLoading || spLoading;

  function refetchPosition(): void {
    void refetchColl();
    void refetchDebt();
    void refetchStatus();
    void refetchSp();
  }

  async function createAccount(): Promise<void> {
    if (address == null) {
      setCreateError("Connect your wallet first");
      return;
    }
    if (publicClient == null) {
      setCreateError("Wallet client not ready — reconnect and retry");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.ALTO_ROUTER as Address,
        abi: altoRouterAbi,
        functionName: "createAccount",
      });
      const receipt =
        await publicClient.waitForTransactionReceipt({ hash });
      let found: Address | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: altoRouterAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "AccountCreated") {
            const args = decoded.args as { proxy?: Address };
            if (args.proxy != null && isAddress(args.proxy)) {
              found = args.proxy;
              break;
            }
          }
        } catch {
          continue;
        }
      }
      if (found == null) {
        throw new Error("Proxy created but address not found in logs");
      }
      try {
        window.localStorage.setItem(storedProxyKey(address), found);
      } catch {
        // Non-fatal: proxy still usable this session.
      }
      setSaved({ owner: address.toLowerCase(), proxy: found });
      refetchPosition();
    } catch (err: unknown) {
      setCreateError(toErrorMessage(err));
      throw err;
    } finally {
      setIsCreating(false);
    }
  }

  async function expectedTotalDebt(musdWei: bigint): Promise<bigint> {
    if (publicClient == null) throw new Error("Wallet client not ready");
    const [gasComp, fee] = (await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.TROVE_MANAGER,
        abi: troveManagerAbi,
        functionName: "MUSD_GAS_COMPENSATION",
      }),
      publicClient.readContract({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "getBorrowingFee",
        args: [musdWei],
      }),
    ])) as [bigint, bigint];
    return musdWei + fee + gasComp;
  }

  async function openLoopedTrove(
    btcWei: bigint,
    musdWei: bigint,
  ): Promise<void> {
    if (activeProxy == null) {
      setActionError("Create your smart account first");
      return;
    }
    if (publicClient == null) {
      setActionError("Wallet client not ready — reconnect and retry");
      return;
    }
    if (btcWei <= 0n || musdWei <= 0n) {
      setActionError("Amounts must be above 0");
      return;
    }
    setIsActing(true);
    setActionError(null);
    try {
      const total = await expectedTotalDebt(musdWei);
      const nicr = (btcWei * 100000000000000000000n) / total;
      const { upperHint, lowerHint } = await computeInsertHints(
        publicClient,
        nicr,
      );
      const data = encodeFunctionData({
        abi: altoRouterAbi,
        functionName: "openTrove",
        args: [musdWei, upperHint, lowerHint],
      });
      const hash = await sendTransactionAsync({
        to: activeProxy,
        data,
        value: btcWei,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      refetchPosition();
    } catch (err: unknown) {
      setActionError(toErrorMessage(err));
      throw err;
    } finally {
      setIsActing(false);
    }
  }

  async function loopMore(additionalDebt: bigint): Promise<void> {
    if (activeProxy == null) {
      setActionError("Create your smart account first");
      return;
    }
    if (publicClient == null) {
      setActionError("Wallet client not ready — reconnect and retry");
      return;
    }
    if (additionalDebt <= 0n) {
      setActionError("Enter an amount above 0");
      return;
    }
    const coll = toBigint(collRaw);
    const debt = toBigint(debtRaw);
    if (coll <= 0n) {
      setActionError("Open a looped trove first");
      return;
    }
    setIsActing(true);
    setActionError(null);
    try {
      const fee = (await publicClient.readContract({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "getBorrowingFee",
        args: [additionalDebt],
      })) as bigint;
      const nicr =
        (coll * 100000000000000000000n) / (debt + additionalDebt + fee);
      const { upperHint, lowerHint } = await computeInsertHints(
        publicClient,
        nicr,
      );
      const data = encodeFunctionData({
        abi: altoRouterAbi,
        functionName: "loop",
        args: [additionalDebt, upperHint, lowerHint],
      });
      const hash = await sendTransactionAsync({ to: activeProxy, data });
      await publicClient.waitForTransactionReceipt({ hash });
      refetchPosition();
    } catch (err: unknown) {
      setActionError(toErrorMessage(err));
      throw err;
    } finally {
      setIsActing(false);
    }
  }

  const statusRawVal = statusRaw;
  const proxyStatus =
    typeof statusRawVal === "bigint"
      ? Number(statusRawVal)
      : typeof statusRawVal === "number"
        ? statusRawVal
        : 0;

  return {
    proxy: activeProxy,
    isCreating,
    createError,
    createAccount,
    proxyColl: toBigint(collRaw),
    proxyDebt: toBigint(debtRaw),
    proxyStatus,
    proxySpDeposit: toBigint(spRaw),
    positionLoading,
    refetchPosition,
    openLoopedTrove,
    loopMore,
    isActing,
    actionError,
  };
}
