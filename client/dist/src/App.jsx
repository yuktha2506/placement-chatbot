import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import {
  Bot,
  Check,
  Download,
  Edit3,
  LogOut,
  Menu,
  Moon,
  Plus,
  Send,
  Sun,
  Trash2,
  User,
  X
} from "lucide-react";
import { api, clearAuth, getStoredUser, getToken, setAuth } from "./api";

const suggestions = [
  "What is a service-based company?",
  "Difference between product and service companies",
  "Top companies hiring freshers",
  "How to prepare for placements in 3 months?",
  "Important DSA topics for interviews",
  "Resume tips for freshers",
  "Common HR interview questions"
];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("placement_theme") || "light");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const bottomRef = useRef(null);

  const isAuthenticated = Boolean(user && getToken());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("placement_theme", theme);
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshSessions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId]
  );

  async function refreshSessions() {
    try {
      const list = await api.listSessions();
      setSessions(list);
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }

      console.error(error);
      setSessions([]);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");

    try {
      const payload = authMode === "register" ? authForm : { email: authForm.email, password: authForm.password };
      const result = authMode === "register" ? await api.register(payload) : await api.login(payload);
      setAuth(result);
      setUser(result.user);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  function logout() {
    clearAuth();
    setUser(null);
    setSessions([]);
    setMessages([]);
    setActiveSessionId(null);
  }

  async function createNewChat() {
    const session = await api.createSession();
    await refreshSessions();
    setActiveSessionId(session.id);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function selectSession(id) {
    const session = await api.getSession(id);
    setActiveSessionId(id);
    setMessages(session.messages);
    setSidebarOpen(false);
  }

  async function renameSession(id) {
    const title = editingTitle.trim();
    if (!title) return;
    await api.renameSession(id, title);
    setEditingId(null);
    setEditingTitle("");
    await refreshSessions();
  }

  async function deleteSession(id) {
    await api.deleteSession(id);
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await refreshSessions();
  }

  async function sendMessage(value = input) {
    const text = value.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);
    const tempUserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((current) => [...current, tempUserMessage]);

    try {
      const result = await api.chat({ sessionId: activeSessionId, message: text });
      setActiveSessionId(result.sessionId);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer,
          timestamp: new Date().toISOString(),
          sources: result.sources
        }
      ]);
      await refreshSessions();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `## Request Failed\n\n${error.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function exportTxt() {
    const title = activeSession?.title || "placement-chat";
    const content = messages
      .map((message) => `[${message.role.toUpperCase()}] ${new Date(message.timestamp).toLocaleString()}\n${message.content}`)
      .join("\n\n---\n\n");
    downloadFile(`${title}.txt`, content, "text/plain");
  }

  function exportPdf() {
    const doc = new jsPDF();
    const title = activeSession?.title || "Placement Chat";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(title, 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let y = 28;
    messages.forEach((message) => {
      const block = `${message.role.toUpperCase()} - ${new Date(message.timestamp).toLocaleString()}\n${message.content}`;
      const lines = doc.splitTextToSize(block, 182);
      if (y + lines.length * 5 > 280) {
        doc.addPage();
        y = 18;
      }
      doc.text(lines, 14, y);
      y += lines.length * 5 + 8;
    });
    doc.save(`${title}.pdf`);
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!isAuthenticated) {
    return (
      <main className="auth-shell">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div className="brand-mark">
            <Bot size={28} />
          </div>
          <h1 id="auth-title">Placement Guidance Assistant</h1>
          <p>Sign in to manage placement mentoring chats, history, and exports.</p>
          <form onSubmit={handleAuth} className="auth-form">
            {authMode === "register" && (
              <label>
                Name
                <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
              </label>
            )}
            <label>
              Email
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} required />
            </label>
            <label>
              Password
              <input type="password" minLength={8} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} required />
            </label>
            {authError && <p className="error-text">{authError}</p>}
            <button className="primary-button" type="submit">{authMode === "register" ? "Create Account" : "Sign In"}</button>
          </form>
          <button className="text-button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? "Create a student account" : "Already have an account? Sign in"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">
            <Bot size={24} />
            <span>Placement AI</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <button className="new-chat" onClick={createNewChat}>
          <Plus size={18} />
          New Chat
        </button>

        <nav className="session-list" aria-label="Chat sessions">
          {sessions.map((session) => (
            <div className={`session-item ${session.id === activeSessionId ? "active" : ""}`} key={session.id}>
              {editingId === session.id ? (
                <input
                  className="rename-input"
                  value={editingTitle}
                  autoFocus
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") renameSession(session.id);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <button className="session-title" onClick={() => selectSession(session.id)}>
                  <span>{session.title}</span>
                  {session.preview && <small>{session.preview}</small>}
                </button>
              )}
              <div className="session-actions">
                {editingId === session.id ? (
                  <button className="icon-button" onClick={() => renameSession(session.id)} aria-label="Save session title">
                    <Check size={16} />
                  </button>
                ) : (
                  <button className="icon-button" onClick={() => { setEditingId(session.id); setEditingTitle(session.title); }} aria-label="Rename session">
                    <Edit3 size={16} />
                  </button>
                )}
                <button className="icon-button danger" onClick={() => deleteSession(session.id)} aria-label="Delete session">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="icon-text-button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
          <button className="icon-text-button" onClick={logout}>
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="chat-shell">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
            <Menu size={20} />
          </button>
          <div>
            <h1>{activeSession?.title || "Placement Guidance Assistant"}</h1>
            <p>{user.name}</p>
          </div>
          <div className="export-actions">
            <button className="icon-button" disabled={!messages.length} onClick={exportTxt} aria-label="Export chat as TXT">
              <Download size={18} />
              <span>TXT</span>
            </button>
            <button className="icon-button" disabled={!messages.length} onClick={exportPdf} aria-label="Export chat as PDF">
              <Download size={18} />
              <span>PDF</span>
            </button>
          </div>
        </header>

        <section className="messages" aria-live="polite">
          {!messages.length ? (
            <Welcome onPick={sendMessage} />
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}
          {loading && (
            <div className="typing">
              <Bot size={18} />
              <span>Placement Assistant is typing...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </section>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <textarea
            value={input}
            placeholder="Ask about placements, resumes, DSA, interviews, internships..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
          />
          <button className="send-button" type="submit" disabled={!input.trim() || loading} aria-label="Send message">
            <Send size={19} />
          </button>
        </form>
      </main>
    </div>
  );
}

function Welcome({ onPick }) {
  return (
    <div className="welcome">
      <div className="brand-mark">
        <Bot size={32} />
      </div>
      <h2>Welcome to your virtual placement mentor.</h2>
      <p>Ask about companies, eligibility, interview preparation, resumes, DSA, internships, or career paths.</p>
      <div className="suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} onClick={() => onPick(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <article className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? <User size={17} /> : <Bot size={17} />}
      </div>
      <div className="bubble">
        <div className="message-meta">
          <strong>{isUser ? "You" : "Placement Assistant"}</strong>
          <time>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : nowTime()}</time>
        </div>
        <div className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        {message.sources?.length > 0 && (
          <div className="sources">
            {message.sources.map((source) => <span key={source.id}>{source.title}</span>)}
          </div>
        )}
      </div>
    </article>
  );
}
