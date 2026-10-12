export const stabilityPoolAbi = [
  {
    type: "function",
    name: "provideToSP",
    stateMutability: "nonpayable",
    inputs: [{ name: "_amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFromSP",
    stateMutability: "nonpayable",
    inputs: [{ name: "_amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getCompoundedMUSDDeposit",
    stateMutability: "view",
    inputs: [{ name: "_depositor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getDepositorBTCGain",
    stateMutability: "view",
    inputs: [{ name: "_depositor", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
