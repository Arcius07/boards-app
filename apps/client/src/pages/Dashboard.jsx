import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Grid3x3, Search, Bell, ChevronDown, Plus, Folder, Users, LogOut } from "lucide-react";
import api from "../api/client";
import useAuthStore from "../store/authStore";
import "../style/Dashboard.css";

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
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkspaces();
  }, []);

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

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  if (loading) {
    return <div className="dashboard-loading">Loading your workspace...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* Top nav */}
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
          {currentWorkspace?.name || "Workspace"}
          <ChevronDown size={14} />
        </div>

        <div className="dashboard-nav-tabs">
          <span className="dashboard-nav-tab dashboard-nav-tab-active">Boards</span>
          <span className="dashboard-nav-tab">Analytics</span>
          <span className="dashboard-nav-tab">Members</span>
          <span className="dashboard-nav-tab">Activity</span>
        </div>

        <div className="dashboard-search">
          <Search size={14} />
          <span>Search...</span>
        </div>

        <button className="dashboard-icon-btn">
          <Bell size={18} />
        </button>

        <div className="dashboard-avatar-menu">
          <img className="dashboard-avatar-img" src={avatarUrl(user?.name || "User")} alt="" />
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
          <h3 className="dashboard-activity-title">Recent Activity</h3>
          <p className="dashboard-activity-empty">
            Activity will show up here once your team starts working on boards.
          </p>
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
    </div>
  );
}

export default Dashboard;