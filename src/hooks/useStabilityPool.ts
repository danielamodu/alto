import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { stabilityPoolAbi } from "../abis/stabilityPool";

export interface UseStabilityPoolResult {
  spDeposit: bigint;
  btcGain: bigint;
  isLoading: boolean;
  refetch: () => void;
}

function toBigint(value: unknown): bigint {
  return typeof value === "bigint" ? value : 0n;
}

export function useStabilityPool(): UseStabilityPoolResult {
  const { address } = useAccount();
  const enabled = Boolean(address);
  const depositor = address as Address | undefined;

  const {
    data: depositRaw,
    isLoading: depositLoading,
    refetch: refetchDeposit,
  } = useReadContract({
    address: CONTRACTS.STABILITY_POOL,
    abi: stabilityPoolAbi,
    functionName: "getCompoundedMUSDDeposit",
    args: depositor ? [depositor] : undefined,
    query: { enabled, refetchInterval: 30_000 },
  });

  const {
    data: gainRaw,
    isLoading: gainLoading,
    refetch: refetchGain,
  } = useReadContract({
    address: CONTRACTS.STABILITY_POOL,
    abi: stabilityPoolAbi,
    functionName: "getDepositorBTCGain",
    args: depositor ? [depositor] : undefined,
    query: { enabled, refetchInterval: 30_000 },
  });

  function refetch(): void {
    void refetchDeposit();
    void refetchGain();
  }

  return {
    spDeposit: toBigint(depositRaw),
    btcGain: toBigint(gainRaw),
    isLoading: depositLoading || gainLoading,
    refetch,
  };
}
