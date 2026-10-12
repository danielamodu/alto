import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAccount, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useTrove } from "../hooks/useTrove";
import { useOpenTrove } from "../hooks/useOpenTrove";
import { useCloseTrove } from "../hooks/useCloseTrove";
import { useBalances } from "../hooks/useBalances";

const TROVE_STATUS_LABELS: Record<number, string> = {
  0: "No trove",
  1: "Active",
  2: "Closed by owner",
  3: "Closed by liquidation",
  4: "Closed by redemption",
};

function ClosePositionSection(): React.JSX.Element {
  const navigate = useNavigate();
  const { troveDebt, troveColl } = useTrove();
  const { musdBalanceRaw } = useBalances();
  const { closePosition, isPending, error } = useCloseTrove();
  const [closed, setClosed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    },
    [],
  );

  const shortfall =
    troveDebt > musdBalanceRaw ? troveDebt - musdBalanceRaw : 0n;

  async function handleClose(): Promise<void> {
    try {
      await closePosition();
      setClosed(true);
      timer.current = window.setTimeout(() => {
        void navigate("/dashboard");
      }, 2000);
    } catch {
      setClosed(false);
    }
  }

  return (
    <div className="card form">
      <h3>Close your position</h3>
      <p className="muted">
        Repay your MUSD debt and recover your BTC collateral.
      </p>
      <p className="muted">
        Debt: {Number(formatUnits(troveDebt, 18)).toFixed(2)} MUSD ·
        Collateral: {Number(formatUnits(troveColl, 18)).toFixed(4)} BTC ·
        Your MUSD: {Number(formatUnits(musdBalanceRaw, 18)).toFixed(2)} MUSD
      </p>
      {shortfall > 0n ? (
        <>
          <p className="error">
            You need {Number(formatUnits(shortfall, 18)).toFixed(2)} more MUSD
            to close. Withdraw from Earn first.
          </p>
          <Link className="btn btn-secondary" to="/earn">
            Go to Earn →
          </Link>
        </>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      {closed ? (
        <p className="success">Position closed. Your BTC has been returned.</p>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={shortfall > 0n || isPending}
          onClick={() => void handleClose()}
        >
          {isPending ? "Closing…" : "Close Position & Recover BTC"}
        </button>
      )}
    </div>
  );
}

export default function GetMUSD(): React.JSX.Element {
  const { isConnected, address } = useAccount();
  const location = useLocation();
  const notice =
    (location.state as { notice?: string } | null)?.notice ?? null;
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
  const { data: nativeBalance } = useBalance({ address });

  const [btcInput, setBtcInput] = useState("0.049");
  const [musdInput, setMusdInput] = useState("2000");
  const [formError, setFormError] = useState<string | null>(null);

  function estimateRatioPercent(): number | null {
    try {
      const btcWei = parseUnits(btcInput.trim(), 18);
      const musdWei = parseUnits(musdInput.trim(), 18);
      if (btcWei <= 0n || musdWei <= 0n || btcPrice <= 0n) return null;
      const ratio =
        (btcWei * btcPrice * 100n) / (1000000000000000000n * musdWei);
      return Number(ratio);
    } catch {
      return null;
    }
  }

  const estRatio = estimateRatioPercent();
  const walletBtc = nativeBalance?.value ?? 0n;

  function estimateCollateralWei(): bigint | null {
    try {
      return parseUnits(btcInput.trim(), 18);
    } catch {
      return null;
    }
  }

  const collateralWei = estimateCollateralWei();
  const exceedsBalance =
    collateralWei != null && nativeBalance != null && collateralWei > walletBtc;

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
          </div>          <Link className="btn btn-secondary" to="/dashboard">
            Dashboard
          </Link>
        </header>
        {notice ? <p className="notice">{notice}</p> : null}

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
                placeholder="0.049"
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
              on-chain for you. Minimum debt 2,000 MUSD, minimum 110%
              collateral ratio.
            </p>
            {estRatio != null ? (
              estRatio < 150 ? (
                <p className="error">
                  Est. collateral ratio {estRatio}% — too low, this transaction
                  will fail. Add BTC or lower MUSD.
                </p>
              ) : (
                <p className="success">Est. collateral ratio {estRatio}%</p>
              )
            ) : null}
            {exceedsBalance ? (
              <p className="error">
                Insufficient BTC — your wallet has{" "}
                {Number(formatUnits(walletBtc, 18)).toFixed(4)} BTC. Lower the
                collateral (and keep a little for gas).
              </p>
            ) : null}
            {formError ? <p className="error">{formError}</p> : null}
            {error ? <p className="error">{error}</p> : null}
            {isConfirmed ? (
              <p className="success">Trove opened — MUSD minted.</p>
            ) : null}
            <button
              type="submit"
              className="btn"
              disabled={isPending || troveLoading || exceedsBalance}
            >
              {isPending ? "Confirm in wallet…" : "Open trove"}
            </button>
          </form>
        )}
        {hasActiveTrove ? <ClosePositionSection /> : null}
      </div>
    </main>
  );
}
