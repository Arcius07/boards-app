import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate  } from "react-router-dom";
import {
  Menu,
  X,
  LayoutGrid,
  UserPlus,
  LogIn,
  Grid3x3,
  BarChart3,
  Settings as SettingsIcon,
  User,
  LogOut,
} from "lucide-react";
import Landing from "./pages/Landing";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BoardView from "./pages/BoardView";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";

import { useEffect, useState } from "react";
import api from "./api/client";
import useAuthStore from "./store/authStore";

import RequireAuth from "./components/RequireAuth";
import "./App.css";

function DevSidebar() {
  const [open, setOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const location = useLocation();

  const hiddenPaths = ["/login", "/signup"];
  if (hiddenPaths.includes(location.pathname)) {
    return null;
  }

  function handleLogout() {
    clearAuth();
    setOpen(false);
  }

  return (
    <>
      <button className="dev-edge-tab" onClick={() => setOpen(true)}>
        <Menu size={14} />
      </button>

      {open && (
        <div className="dev-sidebar-overlay" onClick={() => setOpen(false)}>
          <div className="dev-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="dev-sidebar-header">
              <span className="dev-nav-badge">DEV NAV</span>
              <button className="dev-sidebar-close" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="dev-sidebar-links">
              {!user ? (
                <>
                  <NavLink to="/" end className="dev-nav-link" onClick={() => setOpen(false)}>
                    <LayoutGrid size={15} /> Landing
                  </NavLink>
                  <NavLink to="/signup" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <UserPlus size={15} /> Signup
                  </NavLink>
                  <NavLink to="/login" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <LogIn size={15} /> Login
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/dashboard" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <Grid3x3 size={15} /> Dashboard
                  </NavLink>
                  <NavLink to="/analytics" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <BarChart3 size={15} /> Analytics
                  </NavLink>
                  <NavLink to="/settings" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <SettingsIcon size={15} /> Settings
                  </NavLink>
                  <NavLink to="/profile" className="dev-nav-link" onClick={() => setOpen(false)}>
                    <User size={15} /> Profile
                  </NavLink>
                  <button className="dev-nav-link dev-nav-logout" onClick={handleLogout}>
                    <LogOut size={15} /> Log out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function App() {

  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (accessToken) {
      api
        .get("/auth/me")
        .then((res) => setAuth(res.data.user, accessToken))
        .catch(() => useAuthStore.getState().clearAuth())
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  if (checkingAuth) {
    return <div className="text-white p-8">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <DevSidebar />

      <Routes>
        <Route
          path="/"
          element={accessToken ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/board/:boardId" element={<RequireAuth><BoardView /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;