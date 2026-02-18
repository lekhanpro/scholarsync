import { BrowserRouter, Routes, Route } from "react-router-dom";
import GlassLayout from "./components/GlassLayout";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <GlassLayout>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </GlassLayout>
    </BrowserRouter>
  );
}