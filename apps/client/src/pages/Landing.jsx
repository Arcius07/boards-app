import { Link } from "react-router-dom";
import {
  Grid3x3,
  ArrowRight,
  Zap,
  GripVertical,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Users,
} from "lucide-react";
import "../style/Landing.css";

const features = [
  {
    icon: Zap,
    title: "Real-time sync",
    text: "Every move, comment and upload appears on your teammates' screens instantly, powered by WebSockets.",
  },
  {
    icon: GripVertical,
    title: "Smooth drag & drop",
    text: "Reorder cards and move them across lists. Positions are stored fractionally, so a move touches one row.",
  },
  {
    icon: MessageSquare,
    title: "Live comments",
    text: "Discuss work right on the card. New comments show up for everyone viewing it, with no refresh.",
  },
  {
    icon: Paperclip,
    title: "File attachments",
    text: "Attach images and PDFs straight from your browser to cloud storage, with progress and safe deletion.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    text: "Short-lived access tokens, httpOnly refresh cookies, hashed passwords and server-side permission checks.",
  },
  {
    icon: Users,
    title: "Workspaces & roles",
    text: "Organise boards into workspaces and control who can view, edit or administer them.",
  },
];

const previewCols = [
  { name: "To do", cards: ["Design landing page", "Set up CI pipeline"] },
  { name: "In progress", cards: ["Write API docs"], active: "Ship real-time sync" },
  { name: "Done", cards: ["Auth & refresh tokens", "File uploads"] },
];

const steps = [
  { title: "Create a workspace", text: "Start a space for your team or project in seconds." },
  { title: "Build your board", text: "Add lists and cards, then drag them into place." },
  { title: "Collaborate live", text: "Comment, attach files and watch changes appear instantly." },
];

function Landing() {
  return (
    <div className="landing-page">
      <div className="landing-glow-a" />
      <div className="landing-glow-b" />

      <nav className="landing-nav">
        <div className="landing-logo">
          <div className="landing-logo-icon">
            <Grid3x3 size={16} />
          </div>
          Boards
        </div>
        <div className="landing-nav-actions">
          <a href="#features" className="landing-nav-link">Features</a>
          <Link to="/login" className="landing-nav-link">Log in</Link>
          <Link to="/signup" className="landing-btn-primary">Get started</Link>
        </div>
      </nav>

      <header className="landing-hero">
        <div className="landing-badge">
          <span className="landing-badge-dot" />
          Real-time collaboration, built in
        </div>
        <h1 className="landing-title">
          Plan together, <br />
          <span className="landing-title-gradient">in real time.</span>
        </h1>
        <p className="landing-subtitle">
          Boards is a fast, collaborative kanban workspace. Organise work into lists and
          cards, and watch your whole team's changes appear the moment they happen.
        </p>
        <div className="landing-cta-row">
          <Link to="/signup" className="landing-btn-primary">
            Start for free <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="landing-btn-ghost">Log in</Link>
        </div>
      </header>

      <div className="landing-preview-wrap">
        <div className="landing-preview">
          <div className="landing-live-chip">
            <span className="landing-badge-dot" /> 2 people viewing
          </div>
          <div className="landing-preview-bar">
            <span className="landing-preview-dot" />
            <span className="landing-preview-dot" />
            <span className="landing-preview-dot" />
            <span className="landing-preview-title">Product launch</span>
          </div>
          <div className="landing-preview-cols">
            {previewCols.map((col) => (
              <div key={col.name} className="landing-preview-col">
                <div className="landing-preview-col-title">
                  <span>{col.name}</span>
                  <span>{col.cards.length + (col.active ? 1 : 0)}</span>
                </div>
                {col.active && (
                  <div className="landing-preview-card-active">
                    {col.active}
                    <div className="landing-preview-card-meta">
                      <MessageSquare size={11} /> 3
                      <Paperclip size={11} /> 1
                    </div>
                  </div>
                )}
                {col.cards.map((c) => (
                  <div key={c} className="landing-preview-card">{c}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="features" className="landing-section">
        <div className="landing-section-eyebrow">Features</div>
        <h2 className="landing-section-title">Everything a team needs to stay in sync</h2>
        <p className="landing-section-sub">
          Simple on the surface, with serious engineering underneath.
        </p>
        <div className="landing-features-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="landing-feature-card">
              <div className="landing-feature-icon">
                <Icon size={20} />
              </div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-text">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-eyebrow">How it works</div>
        <h2 className="landing-section-title">Up and running in three steps</h2>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <div key={s.title} className="landing-step">
              <div className="landing-step-num">{i + 1}</div>
              <h3 className="landing-step-title">{s.title}</h3>
              <p className="landing-step-text">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-final">
        <div className="landing-final-card">
          <h2 className="landing-final-title">Ready to organise your next project?</h2>
          <p className="landing-final-text">Create a free account and build your first board in a minute.</p>
          <div className="landing-cta-row">
            <Link to="/signup" className="landing-btn-primary">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2026 Boards. Built by Sarthak Thakur.</span>
        <a
          href="https://github.com/Arcius07"
          target="_blank"
          rel="noopener noreferrer"
          className="landing-footer-link"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}

export default Landing;