import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import GetMUSD from "./pages/GetMUSD";
import Earn from "./pages/Earn";
import Boost from "./pages/Boost";
import Loop from "./pages/Loop";
import ErrorBoundary from "./components/ErrorBoundary";
import BottomNav from "./components/BottomNav";

export default function App(): React.JSX.Element {
  // BASE_URL is "/" locally and "/alto/" on GitHub Pages.
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/get-musd" element={<GetMUSD />} />
        <Route path="/earn" element={<Earn />} />
        <Route path="/boost" element={<Boost />} />
        <Route path="/loop" element={<Loop />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
