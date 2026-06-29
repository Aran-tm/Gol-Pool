import { Navigate, Outlet } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";

/** Redirects to landing if no wallet is connected. */
export default function ProtectedRoute() {
  const { connected } = useWallet();

  if (!connected) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
