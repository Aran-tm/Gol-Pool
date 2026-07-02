import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import { Spinner } from "./components/ui";

// Landing/Onboarding stay eager (first screen for every visitor). Everything
// behind the wallet gate loads on demand instead of bloating the initial bundle.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MatchCenter = lazy(() => import("./pages/MatchCenter"));
const MatchDetail = lazy(() => import("./pages/MatchDetail"));
const Pools = lazy(() => import("./pages/Pools"));
const PoolDetail = lazy(() => import("./pages/PoolDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const HowToPlay = lazy(() => import("./pages/HowToPlay"));
const Setup = lazy(() => import("./pages/Setup"));

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="h-6 w-6 text-white/40" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
    </Suspense>
  );
}
