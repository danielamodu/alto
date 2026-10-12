import type { Address, PublicClient } from "viem";
import { CONTRACTS } from "../config/contracts";
import { troveManagerAbi } from "../abis/troveManager";
import { hintHelpersAbi } from "../abis/hintHelpers";
import { sortedTrovesAbi } from "../abis/sortedTroves";

const RANDOM_SEED = 42n;

export interface InsertHints {
  upperHint: Address;
  lowerHint: Address;
}

/// @notice Compute SortedTroves insert hints for a nominal ICR.
/// @dev numTrials scales with trove count (sqrt * 15, min 15), same as open flow.
export async function computeInsertHints(
  publicClient: PublicClient,
  nicr: bigint,
): Promise<InsertHints> {
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

  return { upperHint, lowerHint };
}
