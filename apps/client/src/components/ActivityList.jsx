import { useNavigate } from "react-router-dom";
import { timeAgo } from "../utils/timeAgo";
import "../style/ActivityList.css";

function ActivityList({ items }) {
  const navigate = useNavigate();

  return (
    <div className="activity-list">
      {items.map((a) => (
        <div
          key={a.id}
          className="activity-item"
          onClick={() => navigate(`/board/${a.board.id}`)}
        >
          {a.user.avatarUrl ? (
            <img src={a.user.avatarUrl} alt="" className="activity-avatar" />
          ) : (
            <div className="activity-avatar">{a.user.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="activity-body">
            <div className="activity-text">{a.actionText}</div>
            <div className="activity-meta">
              {a.board.name} · {timeAgo(a.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityList;