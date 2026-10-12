import { Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { useBalances } from "../hooks/useBalances";
import { useStabilityPool } from "../hooks/useStabilityPool";
import { useTrove } from "../hooks/useTrove";

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Dashboard(): React.JSX.Element {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { btcBalance, musdBalance, musdBalanceRaw, isLoading, isError } =
    useBalances();
  const { spDeposit, btcGain, isLoading: spLoading } = useStabilityPool();
  const { hasActiveTrove, isLoading: troveLoading } = useTrove();
  const boostReady = hasActiveTrove && spDeposit > 0n;
  const loaded = !isLoading && !spLoading && !troveLoading;
  const isNewUser =
    loaded && !hasActiveTrove && spDeposit === 0n && musdBalanceRaw === 0n;

  if (!isConnected || !address) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h2>Wallet not connected</h2>
            <p className="muted">Go back and connect to view your dashboard.</p>
            <a className="btn" href="/">
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <header className="dash-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2 className="address">{truncateAddress(address)}</h2>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </header>

        <section className="balance-grid">
          <div className="card">
            <p className="label">BTC balance</p>
            {isLoading ? (
              <p className="value muted">Loading…</p>
            ) : isError ? (
              <p className="value error">Failed to load</p>
            ) : (
              <p className="value">{btcBalance} BTC</p>
            )}
          </div>
          <div className="card">
            <p className="label">MUSD balance</p>
            {isLoading ? (
              <p className="value muted">Loading…</p>
            ) : isError ? (
              <p className="value error">Failed to load</p>
            ) : (
              <p className="value">{musdBalance} MUSD</p>
            )}
          </div>
        </section>

        {isNewUser ? (
          <div className="card">
            <h3>Start here</h3>
            <p className="muted">
              Deposit BTC to mint MUSD, then put it to work.
            </p>
            <Link className="btn" to="/get-musd">
              Get MUSD →
            </Link>
          </div>
        ) : (
          <section className="action-grid">
            <div className="card">
              <h3>Get MUSD</h3>
              <p className="muted">Deposit BTC, mint MUSD.</p>
              <Link className="btn" to="/get-musd">
                Open
              </Link>
            </div>
          <div className="card">
            <h3>
              Earn{" "}
              {spDeposit > 0n ? <span className="badge">Earning</span> : null}
            </h3>
            {spLoading ? (
              <p className="muted">Loading…</p>
            ) : spDeposit > 0n ? (
              <>
                <p className="value">
                  {Number(formatUnits(spDeposit, 18)).toFixed(2)} MUSD
                </p>
                <p className="muted">
                  +{Number(formatUnits(btcGain, 18)).toFixed(4)} BTC earned
                </p>
                <Link className="btn" to="/earn">
                  Manage
                </Link>
              </>
            ) : (
              <>
                <p className="muted">Start earning yield.</p>
                <Link className="btn" to="/earn">
                  Start earning yield
                </Link>
              </>
            )}
          </div>
          <div className="card">
            <h3>Boost</h3>
            {boostReady ? (
              <>
                <p className="muted">Ready to boost — up to 5x.</p>
                <Link className="btn" to="/boost">
                  Boost
                </Link>
              </>
            ) : (
              <p className="muted boost-greyed">Boost coming after you earn</p>
            )}
          </div>
          <div className="card">
            <h3>Loop</h3>
            <p className="muted">Borrow + earn in one click.</p>
            <Link className="btn" to="/loop">
              Open
            </Link>
          </div>
        </section>
        )}
      </div>
    </main>
  );
}
