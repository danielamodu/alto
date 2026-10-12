import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { troveManagerAbi } from "../abis/troveManager";
import { priceFeedAbi } from "../abis/priceFeed";

export interface UseTroveResult {
  troveStatus: number;
  troveColl: bigint;
  troveDebt: bigint;
  currentICR: bigint;
  hasActiveTrove: boolean;
  isLoading: boolean;
  isError: boolean;
  btcPrice: bigint;
  btcPriceLoading: boolean;
  refetch: () => void;
}

function toStatusNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  return 0;
}

function toBigint(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

export function useTrove(): UseTroveResult {
  const { address } = useAccount();
  const enabled = Boolean(address);
  const borrower = address as Address | undefined;

  const {
    data: priceRaw,
    isLoading: priceLoading,
    isError: priceError,
  } = useReadContract({
    address: CONTRACTS.PRICE_FEED,
    abi: priceFeedAbi,
    functionName: "fetchPrice",
  });

  const btcPrice = toBigint(priceRaw);

  const {
    data: statusRaw,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveStatus",
    args: borrower ? [borrower] : undefined,
    query: { enabled },
  });

  const {
    data: collRaw,
    isLoading: collLoading,
    isError: collError,
    refetch: refetchColl,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveColl",
    args: borrower ? [borrower] : undefined,
    query: { enabled },
  });

  const {
    data: debtRaw,
    isLoading: debtLoading,
    isError: debtError,
    refetch: refetchDebt,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getTroveDebt",
    args: borrower ? [borrower] : undefined,
    query: { enabled },
  });

  const priceReady = btcPrice > 0n;

  const {
    data: icrRaw,
    isLoading: icrLoading,
    isError: icrError,
    refetch: refetchIcr,
  } = useReadContract({
    address: CONTRACTS.TROVE_MANAGER,
    abi: troveManagerAbi,
    functionName: "getCurrentICR",
    args: borrower && priceReady ? [borrower, btcPrice] : undefined,
    query: { enabled: enabled && priceReady },
  });

  const troveStatus = toStatusNumber(statusRaw);

  function refetch(): void {
    void refetchStatus();
    void refetchColl();
    void refetchDebt();
    void refetchIcr();
  }

  return {
    troveStatus,
    troveColl: toBigint(collRaw),
    troveDebt: toBigint(debtRaw),
    currentICR: toBigint(icrRaw),
    hasActiveTrove: troveStatus === 1,
    isLoading:
      priceLoading || statusLoading || collLoading || debtLoading || icrLoading,
    isError:
      priceError || statusError || collError || debtError || icrError,
    btcPrice,
    btcPriceLoading: priceLoading,
    refetch,
  };
}
