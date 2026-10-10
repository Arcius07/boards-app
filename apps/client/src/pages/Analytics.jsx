import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import api from "../api/client";
import useAuthStore from "../store/authStore";
import "../style/Analytics.css";

const ANALYTICS_URL = "http://localhost:8000";

const AXIS = { stroke: "rgba(255,255,255,0.35)", fontSize: 12 };
const TOOLTIP = {
  contentStyle: {
    background: "#0b0e1a",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#fff",
  },
  cursor: { fill: "rgba(255,255,255,0.05)" },
};

function weekLabel(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

async function fetchAnalytics(path) {
  // This call goes to FastAPI, not Express, so the axios refresh interceptor
  // doesn't cover it. Hitting /auth/me first makes sure the access token is
  // fresh (the interceptor refreshes it if it expired), then we read it.
  await api.get("/auth/me");
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${ANALYTICS_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Request failed");
  }
  return res.json();
}

function Analytics() {
  const navigate = useNavigate();
  const params = useParams();

  const [workspaceId, setWorkspaceId] = useState(params.workspaceId || null);
  const [summary, setSummary] = useState(null);
  const [velocity, setVelocity] = useState([]);
  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The plain /analytics route has no workspace in the URL: fall back to the first one.
  useEffect(() => {
    if (workspaceId) return;
    api
      .get("/workspaces")
      .then((res) => setWorkspaceId(res.data.workspaces[0]?.id || null))
      .catch(() => setError("Failed to load workspaces"));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    setError("");
    const base = `/analytics/workspaces/${workspaceId}`;
    Promise.all([
      fetchAnalytics(`${base}/summary`),
      fetchAnalytics(`${base}/velocity`),
      fetchAnalytics(`${base}/cycle-time`),
    ])
      .then(([s, v, c]) => {
        setSummary(s);
        setVelocity(v.map((w) => ({ ...w, label: weekLabel(w.week) })));
        setCycle({
          ...c,
          by_week: c.by_week.map((w) => ({ ...w, label: weekLabel(w.week) })),
        });
      })
      .catch((err) => setError(err.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (error) {
    return (
      <div className="an-loading">
        {error}. Is the analytics service running on port 8000?
      </div>
    );
  }
  if (loading || !summary) return <div className="an-loading">Loading analytics...</div>;

  // Sum cards per list name across boards, in first-seen order.
  const perList = [];
  for (const item of summary.by_list) {
    const found = perList.find((x) => x.list === item.list);
    if (found) found.cards += item.cards;
    else perList.push({ list: item.list, cards: item.cards });
  }

  const doneCount = perList.find((x) => x.list === "Done")?.cards || 0;
  const hasVelocity = velocity.some((w) => w.completed > 0);
  const hasCycle = cycle.by_week.some((w) => w.avg_days !== null);

  return (
    <div className="an-page">
      <div className="an-container">
        <div className="an-header">
          <button className="an-back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="an-title">Analytics</h1>
            <div className="an-subtitle">How your team is doing, across all boards</div>
          </div>
        </div>

        <div className="an-stats">
          <div className="an-stat">
            <div className="an-stat-label">Total cards</div>
            <div className="an-stat-value">{summary.total_cards}</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-label">Completed</div>
            <div className="an-stat-value">{doneCount}</div>
          </div>
          <div className="an-stat">
            <div className="an-stat-label">Overdue</div>
            <div
              className={
                summary.overdue_cards > 0 ? "an-stat-value an-stat-danger" : "an-stat-value"
              }
            >
              {summary.overdue_cards}
            </div>
          </div>
        </div>

        <div className="an-grid">
          <div className="an-card">
            <div className="an-card-title">Cards per list</div>
            <div className="an-card-hint">Where the work is sitting right now</div>
            <div className="an-chart">
              <ResponsiveContainer>
                <BarChart data={perList}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="list" {...AXIS} />
                  <YAxis allowDecimals={false} {...AXIS} />
                  <Tooltip {...TOOLTIP} />
                  <Bar dataKey="cards" fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="an-card">
            <div className="an-card-title">Velocity</div>
            <div className="an-card-hint">Cards completed per week, last 8 weeks</div>
            {hasVelocity ? (
              <div className="an-chart">
                <ResponsiveContainer>
                  <BarChart data={velocity}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" {...AXIS} />
                    <YAxis allowDecimals={false} {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    <Bar dataKey="completed" fill="#34d399" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="an-empty">
                No completed cards yet. Move a card into the Done list to see it here.
              </div>
            )}
          </div>

          <div className="an-card an-card-wide">
            <div className="an-card-title">
              Cycle time
              {cycle.average_days !== null && ` · average ${cycle.average_days} days`}
            </div>
            <div className="an-card-hint">
              Average days from a card's creation to being done, by week completed
            </div>
            {hasCycle ? (
              <div className="an-chart">
                <ResponsiveContainer>
                  <LineChart data={cycle.by_week}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" {...AXIS} />
                    <YAxis {...AXIS} />
                    <Tooltip {...TOOLTIP} />
                    <Line
                      type="monotone"
                      dataKey="avg_days"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="an-empty">Complete a few cards to see how long they take.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;