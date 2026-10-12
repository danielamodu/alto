import { Link, Navigate, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useTrove } from "../hooks/useTrove";
import { useStabilityPool } from "../hooks/useStabilityPool";
import { useBoost } from "../hooks/useBoost";

function StepRow({
  label,
  state,
}: {
  label: string;
  state: "active" | "done" | "todo";
}): React.JSX.Element {
  const marker = state === "done" ? "✓" : state === "active" ? "…" : "○";
  const cls =
    state === "done"
      ? "step-done"
      : state === "active"
        ? "step-active"
        : "step-muted";
  return (
    <p className={cls}>
      {marker} {label}
    </p>
  );
}

export default function Boost(): React.JSX.Element {
  const { isConnected } = useAccount();
  const location = useLocation();
  const notice =
    (location.state as { notice?: string } | null)?.notice ?? null;

  const {
    troveColl,
    troveDebt,
    currentICR,
    hasActiveTrove,
    isLoading: troveLoading,
  } = useTrove();
  const { spDeposit, isLoading: spLoading } = useStabilityPool();
  const {
    boostMultiplier,
    setBoostMultiplier,
    boostParams,
    previewLoading,
    isPending,
    currentStep,
    error,
    executeBoost,
  } = useBoost();

  if (!isConnected) {
    return (
      <main className="page">
        <div className="container">
          <div className="card">
            <h2>Connect your wallet</h2>
            <p className="muted">
              Connect on the home page to boost your yield.
            </p>
            <Link className="btn" to="/">
              Back to home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!troveLoading && !hasActiveTrove) {
    return (
      <Navigate
        to="/get-musd"
        replace
        state={{ notice: "You need an open trove to boost. Get MUSD first." }}
      />
    );
  }

  if (!spLoading && spDeposit === 0n) {
    return (
      <Navigate
        to="/earn"
        replace
        state={{ notice: "Deposit MUSD to the Earn pool first, then boost." }}
      />
    );
  }

  const isSafe = boostParams?.isSafe ?? false;
  const canBoost =
    boostParams != null && isSafe && !isPending && !previewLoading;
  const showSteps = isPending || currentStep === "done";

  function stepState(
    step: "borrowing" | "depositing",
  ): "active" | "done" | "todo" {
    const order = ["borrowing", "depositing", "done"] as const;
    const currentIdx = order.indexOf(
      currentStep === "idle" ? "borrowing" : currentStep,
    );
    const stepIdx = order.indexOf(step);
    if (currentStep === "done" || currentIdx > stepIdx) return "done";
    if (currentStep === step) return "active";
    return "todo";
  }

  return (
    <main className="page">
      <div className="container">
        <Link className="back-link" to="/dashboard">
          ← Dashboard
        </Link>
        <p className="eyebrow">Boost</p>
        <h2>Multiply your MUSD yield</h2>
        {notice ? <p className="notice">{notice}</p> : null}

        <div className="card">
          <p className="label">Current position</p>
          {troveLoading || spLoading ? (
            <p className="muted">Loading…</p>
          ) : (
            <p className="muted">
              {Number(formatUnits(troveColl, 18)).toFixed(4)} BTC locked ·{" "}
              {Number(formatUnits(troveDebt, 18)).toFixed(2)} MUSD debt · ICR{" "}
              {currentICR > 0n
                ? `${Number((currentICR * 100n) / 1000000000000000000n)}%`
                : "—"}
            </p>
          )}
        </div>

        <div className="card form">
          <label className="field">
            <span className="label">Boost level</span>
            <input
              type="range"
              className="slider"
              min={1}
              max={5}
              step={1}
              value={boostMultiplier}
              onChange={(e) => setBoostMultiplier(Number(e.target.value))}
            />
          </label>
          <p className="value">{boostMultiplier}x boost</p>

          <div className="card-flat">
            <p className="label">Impact preview</p>
            {previewLoading ? (
              <p className="muted">Computing…</p>
            ) : boostParams == null ? (
              <p className="muted">
                {boostMultiplier <= 1
                  ? "Move the slider above 1x to preview a boost."
                  : "Preview unavailable — check connection and retry."}
              </p>
            ) : (
              <>
                <p className="muted">
                  Additional MUSD to borrow:{" "}
                  {Number(formatUnits(boostParams.additionalDebt, 18)).toFixed(
                    2,
                  )}{" "}
                  MUSD
                </p>
                <p className="muted">
                  New safety level: {boostParams.newICRPercent}%
                </p>
                <div className="safety-bar">
                  <div
                    className={
                      boostParams.isSafe ? "safety-fill-safe" : "safety-fill-risk"
                    }
                    style={{
                      width: `${Math.min(100, boostParams.newICRPercent / 4)}%`,
                    }}
                  />
                </div>
                <p className="muted">
                  Est. yield multiplier: {boostMultiplier}x
                </p>
                {!boostParams.isSafe ? (
                  <p className="error">
                    This boost level is too risky. Reduce boost or add more
                    collateral.
                  </p>
                ) : null}
              </>
            )}
          </div>

          {showSteps ? (
            <div className="steps">
              <StepRow label="Borrowing MUSD…" state={stepState("borrowing")} />
              <StepRow
                label="Depositing to earn pool…"
                state={stepState("depositing")}
              />
            </div>
          ) : null}

          {currentStep === "done" ? (
            <>
              <p className="success">
                Boosted to {boostMultiplier}x! Your yield is now multiplied.
              </p>
              <Link className="btn" to="/dashboard">
                View position
              </Link>
            </>
          ) : (
            <>
              {error ? <p className="error">{error}</p> : null}
              <button
                type="button"
                className="btn"
                disabled={!canBoost}
                onClick={() => void executeBoost()}
              >
                {isPending ? "Boosting…" : `Boost to ${boostMultiplier}x`}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
