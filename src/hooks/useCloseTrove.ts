import { useState } from "react";
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
import { useTrove } from "./useTrove";
import { toErrorMessage } from "../lib/errors";

export interface UseCloseTroveResult {
  closePosition: () => Promise<void>;
  isPending: boolean;
  isConfirmed: boolean;
  error: string | null;
}

export function useCloseTrove(): UseCloseTroveResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { troveDebt } = useTrove();

  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Address | undefined>(undefined);

  const { writeContractAsync, isPending: writePending } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  async function closePosition(): Promise<void> {
    if (troveDebt <= 0n) {
      setError("No active debt to close");
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

    setIsBusy(true);
    setError(null);

    try {
      const allowance = (await publicClient.readContract({
        address: CONTRACTS.MUSD_TOKEN,
        abi: erc20Abi,
        functionName: "allowance",
        args: [address as Address, CONTRACTS.BORROWER_OPERATIONS as Address],
      })) as bigint;

      if (allowance < troveDebt) {
        const approveHash = await writeContractAsync({
          address: CONTRACTS.MUSD_TOKEN,
          abi: erc20Abi,
          functionName: "approve",
          args: [CONTRACTS.BORROWER_OPERATIONS as Address, troveDebt],
        });
        setTxHash(approveHash as Address);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const closeHash = await writeContractAsync({
        address: CONTRACTS.BORROWER_OPERATIONS,
        abi: borrowerOperationsAbi,
        functionName: "closeTrove",
      });
      setTxHash(closeHash as Address);
      await publicClient.waitForTransactionReceipt({ hash: closeHash });
    } catch (err: unknown) {
      setError(toErrorMessage(err));
      throw err;
    } finally {
      setIsBusy(false);
    }
  }

  return {
    closePosition,
    isPending: isBusy || writePending,
    isConfirmed,
    error,
  };
}
