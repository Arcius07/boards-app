import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Grid3x3, ArrowLeft, Plus, MessageSquare, GripVertical, Paperclip, FileText, X, Loader2, Trash2} from "lucide-react";
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

import { io } from "socket.io-client";
import useAuthStore from "../store/authStore";

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

function CardDetailModal({ card, onClose, onSave, onAddComment, onAddAttachment, onDeleteAttachment }) {
  
  const currentUser = useAuthStore((state) => state.user);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || "");
    }
  }, [card]);

  if (!card) return null;

  function handleTitleBlur() {
    setEditingTitle(false);
    if (title.trim() && title !== card.title) {
      onSave(card.id, { title: title.trim() });
    }
  }

  function handleDescriptionBlur() {
    setEditingDescription(false);
    if (description !== (card.description || "")) {
      onSave(card.id, { description });
    }
  }

  function handleCommentSubmit(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(card.id, commentText.trim());
    setCommentText("");
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      setUploadError("Only images and PDFs are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10MB");
      return;
    }

    setUploadError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const signRes = await api.post("/uploads/sign", { type: "attachment" });
      const { signature, timestamp, cloudName, apiKey, folder, allowedFormats } = signRes.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("signature", signature);
      formData.append("timestamp", timestamp);
      formData.append("api_key", apiKey);
      formData.append("folder", folder);
      formData.append("allowed_formats", allowedFormats);

      const resourceType = isPdf ? "raw" : "image";
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
      const cloudinaryData = await uploadWithProgress(uploadUrl, formData, setUploadProgress);

      await onAddAttachment(card.id, {
        url: cloudinaryData.secure_url,
        publicId: cloudinaryData.public_id,
        filename: file.name,
        fileType: isPdf ? "pdf" : "image",
      });
    } catch (err) {
      setUploadError("Failed to upload file");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  }

  function uploadWithProgress(url, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(formData);
    });
  }

  const comments = card.comments || [];
  const attachments = card.attachments || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {editingTitle ? (
            <input
              className="modal-title-input"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            />
          ) : (
            <h2 className="modal-title" onClick={() => setEditingTitle(true)}>
              {card.title}
            </h2>
          )}
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {editingDescription ? (
            <textarea
              className="modal-description-input"
              value={description}
              autoFocus
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
            />
          ) : (
            <p
              className={description ? "modal-description-text" : "modal-placeholder-text"}
              onClick={() => setEditingDescription(true)}
            >
              {description || "Click to add a description..."}
            </p>
          )}
        </div>

        <div className="modal-attachments-section">
          <div className="modal-attachments-heading-row">
            <h3 className="modal-attachments-heading">
              Attachments ({attachments.length})
            </h3>
            <button
              className="modal-attach-btn"
              onClick={handleAttachClick}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 size={13} className="modal-spinner" />
              ) : (
                <Paperclip size={13} />
              )}
              {uploading ? `${uploadProgress}%` : "Add file"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="modal-file-input"
              onChange={handleFileSelected}
            />
          </div>

          {uploadError && <div className="modal-upload-error">{uploadError}</div>}

          {attachments.length > 0 && (
            <div className="modal-attachments-list">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-attachment-item"
                >
                  {att.fileType === "image" ? (
                    <img src={att.url} alt={att.filename} className="modal-attachment-thumb" />
                  ) : (
                    <div className="modal-attachment-icon">
                      <FileText size={18} />
                    </div>
                  )}
                  <div className="modal-attachment-info">
                    <div className="modal-attachment-name">{att.filename}</div>
                    <div className="modal-attachment-uploader">by {att.user.name}</div>
                  </div>
                  {att.uploadedBy === currentUser?.id && (
                    <button
                      className="modal-attachment-delete"
                      title="Delete attachment"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.confirm(`Delete "${att.filename}"?`)) {
                          onDeleteAttachment(card.id, att.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="modal-comments-section">
          <h3 className="modal-comments-heading">Comments ({comments.length})</h3>

          <div className="modal-comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="modal-comment">
                <div className="modal-comment-author">{comment.user.name}</div>
                <div className="modal-comment-text">{comment.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="modal-comment-form">
            <input
              type="text"
              className="modal-comment-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" className="modal-comment-submit">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SortableCard({ card, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="board-card"
      {...attributes}
      {...listeners}
      onClick={() => onClick(card)}
    >
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
  const [selectedCard, setSelectedCard] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
  loadBoard();
}, [boardId]);

  useEffect(() => {
  const accessToken = useAuthStore.getState().accessToken;
  const socket = io("http://localhost:5000", {
    auth: { token: accessToken },
  });

  socket.on("connect", () => {
    socket.emit("join-board", boardId);
  });

  socket.on("card:moved", ({ card }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const listsWithoutCard = prevBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== card.id),
      }));
      const newLists = listsWithoutCard.map((list) => {
        if (list.id !== card.listId) return list;
        const newCards = [...list.cards, card].sort((a, b) => a.position - b.position);
        return { ...list, cards: newCards };
      });
      return { ...prevBoard, lists: newLists };
    });
  });

  socket.on("card:created", ({ card }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const alreadyExists = prevBoard.lists.some((list) =>
        list.cards.some((c) => c.id === card.id)
      );
      if (alreadyExists) return prevBoard;
      const newLists = prevBoard.lists.map((list) =>
        list.id === card.listId ? { ...list, cards: [...list.cards, card] } : list
      );
      return { ...prevBoard, lists: newLists };
    });
  });

  socket.on("card:updated", ({ card }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const newLists = prevBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) => (c.id === card.id ? { ...c, ...card } : c)),
      }));
      return { ...prevBoard, lists: newLists };
    });
  });

  socket.on("comment:created", ({ comment }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const newLists = prevBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) =>
          c.id === comment.cardId
            ? { ...c, comments: [...(c.comments || []), comment] }
            : c
        ),
      }));
      return { ...prevBoard, lists: newLists };
    });

    setSelectedCard((prevSelected) =>
      prevSelected && prevSelected.id === comment.cardId
        ? { ...prevSelected, comments: [...(prevSelected.comments || []), comment] }
        : prevSelected
    );
  });

  socket.on("attachment:created", ({ attachment }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const newLists = prevBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) =>
          c.id === attachment.cardId
            ? { ...c, attachments: [...(c.attachments || []), attachment] }
            : c
        ),
      }));
      return { ...prevBoard, lists: newLists };
    });

    setSelectedCard((prevSelected) =>
      prevSelected && prevSelected.id === attachment.cardId
        ? { ...prevSelected, attachments: [...(prevSelected.attachments || []), attachment] }
        : prevSelected
    );
  });

  socket.on("attachment:deleted", ({ attachmentId, cardId }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const newLists = prevBoard.lists.map((list) => ({
        ...list,
        cards: list.cards.map((c) =>
          c.id === cardId
            ? { ...c, attachments: (c.attachments || []).filter((a) => a.id !== attachmentId) }
            : c
        ),
      }));
      return { ...prevBoard, lists: newLists };
    });

      setSelectedCard((prevSelected) =>
        prevSelected && prevSelected.id === cardId
          ? {
              ...prevSelected,
              attachments: (prevSelected.attachments || []).filter((a) => a.id !== attachmentId),
            }
          : prevSelected
      );
    });


  socket.on("list:created", ({ list }) => {
    setBoard((prevBoard) => {
      if (!prevBoard) return prevBoard;
      const alreadyExists = prevBoard.lists.some((l) => l.id === list.id);
      if (alreadyExists) return prevBoard;
      return { ...prevBoard, lists: [...prevBoard.lists, list] };
    });
  });

  return () => {
    socket.disconnect();
  };
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
        boardId: board.id,
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

  async function handleSaveCard(cardId, updates) {
    try {
      const res = await api.patch(`/cards/${cardId}`, updates);
      setBoard((prevBoard) => ({
        ...prevBoard,
        lists: prevBoard.lists.map((list) => ({
          ...list,
          cards: list.cards.map((c) => (c.id === cardId ? res.data.card : c)),
        })),
      }));
      setSelectedCard(res.data.card);
    } catch (err) {
      setError("Failed to save card");
    }
  }

  async function handleAddComment(cardId, text) {
    try {
      await api.post(`/cards/${cardId}/comments`, { text });
    } catch (err) {
      setError("Failed to add comment");
    }
  }

  async function handleAddAttachment(cardId, attachmentData) {
    try {
      await api.post(`/cards/${cardId}/attachments`, attachmentData);
    } catch (err) {
      setError("Failed to save attachment");
    }
  }

  async function handleDeleteAttachment(cardId, attachmentId) {
    try {
      await api.delete(`/cards/${cardId}/attachments/${attachmentId}`);
    } catch (err) {
      setError("Failed to delete attachment");
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
                    <SortableCard key={card.id} card={card} onClick={setSelectedCard} />
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
      <CardDetailModal
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
        onSave={handleSaveCard}
        onAddComment={handleAddComment}
        onAddAttachment={handleAddAttachment}
        onDeleteAttachment={handleDeleteAttachment}
      />
    </div>
  );
}

export default BoardView;