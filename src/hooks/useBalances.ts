import { useAccount, useBalance, useReadContract } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CONTRACTS } from "../config/contracts";

const erc20BalanceOfAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const MUSD_DECIMALS = 18;

interface UseBalancesResult {
  btcBalance: string;
  musdBalance: string;
  musdBalanceRaw: bigint;
  isLoading: boolean;
  isError: boolean;
  btcError: Error | null;
  musdError: Error | null;
}

function formatBigint(value: bigint | undefined, decimals: number): string {
  if (value === undefined) return "0";
  return formatUnits(value, decimals);
}

export function useBalances(): UseBalancesResult {
  const { address } = useAccount();

  const {
    data: btcData,
    isLoading: btcLoading,
    isError: btcIsError,
    error: btcQueryError,
  } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const {
    data: musdRaw,
    isLoading: musdLoading,
    isError: musdIsError,
    error: musdQueryError,
  } = useReadContract({
    address: CONTRACTS.MUSD_TOKEN,
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: address ? [address as Address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const btcBalance = btcData
    ? `${Number(btcData.formatted).toFixed(4)}`
    : "0.0000";

  const musdBalance =
    typeof musdRaw === "bigint"
      ? Number(formatBigint(musdRaw, MUSD_DECIMALS)).toFixed(2)
      : "0.00";

  return {
    btcBalance,
    musdBalance,
    musdBalanceRaw: typeof musdRaw === "bigint" ? musdRaw : 0n,
    isLoading: btcLoading || musdLoading,
    isError: btcIsError || musdIsError,
    btcError: btcQueryError instanceof Error ? btcQueryError : null,
    musdError: musdQueryError instanceof Error ? musdQueryError : null,
  };
}
