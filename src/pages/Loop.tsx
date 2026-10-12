import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useTrove } from "../hooks/useTrove";
import { useLoopAccount } from "../hooks/useLoopAccount";

const EXPLORER = "https://explorer.test.mezo.org";

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Loop(): React.JSX.Element {
  const { isConnected } = useAccount();
  const { btcPrice } = useTrove();
  const {
    proxy,
    isCreating,
    createError,
    createAccount,
    proxyColl,
    proxyDebt,
    proxyStatus,
    proxySpDeposit,
    positionLoading,
    openLoopedTrove,
    loopMore,
    isActing,
    actionError,
  } = useLoopAccount();

  const [btcInput, setBtcInput] = useState("0.049");
  const [musdInput, setMusdInput] = useState("2000");
  const [loopInput, setLoopInput] = useState("500");
  const [formError, setFormError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  if (!isConnected) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h2>Connect your wallet</h2>
            <p className="muted">
              Connect on the home page to loop with a smart account.
            </p>
            <Link className="btn" to="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  function estimateRatio(
    btcWei: bigint,
    musdWei: bigint,
  ): number | null {
    try {
      if (btcWei <= 0n || musdWei <= 0n || btcPrice <= 0n) return null;
      return Number((btcWei * btcPrice * 100n) / (1000000000000000000n * musdWei));
    } catch {
      return null;
    }
  }

  function parsePair(): { btcWei: bigint; musdWei: bigint } | null {
    try {
      const btcWei = parseUnits(btcInput.trim(), 18);
      const musdWei = parseUnits(musdInput.trim(), 18);
      if (btcWei <= 0n || musdWei <= 0n) return null;
      return { btcWei, musdWei };
    } catch {
      return null;
    }
  }

  async function handleOpen(): Promise<void> {
    setFormError(null);
    setDoneMsg(null);
    const pair = parsePair();
    if (pair == null) {
      setFormError("Enter valid numbers for BTC and MUSD");
      return;
    }
    try {
      await openLoopedTrove(pair.btcWei, pair.musdWei);
      setDoneMsg("Looped trove opened — borrow + earn in one position.");
    } catch {
      setDoneMsg(null);
    }
  }

  async function handleLoop(): Promise<void> {
    setFormError(null);
    setDoneMsg(null);
    const trimmed = loopInput.trim();
    if (trimmed === "") {
      setFormError("Enter a MUSD amount to loop");
      return;
    }
    let amount: bigint;
    try {
      amount = parseUnits(trimmed, 18);
    } catch {
      setFormError("Enter a valid MUSD amount");
      return;
    }
    if (amount <= 0n) {
      setFormError("Amount must be above 0");
      return;
    }
    try {
      await loopMore(amount);
      setDoneMsg(`Looped ${trimmed} MUSD into the earn pool.`);
      setLoopInput("");
    } catch {
      setDoneMsg(null);
    }
  }

  const pair = parsePair();
  const openRatio =
    pair != null ? estimateRatio(pair.btcWei, pair.musdWei) : null;
  const hasPosition = proxyStatus === 1;

  return (
    <main className="page">
      <div className="container">
        <Link className="back-link" to="/dashboard">
          ← Dashboard
        </Link>
        <p className="eyebrow">Loop</p>
        <h2>Borrow and earn in one click</h2>

        {proxy == null ? (
          <div className="card form">
            <h3>Your looping account</h3>
            <p className="muted">
              Alto deploys a personal smart account that owns your trove.
              Borrowing and depositing to the earn pool then happen in a
              single transaction.
            </p>
            {createError ? <p className="error">{createError}</p> : null}
            <button
              type="button"
              className="btn"
              disabled={isCreating}
              onClick={() => void createAccount()}
            >
              {isCreating ? "Creating…" : "Create smart account"}
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <p className="label">Smart account</p>
              <p className="value">
                <a
                  className="addr-link"
                  href={`${EXPLORER}/address/${proxy}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {truncateAddress(proxy)}
                </a>
              </p>
              {positionLoading ? (
                <p className="muted">Loading position…</p>
              ) : (
                <p className="muted">
                  {Number(formatUnits(proxyColl, 18)).toFixed(4)} BTC locked ·{" "}
                  {Number(formatUnits(proxyDebt, 18)).toFixed(2)} MUSD debt ·{" "}
                  {Number(formatUnits(proxySpDeposit, 18)).toFixed(2)} MUSD
                  earning
                </p>
              )}
            </div>

            {!hasPosition ? (
              <div className="card form">
                <h3>Open a looped trove</h3>
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
                  <span className="label">MUSD to borrow + deposit</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="2000"
                    value={musdInput}
                    onChange={(e) => setMusdInput(e.target.value)}
                  />
                </label>
                {openRatio != null ? (
                  openRatio < 150 ? (
                    <p className="error">
                      Est. ratio {openRatio}% — too low, add BTC or lower MUSD.
                    </p>
                  ) : (
                    <p className="success">Est. ratio {openRatio}%</p>
                  )
                ) : null}
                {formError ? <p className="error">{formError}</p> : null}
                {actionError ? <p className="error">{actionError}</p> : null}
                {doneMsg ? <p className="success">{doneMsg}</p> : null}
                <button
                  type="button"
                  className="btn"
                  disabled={
                    isActing || pair == null || (openRatio ?? 0) < 150
                  }
                  onClick={() => void handleOpen()}
                >
                  {isActing ? "Confirm in wallet…" : "Open looped trove"}
                </button>
              </div>
            ) : (
              <div className="card form">
                <h3>Loop more</h3>
                <p className="muted">
                  Borrow more MUSD against this position and deposit it to
                  the earn pool — one transaction.
                </p>
                <label className="field">
                  <span className="label">MUSD to loop</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    placeholder="500"
                    value={loopInput}
                    onChange={(e) => setLoopInput(e.target.value)}
                  />
                </label>
                {formError ? <p className="error">{formError}</p> : null}
                {actionError ? <p className="error">{actionError}</p> : null}
                {doneMsg ? <p className="success">{doneMsg}</p> : null}
                <button
                  type="button"
                  className="btn"
                  disabled={isActing}
                  onClick={() => void handleLoop()}
                >
                  {isActing ? "Confirm in wallet…" : "Loop"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
