import { useState } from "react";
import {
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import type { Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { borrowerOperationsAbi } from "../abis/borrowerOperations";
import { troveManagerAbi } from "../abis/troveManager";
import { hintHelpersAbi } from "../abis/hintHelpers";
import { sortedTrovesAbi } from "../abis/sortedTroves";
import { toErrorMessage } from "../lib/errors";

const MAX_FEE_PERCENTAGE = 5000000000000000n;
const RANDOM_SEED = 42n;

export interface UseOpenTroveResult {
  openTrove: (btcAmountWei: bigint, musdAmountWei: bigint) => Promise<void>;
  isPending: boolean;
  isConfirmed: boolean;
  error: string | null;
}

export function useOpenTrove(): UseOpenTroveResult {
  const publicClient = usePublicClient();
  const [txHash, setTxHash] = useState<Address | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, isPending: writePending } = useWriteContract();

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function openTrove(
    btcAmountWei: bigint,
    musdAmountWei: bigint,
  ): Promise<void> {
    if (btcAmountWei <= 0n) {
      setError("Enter a BTC amount above 0");
      return;
    }
    if (musdAmountWei <= 0n) {
      setError("Enter a MUSD amount above 0");
      return;
    }
    if (!publicClient) {
      setError("Wallet client not ready — reconnect and retry");
      return;
    }

    setBusy(true);
    setError(null);
    setTxHash(undefined);

    try {
      const gasCompensation = (await publicClient.readContract({
        address: CONTRACTS.TROVE_MANAGER,
        abi: troveManagerAbi,
        functionName: "MUSD_GAS_COMPENSATION",
      })) as bigint;

      const borrowingFee = (await publicClient.readContract({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "getBorrowingFee",
        args: [musdAmountWei],
      })) as bigint;

      const expectedTotalDebt =
        musdAmountWei + borrowingFee + gasCompensation;
      if (expectedTotalDebt <= 0n) {
        throw new Error("Invalid debt computation");
      }

      const nicr = (btcAmountWei * 100000000000000000000n) / expectedTotalDebt;

      const ownersCount = (await publicClient.readContract({
        address: CONTRACTS.TROVE_MANAGER,
        abi: troveManagerAbi,
        functionName: "getTroveOwnersCount",
      })) as bigint;

      const countNum = Number(ownersCount);
      const numTrials = Math.max(
        15,
        Math.floor(Math.sqrt(Number.isFinite(countNum) ? countNum : 0) * 15),
      );

      const [approxHint] = (await publicClient.readContract({
        address: CONTRACTS.HINT_HELPERS,
        abi: hintHelpersAbi,
        functionName: "getApproxHint",
        args: [nicr, BigInt(numTrials), RANDOM_SEED],
      })) as readonly [Address, bigint, bigint];

      const [upperHint, lowerHint] = (await publicClient.readContract({
        address: CONTRACTS.SORTED_TROVES,
        abi: sortedTrovesAbi,
        functionName: "findInsertPosition",
        args: [nicr, approxHint, approxHint],
      })) as readonly [Address, Address];

      const hash = await writeContractAsync({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "openTrove",
        args: [MAX_FEE_PERCENTAGE, musdAmountWei, upperHint, lowerHint],
        value: btcAmountWei,
      });

      setTxHash(hash as Address);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    openTrove,
    isPending: busy || writePending,
    isConfirmed,
    error,
  };
}
