import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Grid3x3, Search, Plus, Folder, Users, LogOut } from "lucide-react";
import api from "../api/client";
import useAuthStore from "../store/authStore";
import NotificationBell from "../components/NotificationBell";
import ActivityList from "../components/ActivityList";
import "../style/Dashboard.css";
import SearchBox from "../components/SearchBox";


const BOARD_COLORS = ["#4338ca", "#15803d", "#b91c1c", "#6d28d9", "#0f766e", "#a16207"];

const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=64&bold=true`;

function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!currentWorkspace) return;
    api
      .get(`/workspaces/${currentWorkspace.id}/activity`)
      .then((res) => setActivity(res.data.activity))
      .catch(() => setActivity([]));
  }, [currentWorkspace?.id]);

  async function loadWorkspaces() {
    setLoading(true);
    try {
      const res = await api.get("/workspaces");
      let ws = res.data.workspaces;

      if (ws.length === 0) {
        const created = await api.post("/workspaces", { name: "My Workspace" });
        ws = [{ ...created.data.workspace, role: "admin" }];
      }

      setWorkspaces(ws);
      setCurrentWorkspace(ws[0]);
      await loadBoards(ws[0].id);
    } catch (err) {
      setError("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }

  async function loadBoards(workspaceId) {
    try {
      const res = await api.get(`/workspaces/${workspaceId}/boards`);
      setBoards(res.data.boards);
    } catch (err) {
      setError("Failed to load boards");
    }
  }

  async function handleCreateBoard(e) {
    e.preventDefault();
    if (!newBoardName.trim() || !currentWorkspace) return;
    setCreating(true);
    try {
      const res = await api.post(`/workspaces/${currentWorkspace.id}/boards`, {
        name: newBoardName,
      });
      setBoards([...boards, res.data.board]);
      setNewBoardName("");
      setShowCreateModal(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create board");
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateWorkspace(e) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post("/workspaces", { name: newWorkspaceName.trim() });
      const ws = { ...res.data.workspace, role: "admin" };
      setWorkspaces((prev) => [...prev, ws]);
      setCurrentWorkspace(ws);
      setBoards([]);
      setNewWorkspaceName("");
      setShowCreateWorkspace(false);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create workspace");
    }
  }

  function handleSwitchWorkspace(e) {
    const ws = workspaces.find((w) => w.id === e.target.value);
    if (!ws) return;
    setCurrentWorkspace(ws);
    setError("");
    loadBoards(ws.id);
  }

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  function goToWorkspacePage(page) {
    if (currentWorkspace) navigate(`/workspace/${currentWorkspace.id}/${page}`);
  }

  if (loading) {
    return <div className="dashboard-loading">Loading your workspace...</div>;
  }

  return (
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            <Grid3x3 size={16} />
          </div>
          Boards
        </div>

        <div className="dashboard-workspace-switch">
          <div className="dashboard-workspace-avatar">
            {currentWorkspace?.name?.[0] || "W"}
          </div>
          <select
            className="dashboard-workspace-select"
            value={currentWorkspace?.id || ""}
            onChange={handleSwitchWorkspace}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <button
            className="dashboard-workspace-add"
            title="New workspace"
            onClick={() => setShowCreateWorkspace(true)}
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="dashboard-nav-tabs">
          <span className="dashboard-nav-tab dashboard-nav-tab-active">Boards</span>
          <span
            className="dashboard-nav-tab"
            style={{ cursor: "pointer" }}
            onClick={() => goToWorkspacePage("analytics")}
          >
            Analytics
          </span>
          <span
            className="dashboard-nav-tab"
            style={{ cursor: "pointer" }}
            onClick={() => goToWorkspacePage("settings")}
          >
            Members
          </span>
          <span
            className="dashboard-nav-tab"
            style={{ cursor: "pointer" }}
            onClick={() => goToWorkspacePage("activity")}
          >
            Activity
          </span>
        </div>

        <SearchBox workspaceId={currentWorkspace?.id} />

        <NotificationBell />

        <div className="dashboard-avatar-menu">
          <img
            className="dashboard-avatar-img"
            src={user?.avatarUrl || avatarUrl(user?.name || "User")}
            alt=""
          />
          <button className="dashboard-logout-btn" onClick={handleLogout} title="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-header-row">
          <div>
            <h1 className="dashboard-title">Your Boards</h1>
            <p className="dashboard-subtitle">All the boards you're part of.</p>
          </div>
          <button className="dashboard-new-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Board
          </button>
        </div>

        {error && <p className="dashboard-error">{error}</p>}

        <div className="dashboard-grid">
          {boards.map((board, i) => (
            <div
              key={board.id}
              className="dashboard-board-card"
              onClick={() => navigate(`/board/${board.id}`)}
            >
              <div
                className="dashboard-board-header"
                style={{ background: BOARD_COLORS[i % BOARD_COLORS.length] }}
              >
                <Folder size={16} />
                {board.name}
              </div>
              <div className="dashboard-board-body">
                <div className="dashboard-board-lines" />
                <div className="dashboard-board-lines dashboard-board-lines-short" />
                <div className="dashboard-board-footer">
                  <span className="dashboard-board-members">
                    <Users size={13} /> {board.lists?.length ? "3 lists" : "New board"}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="dashboard-board-card-new" onClick={() => setShowCreateModal(true)}>
            <div className="dashboard-board-new-icon">
              <Plus size={22} />
            </div>
            Create new board
          </div>
        </div>

        <div className="dashboard-activity-card">
          <div className="dashboard-activity-head">
            <h3 className="dashboard-activity-title">Recent Activity</h3>
            {activity.length > 0 && (
              <span
                className="dashboard-activity-link"
                onClick={() => goToWorkspacePage("activity")}
              >
                View all
              </span>
            )}
          </div>
          {activity.length === 0 ? (
            <p className="dashboard-activity-empty">
              Activity will show up here once your team starts working on boards.
            </p>
          ) : (
            <ActivityList items={activity.slice(0, 6)} />
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className="dashboard-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dashboard-modal-title">Create a new board</h2>
            <form onSubmit={handleCreateBoard} className="dashboard-modal-form">
              <input
                type="text"
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className="dashboard-modal-input"
                autoFocus
                required
              />
              <div className="dashboard-modal-actions">
                <button
                  type="button"
                  className="dashboard-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="dashboard-modal-submit">
                  {creating ? "Creating..." : "Create Board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateWorkspace && (
        <div className="dashboard-modal-overlay" onClick={() => setShowCreateWorkspace(false)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="dashboard-modal-title">Create a new workspace</h2>
            <form onSubmit={handleCreateWorkspace} className="dashboard-modal-form">
              <input
                type="text"
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="dashboard-modal-input"
                autoFocus
                required
              />
              <div className="dashboard-modal-actions">
                <button
                  type="button"
                  className="dashboard-modal-cancel"
                  onClick={() => setShowCreateWorkspace(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="dashboard-modal-submit">
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;