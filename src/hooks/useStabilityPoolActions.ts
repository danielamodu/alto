import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { erc20Abi } from "../abis/erc20";
import { stabilityPoolAbi } from "../abis/stabilityPool";

export type DepositStep = "approve" | "deposit" | null;

export interface UseStabilityPoolActionsResult {
  depositToSP: (amount: bigint) => Promise<void>;
  withdrawFromSP: (amount: bigint) => Promise<void>;
  isDepositPending: boolean;
  isWithdrawPending: boolean;
  depositError: string | null;
  withdrawError: string | null;
  depositStep: DepositStep;
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    return msg.length > 300 ? `${msg.slice(0, 300)}…` : msg;
  }
  return "Transaction failed";
}

export function useStabilityPoolActions(): UseStabilityPoolActionsResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [txHash, setTxHash] = useState<Address | undefined>(undefined);
  const [depositBusy, setDepositBusy] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [depositStep, setDepositStep] = useState<DepositStep>(null);

  const { writeContractAsync, isPending: writePending } = useWriteContract();

  useWaitForTransactionReceipt({ hash: txHash });

  const { refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.MUSD_TOKEN,
    abi: erc20Abi,
    functionName: "allowance",
    args:
      address != null
        ? [address as Address, CONTRACTS.STABILITY_POOL as Address]
        : undefined,
    query: { enabled: address != null },
  });

  async function depositToSP(amount: bigint): Promise<void> {
    if (amount <= 0n) {
      setDepositError("Enter an amount above 0");
      return;
    }
    if (address == null) {
      setDepositError("Connect your wallet first");
      return;
    }
    if (!publicClient) {
      setDepositError("Wallet client not ready — reconnect and retry");
      return;
    }

    setDepositBusy(true);
    setDepositError(null);
    setDepositStep(null);

    try {
      const { data: freshAllowance } = await refetchAllowance();
      const currentAllowance =
        typeof freshAllowance === "bigint" ? freshAllowance : 0n;

      if (currentAllowance < amount) {
        setDepositStep("approve");
        const approveHash = await writeContractAsync({
          address: CONTRACTS.MUSD_TOKEN,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.STABILITY_POOL as Address, amount],
        });
        setTxHash(approveHash as Address);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      setDepositStep("deposit");
      const depositHash = await writeContractAsync({
        address: CONTRACTS.STABILITY_POOL,
        abi: stabilityPoolAbi,
        functionName: "provideToSP",
        args: [amount],
      });
      setTxHash(depositHash as Address);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
    } catch (err: unknown) {
      setDepositError(toErrorMessage(err));
      throw err;
    } finally {
      setDepositBusy(false);
      setDepositStep(null);
    }
  }

  async function withdrawFromSP(amount: bigint): Promise<void> {
    if (amount <= 0n) {
      setWithdrawError("Enter an amount above 0");
      return;
    }
    if (address == null) {
      setWithdrawError("Connect your wallet first");
      return;
    }
    if (!publicClient) {
      setWithdrawError("Wallet client not ready — reconnect and retry");
      return;
    }

    setWithdrawBusy(true);
    setWithdrawError(null);

    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.STABILITY_POOL,
        abi: stabilityPoolAbi,
        functionName: "withdrawFromSP",
        args: [amount],
      });
      setTxHash(hash as Address);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err: unknown) {
      setWithdrawError(toErrorMessage(err));
      throw err;
    } finally {
      setWithdrawBusy(false);
    }
  }

  return {
    depositToSP,
    withdrawFromSP,
    isDepositPending: depositBusy || writePending,
    isWithdrawPending: withdrawBusy || writePending,
    depositError,
    withdrawError,
    depositStep: depositBusy ? depositStep : null,
  };
}
