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
        <h1>Your Bitcoin, finally working.</h1>
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
      </div>
    </main>
  );
}
