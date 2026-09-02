import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Grid3x3, ArrowLeft, Plus, MessageSquare } from "lucide-react";
import api from "../api/client";
import "../style/BoardView.css";

function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingListName, setAddingListName] = useState("");
  const [showAddList, setShowAddList] = useState(false);
  const [addingCardListId, setAddingCardListId] = useState(null);
  const [addingCardTitle, setAddingCardTitle] = useState("");

  useEffect(() => {
    loadBoard();
  }, [boardId]);

  async function loadBoard() {
    setLoading(true);
    try {
      const res = await api.get(`/boards/${boardId}`);
      setBoard(res.data.board);
    } catch (err) {
      setError("Failed to load board");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddList(e) {
    e.preventDefault();
    if (!addingListName.trim()) return;
    try {
      const res = await api.post(`/boards/${boardId}/lists`, { name: addingListName });
      setBoard({ ...board, lists: [...board.lists, res.data.list] });
      setAddingListName("");
      setShowAddList(false);
    } catch (err) {
      setError("Failed to create list");
    }
  }

  async function handleAddCard(e, listId) {
    e.preventDefault();
    if (!addingCardTitle.trim()) return;
    try {
      const res = await api.post(`/lists/${listId}/cards`, { title: addingCardTitle });
      setBoard({
        ...board,
        lists: board.lists.map((list) =>
          list.id === listId ? { ...list, cards: [...list.cards, res.data.card] } : list
        ),
      });
      setAddingCardTitle("");
      setAddingCardListId(null);
    } catch (err) {
      setError("Failed to create card");
    }
  }

  if (loading) {
    return <div className="board-loading">Loading board...</div>;
  }

  if (error || !board) {
    return <div className="board-loading">{error || "Board not found"}</div>;
  }

  return (
    <div className="board-page">
      <nav className="board-nav">
        <button className="board-back-btn" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={18} />
        </button>
        <div className="board-logo">
          <div className="board-logo-icon">
            <Grid3x3 size={16} />
          </div>
          Boards
        </div>
        <h1 className="board-name">{board.name}</h1>
      </nav>

      <div className="board-lists-row">
        {board.lists.map((list) => (
          <div key={list.id} className="board-list">
            <div className="board-list-header">
              <span>{list.name}</span>
              <span className="board-list-count">{list.cards.length}</span>
            </div>

            <div className="board-list-cards">
              {list.cards.map((card) => (
                <div key={card.id} className="board-card">
                  <div className="board-card-title">{card.title}</div>
                  <div className="board-card-footer">
                    <MessageSquare size={12} /> 0
                  </div>
                </div>
              ))}
            </div>

            {addingCardListId === list.id ? (
              <form onSubmit={(e) => handleAddCard(e, list.id)} className="board-add-form">
                <input
                  type="text"
                  autoFocus
                  placeholder="Card title..."
                  value={addingCardTitle}
                  onChange={(e) => setAddingCardTitle(e.target.value)}
                  className="board-add-input"
                />
                <div className="board-add-actions">
                  <button type="submit" className="board-add-confirm">Add</button>
                  <button
                    type="button"
                    className="board-add-cancel"
                    onClick={() => {
                      setAddingCardListId(null);
                      setAddingCardTitle("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                className="board-add-card-btn"
                onClick={() => setAddingCardListId(list.id)}
              >
                <Plus size={14} /> Add card
              </button>
            )}
          </div>
        ))}

        <div className="board-list board-list-new">
          {showAddList ? (
            <form onSubmit={handleAddList} className="board-add-form">
              <input
                type="text"
                autoFocus
                placeholder="List name..."
                value={addingListName}
                onChange={(e) => setAddingListName(e.target.value)}
                className="board-add-input"
              />
              <div className="board-add-actions">
                <button type="submit" className="board-add-confirm">Add</button>
                <button
                  type="button"
                  className="board-add-cancel"
                  onClick={() => {
                    setShowAddList(false);
                    setAddingListName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button className="board-add-list-btn" onClick={() => setShowAddList(true)}>
              <Plus size={16} /> Add list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoardView;