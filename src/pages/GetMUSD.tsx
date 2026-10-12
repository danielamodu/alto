import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useTrove } from "../hooks/useTrove";
import { useOpenTrove } from "../hooks/useOpenTrove";

const TROVE_STATUS_LABELS: Record<number, string> = {
  0: "No trove",
  1: "Active",
  2: "Closed by owner",
  3: "Closed by liquidation",
  4: "Closed by redemption",
};

export default function GetMUSD(): React.JSX.Element {
  const { isConnected } = useAccount();
  const {
    troveStatus,
    troveColl,
    troveDebt,
    currentICR,
    hasActiveTrove,
    isLoading: troveLoading,
    isError: troveError,
    btcPrice,
  } = useTrove();
  const { openTrove, isPending, isConfirmed, error } = useOpenTrove();

  const [btcInput, setBtcInput] = useState("0.01");
  const [musdInput, setMusdInput] = useState("100");
  const [formError, setFormError] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h2>Connect your wallet</h2>
            <p className="muted">
              Connect on the home page to deposit BTC and mint MUSD.
            </p>
            <Link className="btn" to="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    let btcWei: bigint;
    let musdWei: bigint;
    try {
      btcWei = parseUnits(btcInput.trim(), 18);
      musdWei = parseUnits(musdInput.trim(), 18);
    } catch {
      setFormError("Enter valid numbers for BTC and MUSD");
      return;
    }
    if (btcWei <= 0n || musdWei <= 0n) {
      setFormError("Amounts must be above 0");
      return;
    }
    await openTrove(btcWei, musdWei);
  }

  const priceFormatted =
    btcPrice > 0n ? Number(formatUnits(btcPrice, 18)).toFixed(2) : "—";
  const collFormatted = Number(formatUnits(troveColl, 18)).toFixed(4);
  const debtFormatted = Number(formatUnits(troveDebt, 18)).toFixed(2);

  return (
    <main className="page">
      <div className="container">
        <header className="dash-header">
          <div>
            <p className="eyebrow">Get MUSD</p>
            <h2>Deposit BTC, mint MUSD</h2>
          </div>
          <Link className="btn btn-secondary" to="/dashboard">
            Dashboard
          </Link>
        </header>

        <section className="balance-grid">
          <div className="card">
            <p className="label">BTC price</p>
            {troveLoading ? (
              <p className="value muted">Loading…</p>
            ) : (
              <p className="value">${priceFormatted}</p>
            )}
          </div>
          <div className="card">
            <p className="label">Trove status</p>
            {troveLoading ? (
              <p className="value muted">Loading…</p>
            ) : troveError ? (
              <p className="value error">Failed to load</p>
            ) : (
              <p className="value">
                {TROVE_STATUS_LABELS[troveStatus] ?? "Unknown"}
              </p>
            )}
          </div>
        </section>

        {hasActiveTrove ? (
          <div className="card">
            <h3>You already have an active trove</h3>
            <p className="muted">
              Collateral: {collFormatted} BTC · Debt: {debtFormatted} MUSD ·
              ICR: {currentICR > 0n ? formatUnits(currentICR, 18) : "—"}
            </p>
            <p className="muted">
              Adjust and close flows are coming soon.
            </p>
          </div>
        ) : (
          <form className="card form" onSubmit={(e) => void handleSubmit(e)}>
            <label className="field">
              <span className="label">BTC collateral</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0.01"
                value={btcInput}
                onChange={(e) => setBtcInput(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">MUSD to mint</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder="100"
                value={musdInput}
                onChange={(e) => setMusdInput(e.target.value)}
              />
            </label>
            <p className="muted">
              0.5% max fee + MUSD gas compensation applies. Hints are computed
              on-chain for you.
            </p>
            {formError ? <p className="error">{formError}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            {isConfirmed ? (
              <p className="success">Trove opened — MUSD minted.</p>
            ) : null}
            <button
              type="submit"
              className="btn"
              disabled={isPending || troveLoading}
            >
              {isPending ? "Confirm in wallet…" : "Open trove"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
