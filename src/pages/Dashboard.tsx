import { useAccount, useDisconnect } from "wagmi";
import { useBalances } from "../hooks/useBalances";

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Dashboard(): React.JSX.Element {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { btcBalance, musdBalance, isLoading, isError } = useBalances();

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
            <p className="muted">Coming soon</p>
          </div>
          <div className="card">
            <h3>Earn</h3>
            <p className="muted">Coming soon</p>
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
