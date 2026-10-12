import { Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { formatUnits } from "viem";
import { useBalances } from "../hooks/useBalances";
import { useStabilityPool } from "../hooks/useStabilityPool";

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Dashboard(): React.JSX.Element {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { btcBalance, musdBalance, isLoading, isError } = useBalances();
  const { spDeposit, isLoading: spLoading } = useStabilityPool();

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
            <p className="muted">Coming soon</p>
          </div>
        </section>
      </div>
    </main>
  );
}
