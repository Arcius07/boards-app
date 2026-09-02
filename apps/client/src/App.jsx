import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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
      <nav className="p-4 bg-gray-100 flex gap-4 text-sm">
        <Link to="/">Landing</Link>
        <Link to="/signup">Signup</Link>
        <Link to="/login">Login</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/analytics">Analytics</Link>
        <Link to="/settings">Settings</Link>
        <Link to="/profile">Profile</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Landing />} />
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