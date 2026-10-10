import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../api/client";
import ActivityList from "../components/ActivityList";
import "../style/Activity.css";

function Activity() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api
      .get(`/workspaces/${workspaceId}/activity`)
      .then((res) => setItems(res.data.activity))
      .catch((err) => setError(err.response?.data?.error || "Failed to load activity"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="activity-loading">Loading activity...</div>;

  return (
    <div className="activity-page">
      <div className="activity-container">
        <div className="activity-header">
          <button className="activity-back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="activity-title">Activity</h1>
            <div className="activity-subtitle">Latest changes across all boards</div>
          </div>
        </div>

        <div className="activity-card">
          {error ? (
            <div className="activity-empty">{error}</div>
          ) : items.length === 0 ? (
            <div className="activity-empty">No activity yet.</div>
          ) : (
            <ActivityList items={items} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Activity;