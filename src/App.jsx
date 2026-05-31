import { BrowserRouter, Routes, Route } from "react-router-dom";
import Worker from "./Worker";
import Operator from "./Operator";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/call/:floor" element={<Worker />} />
        <Route path="/operator" element={<Operator />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ fontSize: 16, color: "#555" }}>Invalid link. Please scan the QR code on your floor.</p>
    </div>
  );
}