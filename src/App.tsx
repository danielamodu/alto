import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import GetMUSD from "./pages/GetMUSD";
import Earn from "./pages/Earn";
import Boost from "./pages/Boost";
import ErrorBoundary from "./components/ErrorBoundary";
import BottomNav from "./components/BottomNav";

export default function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/get-musd" element={<GetMUSD />} />
          <Route path="/earn" element={<Earn />} />
          <Route path="/boost" element={<Boost />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
