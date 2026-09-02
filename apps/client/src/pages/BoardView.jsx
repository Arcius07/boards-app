import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Grid3x3, ArrowLeft, Plus, MessageSquare, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import api from "../api/client";
import "../style/BoardView.css";

function DroppableList({ listId, children }) {
  const { setNodeRef } = useDroppable({ id: listId, data: { type: "list" } });
  return (
    <div ref={setNodeRef} className="board-list-cards">
      {children}
    </div>
  );
}

function SortableCard({ card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="board-card" {...attributes} {...listeners}>
      <div className="board-card-title">{card.title}</div>
      <div className="board-card-footer">
        <MessageSquare size={12} /> 0
      </div>
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  function findListByCardId(cardId) {
    return board.lists.find((list) => list.cards.some((c) => c.id === cardId));
  }

  function findListById(listId) {
    return board.lists.find((list) => list.id === listId);
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id;
    const sourceList = findListByCardId(activeCardId);
    if (!sourceList) return;

    const overIsCard = over.data.current?.type === "card";
    const destListId = overIsCard ? findListByCardId(over.id)?.id : over.id;
    if (!destListId) return;

    const destList = findListById(destListId);
    const sourceIndex = sourceList.cards.findIndex((c) => c.id === activeCardId);
    const draggedCard = sourceList.cards[sourceIndex];

    let newDestCards;
    let destIndex;

    if (sourceList.id === destListId) {
      // Reordering within the same list — arrayMove handles the index math correctly
      const overIndex = overIsCard
        ? destList.cards.findIndex((c) => c.id === over.id)
        : destList.cards.length - 1;
      newDestCards = arrayMove(destList.cards, sourceIndex, overIndex);
      destIndex = newDestCards.findIndex((c) => c.id === activeCardId);
    } else {
      // Moving to a different list
      const destCards = destList.cards.filter((c) => c.id !== activeCardId);
      destIndex = overIsCard ? destCards.findIndex((c) => c.id === over.id) : destCards.length;
      if (destIndex === -1) destIndex = destCards.length;
      newDestCards = [...destCards];
      newDestCards.splice(destIndex, 0, { ...draggedCard, listId: destListId });
    }

    const prevCard = newDestCards[destIndex - 1];
    const nextCard = newDestCards[destIndex + 1];
    const newPosition = getNewPosition(
      prevCard ? prevCard.position : null,
      nextCard ? nextCard.position : null
    );

    const updatedDestCards = newDestCards.map((c) =>
      c.id === activeCardId ? { ...c, listId: destListId, position: newPosition } : c
    );

    const newLists = board.lists.map((list) => {
      if (list.id === sourceList.id && list.id === destListId) {
        return { ...list, cards: updatedDestCards };
      }
      if (list.id === sourceList.id) {
        return { ...list, cards: sourceList.cards.filter((c) => c.id !== activeCardId) };
      }
      if (list.id === destListId) {
        return { ...list, cards: updatedDestCards };
      }
      return list;
    });

    setBoard({ ...board, lists: newLists });

    try {
      await api.patch(`/cards/${activeCardId}`, {
        listId: destListId,
        position: newPosition,
      });
    } catch (err) {
      setError("Failed to move card");
      loadBoard();
    }
  }

  function getNewPosition(prevPosition, nextPosition) {
    if (prevPosition == null && nextPosition == null) return 1;
    if (prevPosition == null) return nextPosition / 2;
    if (nextPosition == null) return prevPosition + 1;
    return (prevPosition + nextPosition) / 2;
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

  if (error && !board) {
    return <div className="board-loading">{error}</div>;
  }

  if (!board) {
    return <div className="board-loading">Board not found</div>;
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

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="board-lists-row">
          {board.lists.map((list) => (
            <div key={list.id} className="board-list" data-list-id={list.id} id={list.id}>
              <div className="board-list-header">
                <span>{list.name}</span>
                <span className="board-list-count">{list.cards.length}</span>
              </div>

              <SortableContext
                items={list.cards.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableList listId={list.id}>
                  {list.cards.map((card) => (
                    <SortableCard key={card.id} card={card} />
                  ))}
                </DroppableList>
              </SortableContext>

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
      </DndContext>
    </div>
  );
}

export default BoardView;