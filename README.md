# Alto

Your Bitcoin, finally working. Earn yield, borrow, and boost your MUSD — no DeFi knowledge needed.

React + TypeScript + Vite dApp on **Mezo Testnet** (chain ID 31611), with wallet connection via Mezo Passport (RainbowKit + wagmi + viem).

## Routes

- `/` — Landing with wallet connect
- `/dashboard` — BTC + MUSD balances
- `/get-musd` — Deposit BTC as collateral, mint MUSD

## Dev

```sh
pnpm install
pnpm dev
```

Set `VITE_WALLETCONNECT_PROJECT_ID` in a `.env` file for WalletConnect (optional for injected wallets).

```sh
pnpm build
```
