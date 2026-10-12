import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import GetMUSD from "./pages/GetMUSD";
import Earn from "./pages/Earn";

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/get-musd" element={<GetMUSD />} />
        <Route path="/earn" element={<Earn />} />
      </Routes>
    </BrowserRouter>
  );
}
