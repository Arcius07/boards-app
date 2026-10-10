import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import api from "../api/client";
import "../style/Search.css";

function SearchBox({ workspaceId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Debounced search: wait 250ms after typing stops, ignore stale responses
  useEffect(() => {
    const q = query.trim();
    if (!workspaceId || q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get(`/workspaces/${workspaceId}/search`, { params: { q } })
        .then((res) => {
          if (!cancelled) setResults(res.data);
        })
        .catch(() => {
          if (!cancelled) setResults(null);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, workspaceId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function go(boardId) {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(`/board/${boardId}`);
  }

  const empty = results && results.boards.length === 0 && results.cards.length === 0;

  return (
    <div className="dashboard-search search-wrap" ref={wrapRef}>
      <Search size={14} />
      <input
        className="search-input"
        placeholder="Search boards and cards..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />

      {open && results && (
        <div className="search-dropdown">
          {empty && <div className="search-empty">No results for "{query.trim()}"</div>}

          {results.boards.length > 0 && (
            <>
              <div className="search-section">Boards</div>
              {results.boards.map((b) => (
                <button key={b.id} className="search-item" onClick={() => go(b.id)}>
                  <div className="search-item-main">{b.name}</div>
                </button>
              ))}
            </>
          )}

          {results.cards.length > 0 && (
            <>
              <div className="search-section">Cards</div>
              {results.cards.map((c) => (
                <button key={c.id} className="search-item" onClick={() => go(c.list.board.id)}>
                  <div className="search-item-main">{c.title}</div>
                  <div className="search-item-sub">
                    {c.list.board.name} · {c.list.name}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchBox;