import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function Landing(): React.JSX.Element {
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) {
      navigate("/dashboard", { replace: true });
    }
  }, [isConnected, navigate]);

  return (
    <main className="page">
      <div className="container hero">
        <p className="eyebrow">Alto on Mezo Testnet</p>
        <h1>
          Your Bitcoin,
          <br />
          finally working.
        </h1>
        <p className="subtext">
          Earn yield, borrow, and boost your MUSD — no DeFi knowledge needed.
        </p>
        <div className="pills">
          <span className="pill">Earn yield</span>
          <span className="pill">Borrow MUSD</span>
          <span className="pill">Boost returns</span>
        </div>
        <div className="connect-wrap">
          <ConnectButton />
        </div>
        <div className="how-it-works">
          <p className="label">How it works</p>
          <div className="how-grid">
            <div className="how-step">
              <span className="step-num">1</span>
              <h3>Deposit BTC</h3>
              <p className="muted">
                Lock your Bitcoin as collateral and mint MUSD
              </p>
            </div>
            <div className="how-step">
              <span className="step-num">2</span>
              <h3>Earn yield</h3>
              <p className="muted">
                Put your MUSD in the pool and start earning
              </p>
            </div>
            <div className="how-step">
              <span className="step-num">3</span>
              <h3>Boost returns</h3>
              <p className="muted">
                Multiply your yield up to 5x with one click
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
