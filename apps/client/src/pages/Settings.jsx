import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { getTheme, applyTheme } from "../utils/theme";
import "../style/Settings.css";

function Settings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getTheme());

  function choose(next) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div className="set-page">
      <div className="set-container">
        <div className="set-header">
          <button className="set-back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="set-title">Settings</h1>
            <div className="set-subtitle">Your personal preferences</div>
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-title">Appearance</div>
          <div className="set-theme-row">
            <button
              className={theme === "dark" ? "set-theme-option set-theme-option-active" : "set-theme-option"}
              onClick={() => choose("dark")}
            >
              <Moon size={16} /> Dark
            </button>
            <button
              className={theme === "light" ? "set-theme-option set-theme-option-active" : "set-theme-option"}
              onClick={() => choose("light")}
            >
              <Sun size={16} /> Light
            </button>
          </div>
        </div>

        <div className="set-card">
          <div className="set-card-title">Account</div>
          <div className="set-link-row">
            <span className="set-link-text">Change your name or profile photo</span>
            <button className="set-link-btn" onClick={() => navigate("/profile")}>
              Open profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;