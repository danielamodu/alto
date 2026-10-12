export const borrowerOperationsAbi = [
  {
    type: "function",
    name: "openTrove",
    stateMutability: "payable",
    inputs: [
      { name: "_maxFeePercentage", type: "uint256" },
      { name: "_MUSDAmount", type: "uint256" },
      { name: "_upperHint", type: "address" },
      { name: "_lowerHint", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getBorrowingFee",
    stateMutability: "view",
    inputs: [{ name: "_MUSDDebt", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "adjustTrove",
    stateMutability: "payable",
    inputs: [
      { name: "_collWithdrawal", type: "uint256" },
      { name: "_MUSDChange", type: "uint256" },
      { name: "_isDebtIncrease", type: "bool" },
      { name: "_upperHint", type: "address" },
      { name: "_lowerHint", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "closeTrove",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;
