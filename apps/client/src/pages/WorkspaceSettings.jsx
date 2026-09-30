import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, UserPlus, LogOut } from "lucide-react";
import api from "../api/client";
import useAuthStore from "../store/authStore";
import "../style/WorkspaceSettings.css";

function errorText(err, fallback) {
  return err.response?.data?.error || fallback;
}

function WorkspaceSettings() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [ownerId, setOwnerId] = useState(null);
  const [myRole, setMyRole] = useState("member");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [error, setError] = useState("");

  const isAdmin = myRole === "admin";

  useEffect(() => {
    loadAll();
  }, [workspaceId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [wsRes, memRes] = await Promise.all([
        api.get("/workspaces"),
        api.get(`/workspaces/${workspaceId}/members`),
      ]);
      const ws = wsRes.data.workspaces.find((w) => w.id === workspaceId);
      setWorkspace(ws || null);
      setName(ws?.name || "");
      setMembers(memRes.data.members);
      setOwnerId(memRes.data.ownerId);
      setMyRole(memRes.data.myRole);
    } catch (err) {
      setError(errorText(err, "Failed to load workspace"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === workspace.name) return;
    setError("");
    try {
      const res = await api.patch(`/workspaces/${workspaceId}`, { name: name.trim() });
      setWorkspace({ ...workspace, name: res.data.workspace.name });
    } catch (err) {
      setError(errorText(err, "Failed to rename workspace"));
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setError("");
    try {
      const res = await api.post(`/workspaces/${workspaceId}/members`, {
        email: newEmail.trim(),
        role: newRole,
      });
      setMembers((prev) => [...prev, res.data.member]);
      setNewEmail("");
      setNewRole("member");
    } catch (err) {
      setError(errorText(err, "Failed to add member"));
    }
  }

  async function handleChangeRole(userId, role) {
    setError("");
    try {
      const res = await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role });
      setMembers((prev) => prev.map((m) => (m.userId === userId ? res.data.member : m)));
    } catch (err) {
      setError(errorText(err, "Failed to change role"));
    }
  }

  async function handleRemove(member) {
    if (!window.confirm(`Remove ${member.user.name} from this workspace?`)) return;
    setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${member.userId}`);
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
    } catch (err) {
      setError(errorText(err, "Failed to remove member"));
    }
  }

  async function handleLeave() {
    if (!window.confirm("Leave this workspace?")) return;
    setError("");
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${currentUser.id}`);
      navigate("/dashboard");
    } catch (err) {
      setError(errorText(err, "Failed to leave workspace"));
    }
  }

  if (loading) return <div className="ws-loading">Loading workspace...</div>;
  if (!workspace) return <div className="ws-loading">{error || "Workspace not found"}</div>;

  return (
    <div className="ws-page">
      <div className="ws-container">
        <div className="ws-header">
          <button className="ws-back-btn" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="ws-title">{workspace.name}</h1>
            <div className="ws-subtitle">
              Workspace settings · you are {isAdmin ? "an admin" : "a member"}
            </div>
          </div>
        </div>

        <div className="ws-card">
          <div className="ws-card-title">General</div>
          <form onSubmit={handleRename} className="ws-row-form">
            <input
              className="ws-input"
              value={name}
              disabled={!isAdmin}
              onChange={(e) => setName(e.target.value)}
            />
            {isAdmin && (
              <button type="submit" className="ws-btn-primary">Rename</button>
            )}
          </form>
        </div>

        <div className="ws-card">
          <div className="ws-card-title">Members ({members.length})</div>

          {isAdmin && (
            <form onSubmit={handleAddMember} className="ws-row-form" style={{ marginBottom: 16 }}>
              <input
                type="email"
                className="ws-input"
                placeholder="Add by email..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <select
                className="ws-select"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="ws-btn-primary">
                <UserPlus size={15} /> Add
              </button>
            </form>
          )}

          <div className="ws-member-list">
            {members.map((m) => {
              const isOwner = m.userId === ownerId;
              const isMe = m.userId === currentUser?.id;
              return (
                <div key={m.id} className="ws-member">
                  {m.user.avatarUrl ? (
                    <img src={m.user.avatarUrl} alt="" className="ws-avatar" />
                  ) : (
                    <div className="ws-avatar">{m.user.name.charAt(0).toUpperCase()}</div>
                  )}

                  <div className="ws-member-info">
                    <div className="ws-member-name">
                      {m.user.name}
                      {isMe && <span className="ws-member-email">(you)</span>}
                      {isOwner && <span className="ws-badge-owner">OWNER</span>}
                    </div>
                    <div className="ws-member-email">{m.user.email}</div>
                  </div>

                  {isAdmin && !isOwner ? (
                    <select
                      className="ws-select"
                      value={m.role}
                      onChange={(e) => handleChangeRole(m.userId, e.target.value)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className="ws-badge-role">{m.role}</span>
                  )}

                  {isAdmin && !isOwner && !isMe && (
                    <button
                      className="ws-remove-btn"
                      title="Remove member"
                      onClick={() => handleRemove(m)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {error && <div className="ws-error">{error}</div>}
        </div>

        {currentUser?.id !== ownerId && (
          <div className="ws-card">
            <div className="ws-card-title">Danger zone</div>
            <button className="ws-btn-danger" onClick={handleLeave}>
              <LogOut size={15} /> Leave workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceSettings;