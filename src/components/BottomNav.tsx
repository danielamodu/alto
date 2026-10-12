import { Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";

function truncateAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function HouseIcon({ active }: { active: boolean }): React.JSX.Element {
  const color = active ? "#F5C842" : "#6B7A99";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5V21H14v-6h-4v6H3V10.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendIcon({ active }: { active: boolean }): React.JSX.Element {
  const color = active ? "#F5C842" : "#6B7A99";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 17l6-6 4 4 8-8M15 7h6v6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon({ active }: { active: boolean }): React.JSX.Element {
  const color = active ? "#F5C842" : "#6B7A99";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon(): React.JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="#6B7A99" strokeWidth="1.8" />
      <path
        d="M4.5 20c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5"
        stroke="#6B7A99"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function BottomNav(): React.JSX.Element | null {
  const { address, isConnected } = useAccount();
  const location = useLocation();

  if (!isConnected || address == null) return null;

  const path = location.pathname;

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <Link
        to="/dashboard"
        className={path === "/dashboard" ? "tab tab-active" : "tab"}
      >
        <HouseIcon active={path === "/dashboard"} />
        <span>Home</span>
      </Link>
      <Link to="/earn" className={path === "/earn" ? "tab tab-active" : "tab"}>
        <TrendIcon active={path === "/earn"} />
        <span>Earn</span>
      </Link>
      <Link
        to="/boost"
        className={path === "/boost" ? "tab tab-active" : "tab"}
      >
        <BoltIcon active={path === "/boost"} />
        <span>Boost</span>
      </Link>
      <span className="tab">
        <PersonIcon />
        <span>{truncateAddress(address)}</span>
      </span>
    </nav>
  );
}
