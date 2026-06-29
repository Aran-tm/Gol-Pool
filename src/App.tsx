import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import MatchCenter from "./pages/MatchCenter";
import MatchDetail from "./pages/MatchDetail";
import Pools from "./pages/Pools";
import PoolDetail from "./pages/PoolDetail";
import Profile from "./pages/Profile";
import HowToPlay from "./pages/HowToPlay";
import Setup from "./pages/Setup";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* Public */}
        <Route index element={<Landing />} />
        <Route path="onboarding" element={<Onboarding />} />

        {/* Wallet required */}
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="matches" element={<MatchCenter />} />
          <Route path="matches/:fixtureId" element={<MatchDetail />} />
          <Route path="pools" element={<Pools />} />
          <Route path="pools/:poolId" element={<PoolDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/how-to-play" element={<HowToPlay />} />
          <Route path="setup" element={<Setup />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
