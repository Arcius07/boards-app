import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Zap, Grid3x3, Users, User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

import api from "../api/client";
import useAuthStore from "../store/authStore";


import "../style/Signup.css";

const avatarUrl = (name, bg) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=fff&size=64&bold=true`;

function Signup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getStrength(password) {
    if (password.length === 0) return { level: 0, label: "" };
    if (password.length < 6) return { level: 1, label: "Weak" };
    if (password.length < 10) return { level: 2, label: "Good" };
    return { level: 3, label: "Strong" };
  }
  const strength = getStrength(form.password);
  const strengthColors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  const strengthLabelColors = ["", "text-red-400", "text-yellow-400", "text-green-400"];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/signup", form);
      setAuth(res.data.user, res.data.accessToken);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      {/* Left marketing panel */}
      <div className="signup-left">
        <div className="signup-logo">
          <div className="signup-logo-icon">
            <Grid3x3 size={16} />
          </div>
          Boards
        </div>

        <div className="signup-live-row">
          <span className="signup-live-badge">
            <span className="signup-live-dot" /> LIVE
          </span>
          <div className="signup-avatar-stack">
            <img className="signup-avatar-img" src={avatarUrl("Jordan Dean", "6366f1")} alt="" />
            <img className="signup-avatar-img" src={avatarUrl("Alex Kim", "3b82f6")} alt="" />
            <img className="signup-avatar-img" src={avatarUrl("Mira Rao", "8b5cf6")} alt="" />
            <div className="signup-avatar-more">+3</div>
          </div>
          <span className="signup-online-text">3 teammates online</span>
        </div>

        <h1 className="signup-headline">
          Your team's work,
          <br />
          finally <span className="signup-headline-accent">in sync.</span>
        </h1>
        <p className="signup-subtext">
          Plan projects, move work forward, and see changes happen in real time.
        </p>

        <div className="signup-feature-list">
          <div className="signup-feature-row">
            <div className="signup-feature-icon">
              <Zap size={18} />
            </div>
            <div>
              <div className="signup-feature-title">Real-time collaboration</div>
              <div className="signup-feature-desc">Everyone sees changes instantly.</div>
            </div>
          </div>
          <div className="signup-feature-row">
            <div className="signup-feature-icon">
              <Grid3x3 size={18} />
            </div>
            <div>
              <div className="signup-feature-title">Unlimited boards</div>
              <div className="signup-feature-desc">Create as many projects as you need.</div>
            </div>
          </div>
          <div className="signup-feature-row">
            <div className="signup-feature-icon">
              <Users size={18} />
            </div>
            <div>
              <div className="signup-feature-title">Built for teams</div>
              <div className="signup-feature-desc">Keep everyone aligned from idea to done.</div>
            </div>
          </div>
        </div>

        {/* Floating card illustration */}
        <div className="signup-illustration">
          <div className="signup-illo-card signup-illo-card-1">
            <span className="signup-illo-dot" style={{ background: "#6366f1" }} />
            Landing page
          </div>
          <div className="signup-illo-card signup-illo-card-2">
            <span className="signup-illo-dot" style={{ background: "#3b82f6" }} />
            API Authentication
          </div>
          <div className="signup-illo-card signup-illo-card-3">
            <span className="signup-illo-dot" style={{ background: "#22c55e" }} />
            Login flow ✓
          </div>
          <div className="signup-illo-card signup-illo-card-sync">
            <span className="signup-illo-dot signup-illo-dot-pulse" />
            Real-time sync
          </div>
        </div>
      </div>

      {/* Right form card */}
      <div className="signup-card">
        <h2 className="signup-card-title">Create your account</h2>
        <p className="signup-card-subtitle">Start organizing your team's work today.</p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div>
            <label className="signup-label">Full name</label>
            <div className="signup-input-wrap">
              <User size={16} className="signup-input-icon" />
              <input
                type="text"
                name="name"
                placeholder="Your name"
                value={form.name}
                onChange={handleChange}
                className="signup-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="signup-label">Work email</label>
            <div className="signup-input-wrap">
              <Mail size={16} className="signup-input-icon" />
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange}
                className="signup-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="signup-label">Password</label>
            <div className="signup-input-wrap">
              <Lock size={16} className="signup-input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••••••"
                value={form.password}
                onChange={handleChange}
                className="signup-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="signup-input-toggle"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="signup-strength-row">
                <div className="signup-strength-bar">
                  {[1, 2, 3].map((seg) => (
                    <div
                      key={seg}
                      className={`signup-strength-seg ${
                        seg <= strength.level ? strengthColors[strength.level] : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <span className={`signup-strength-label ${strengthLabelColors[strength.level]}`}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {error && <p className="signup-error">{error}</p>}

          <button type="submit" disabled={loading} className="signup-submit">
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="signup-divider">
          <span className="signup-divider-line" />
          or continue with
          <span className="signup-divider-line" />
        </div>

        <div className="signup-oauth-row">
          <button className="signup-oauth-btn signup-oauth-google">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button className="signup-oauth-btn signup-oauth-github">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </button>
        </div>

        <p className="signup-footer">
          Already have an account?{" "}
          <Link to="/login" className="signup-footer-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;