export const altoRouterAbi = [
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "proxy", type: "address" }],
  },
  {
    type: "function",
    name: "openTrove",
    stateMutability: "payable",
    inputs: [
      { name: "musdAmount", type: "uint256" },
      { name: "upperHint", type: "address" },
      { name: "lowerHint", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "loop",
    stateMutability: "nonpayable",
    inputs: [
      { name: "additionalDebt", type: "uint256" },
      { name: "upperHint", type: "address" },
      { name: "lowerHint", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawFromSP",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawMUSD",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;
