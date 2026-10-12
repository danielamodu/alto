import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { borrowerOperationsAbi } from "../abis/borrowerOperations";
import { erc20Abi } from "../abis/erc20";
import { stabilityPoolAbi } from "../abis/stabilityPool";
import { useTrove } from "./useTrove";
import { useStabilityPool } from "./useStabilityPool";
import { computeInsertHints } from "../lib/hints";
import { toErrorMessage } from "../lib/errors";

export type BoostStep = "idle" | "borrowing" | "depositing" | "done";

export interface BoostParams {
  additionalDebt: bigint;
  newICRPercent: number;
  upperHint: Address;
  lowerHint: Address;
  isSafe: boolean;
}

export interface UseBoostResult {
  boostMultiplier: number;
  setBoostMultiplier: (n: number) => void;
  boostParams: BoostParams | null;
  previewLoading: boolean;
  isPending: boolean;
  currentStep: BoostStep;
  error: string | null;
  executeBoost: () => Promise<void>;
}

/// @notice Collateral ratio floor for the safety check (protocol MCR is 110%).
const SAFE_RATIO_PERCENT = 150;

export function useBoost(): UseBoostResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { troveColl, troveDebt, btcPrice, refetch: refetchTrove } = useTrove();
  const { spDeposit, refetch: refetchSP } = useStabilityPool();

  const [boostMultiplier, setBoostMultiplier] = useState(1);
  const [boostParams, setBoostParams] = useState<BoostParams | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [currentStep, setCurrentStep] = useState<BoostStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | undefined>(undefined);

  const { writeContractAsync, isPending: writePending } = useWriteContract();
  useWaitForTransactionReceipt({ hash: txHash });

  // Preview: recompute debt, ICR and hints whenever inputs change.
  useEffect(() => {
    let cancelled = false;

    async function preview(): Promise<void> {
      if (
        address == null ||
        publicClient == null ||
        boostMultiplier <= 1 ||
        spDeposit <= 0n ||
        troveColl <= 0n ||
        btcPrice <= 0n
      ) {
        setBoostParams(null);
        return;
      }
      setPreviewLoading(true);
      try {
        const additionalDebt = spDeposit * BigInt(boostMultiplier - 1);

        const borrowingFee = (await publicClient.readContract({
          address: CONTRACTS.BORROWER_OPERATIONS,
          abi: borrowerOperationsAbi,
          functionName: "getBorrowingFee",
          args: [additionalDebt],
        })) as bigint;

        const newDebt = troveDebt + additionalDebt + borrowingFee;
        if (newDebt <= 0n) {
          if (!cancelled) setBoostParams(null);
          return;
        }

        const newICRRaw = (troveColl * btcPrice) / newDebt;
        const newICRPercent = Number(
          (newICRRaw * 100n) / 1000000000000000000n,
        );
        const nicr = (troveColl * 100000000000000000000n) / newDebt;
        const { upperHint, lowerHint } = await computeInsertHints(
          publicClient,
          nicr,
        );

        if (!cancelled) {
          setBoostParams({
            additionalDebt,
            newICRPercent,
            upperHint,
            lowerHint,
            isSafe: newICRPercent >= SAFE_RATIO_PERCENT,
          });
        }
      } catch {
        if (!cancelled) setBoostParams(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void preview();
    return () => {
      cancelled = true;
    };
  }, [
    address,
    publicClient,
    boostMultiplier,
    spDeposit,
    troveColl,
    troveDebt,
    btcPrice,
  ]);

  async function executeBoost(): Promise<void> {
    const params = boostParams;
    if (params == null) {
      setError("Boost preview not ready — adjust the slider and retry");
      return;
    }
    if (!params.isSafe) {
      setError("Boost level too risky at current collateral");
      return;
    }
    if (address == null) {
      setError("Connect your wallet first");
      return;
    }
    if (publicClient == null) {
      setError("Wallet client not ready — reconnect and retry");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      setCurrentStep("borrowing");
      const borrowHash = await writeContractAsync({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "adjustTrove",
        args: [0n, params.additionalDebt, true, params.upperHint, params.lowerHint],
      });
      setTxHash(borrowHash as Address);
      await publicClient.waitForTransactionReceipt({ hash: borrowHash });

      setCurrentStep("depositing");
      const allowance = (await publicClient.readContract({
        address: CONTRACTS.MUSD_TOKEN,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address as Address, CONTRACTS.STABILITY_POOL as Address],
      })) as bigint;

      if (allowance < params.additionalDebt) {
        const approveHash = await writeContractAsync({
          address: CONTRACTS.MUSD_TOKEN,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.STABILITY_POOL as Address, params.additionalDebt],
        });
        setTxHash(approveHash as Address);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const depositHash = await writeContractAsync({
        address: CONTRACTS.STABILITY_POOL,
        abi: stabilityPoolAbi,
        functionName: "provideToSP",
        args: [params.additionalDebt],
      });
      setTxHash(depositHash as Address);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });

      setCurrentStep("done");
      refetchTrove();
      refetchSP();
    } catch (err: unknown) {
      setError(toErrorMessage(err));
      setCurrentStep("idle");
      throw err;
    } finally {
      setIsPending(false);
    }
  }

  return {
    boostMultiplier,
    setBoostMultiplier,
    boostParams,
    previewLoading,
    isPending: isPending || writePending,
    currentStep,
    error,
    executeBoost,
  };
}
