import { Outlet } from "react-router-dom";
import Background from "./Background";
import BottomNav from "./BottomNav";

/** Layout wrapper: cinematic background + page content + bottom navigation. */
export default function AppShell() {
  return (
    <>
      <Background />
      <Outlet />
      <BottomNav />
    </>
  );
}
