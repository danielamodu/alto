/// @notice Extract a human-readable message from wagmi/viem mistakes.
/// Prefers shortMessage (revert reasons, rejections) over raw message.
export function toErrorMessage(err: unknown): string {
  const message =
    (err as { shortMessage?: string } | null)?.shortMessage ??
    (err as Error | null)?.message ??
    "Transaction failed";
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}
