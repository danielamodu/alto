import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits, parseUnits, type Address } from "viem";
import { CONTRACTS } from "../config/contracts";
import { erc20Abi } from "../abis/erc20";
import { useStabilityPool } from "../hooks/useStabilityPool";
import { useStabilityPoolActions } from "../hooks/useStabilityPoolActions";

function parseInput(input: string): bigint | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  try {
    return parseUnits(trimmed, 18);
  } catch {
    return null;
  }
}

export default function Earn(): React.JSX.Element {
  const { address, isConnected } = useAccount();
  const location = useLocation();
  const notice =
    (location.state as { notice?: string } | null)?.notice ?? null;
  const { spDeposit, btcGain, isLoading, refetch } = useStabilityPool();
  const {
    depositToSP,
    withdrawFromSP,
    isDepositPending,
    isWithdrawPending,
    depositError,
    withdrawError,
    depositStep,
  } = useStabilityPoolActions();

  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [depositMsg, setDepositMsg] = useState<string | null>(null);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const { data: musdRaw } = useReadContract({
    address: CONTRACTS.MUSD_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address != null ? [address as Address] : undefined,
    query: { enabled: address != null },
  });
  const musdBalance: bigint = typeof musdRaw === "bigint" ? musdRaw : 0n;

  if (!isConnected || address == null) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h2>Connect your wallet</h2>
            <p className="muted">
              Connect on the home page to deposit MUSD and earn yield.
            </p>
            <Link className="btn" to="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const depositWei = parseInput(depositInput);
  const withdrawWei = parseInput(withdrawInput);

  const depositDisabled =
    depositWei == null ||
    depositWei <= 0n ||
    depositWei > musdBalance ||
    isDepositPending;

  const withdrawDisabled =
    withdrawWei == null ||
    withdrawWei <= 0n ||
    withdrawWei > spDeposit ||
    isWithdrawPending;

  const showEmptyState = musdBalance === 0n && spDeposit === 0n;

  async function handleDeposit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (depositWei == null || depositWei <= 0n) return;
    setDepositMsg(null);
    try {
      await depositToSP(depositWei);
      setDepositMsg(`Deposited ${depositInput.trim()} MUSD`);
      setDepositInput("");
      refetch();
    } catch {
      setDepositMsg(null);
    }
  }

  async function handleWithdraw(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (withdrawWei == null || withdrawWei <= 0n) return;
    setWithdrawMsg(null);
    try {
      await withdrawFromSP(withdrawWei);
      setWithdrawMsg(`Withdrawn ${withdrawInput.trim()} MUSD`);
      setWithdrawInput("");
      refetch();
    } catch {
      setWithdrawMsg(null);
    }
  }

  return (
    <main className="page">
      <div className="container">
        <Link className="back-link" to="/dashboard">
          ← Dashboard
        </Link>
        <p className="eyebrow">Earn</p>
        <h2>Deposit MUSD to earn yield from liquidations</h2>
        {notice ? <p className="notice">{notice}</p> : null}

        <section className="action-grid stats-row">
          <div className="card">
            <p className="label">Your deposit</p>
            {isLoading ? (
              <p className="value muted">Loading…</p>
            ) : (
              <p className="value">
                {Number(formatUnits(spDeposit, 18)).toFixed(2)} MUSD
              </p>
            )}
          </div>
          <div className="card">
            <p className="label">BTC earned</p>
            {isLoading ? (
              <p className="value muted">Loading…</p>
            ) : (
              <p className="value">
                {Number(formatUnits(btcGain, 18)).toFixed(4)} BTC
              </p>
            )}
          </div>
          <div className="card">
            <p className="label">
              Pool APY{" "}
              <span
                className="info-dot"
                title="Yield comes from liquidation bonuses. Higher in volatile markets."
              >
                ⓘ
              </span>
            </p>
            <p className="value">Variable</p>
          </div>
        </section>

        {showEmptyState ? (
          <div className="card">
            <h3>You need MUSD to start earning</h3>
            <p className="muted">Deposit BTC as collateral and mint MUSD.</p>
            <Link className="btn" to="/get-musd">
              Get MUSD first →
            </Link>
          </div>
        ) : (
          <>
            <form className="card form" onSubmit={(e) => void handleDeposit(e)}>
              <label className="field">
                <span className="label">Amount to deposit</span>
                <div className="input-row">
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={depositInput}
                    onChange={(e) => setDepositInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-mini"
                    onClick={() => setDepositInput(formatUnits(musdBalance, 18))}
                  >
                    MAX
                  </button>
                </div>
              </label>
              <p className="muted">
                Balance: {Number(formatUnits(musdBalance, 18)).toFixed(2)} MUSD
              </p>
              {isDepositPending ? (
                <div className="steps">
                  <p
                    className={
                      depositStep === "approve" ? "step-active" : "step-done"
                    }
                  >
                    Step 1: Approving MUSD…
                  </p>
                  <p
                    className={
                      depositStep === "deposit" ? "step-active" : "step-muted"
                    }
                  >
                    Step 2: Depositing…
                  </p>
                </div>
              ) : null}
              {depositError ? <p className="error">{depositError}</p> : null}
              {depositMsg && !depositError ? (
                <p className="success">{depositMsg}</p>
              ) : null}
              <button
                type="submit"
                className="btn"
                disabled={depositDisabled}
              >
                {isDepositPending ? "Working…" : "Deposit MUSD"}
              </button>
            </form>

            {spDeposit > 0n ? (
              <form
                className="card form"
                onSubmit={(e) => void handleWithdraw(e)}
              >
                <label className="field">
                  <span className="label">Amount to withdraw</span>
                  <div className="input-row">
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={withdrawInput}
                      onChange={(e) => setWithdrawInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-mini"
                      onClick={() =>
                        setWithdrawInput(formatUnits(spDeposit, 18))
                      }
                    >
                      MAX
                    </button>
                  </div>
                </label>
                {withdrawError ? (
                  <p className="error">{withdrawError}</p>
                ) : null}
                {withdrawMsg && !withdrawError ? (
                  <p className="success">{withdrawMsg}</p>
                ) : null}
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={withdrawDisabled}
                >
                  {isWithdrawPending ? "Working…" : "Withdraw"}
                </button>
              </form>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
