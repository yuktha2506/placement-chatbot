import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import {
  Bot,
  Check,
  Download,
  Edit3,
  FileUp,
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

const page = {
  marginX: 14,
  marginTop: 16,
  marginBottom: 280,
  width: 182
};

function cleanMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
}

function safeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").slice(0, 80);
}

function inferPdfName(messages, fallbackTitle) {
  const text = messages.map((message) => message.content).join("\n");
  const name = text.match(/(?:Name|Candidate)\s*:\s*([A-Za-z][A-Za-z\s]{1,60})/i)?.[1]?.trim();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  if (/ATS Score|Resume-Based Placement Analysis/i.test(text)) {
    return safeFilename(`ATS_Analysis_${name || timestamp}.pdf`);
  }

  if (/ATS-Friendly Resume/i.test(text)) {
    return safeFilename(`Resume_${name || timestamp}.pdf`);
  }

  if (/Skill Gap Analysis|Placement Readiness Score|Personalized Roadmap/i.test(text)) {
    return safeFilename(`Placement_Report_${name || timestamp}.pdf`);
  }

  return safeFilename(`Chat_Export_${fallbackTitle || timestamp}.pdf`);
}

function ensureSpace(doc, y, needed = 8) {
  if (y + needed <= page.marginBottom) return y;
  doc.addPage();
  return page.marginTop;
}

function writeWrapped(doc, text, x, y, width, options = {}) {
  const lines = doc.splitTextToSize(cleanMarkdown(text), width);
  const lineHeight = options.lineHeight || 5;
  y = ensureSpace(doc, y, lines.length * lineHeight);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function writeTable(doc, lines, y) {
  const rows = lines
    .filter((line) => /^\|.*\|$/.test(line.trim()))
    .filter((line) => !/^\|\s*-+/.test(line.replace(/\s/g, "")))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cleanMarkdown(cell.trim())));

  if (!rows.length) return y;

  const columnCount = Math.max(...rows.map((row) => row.length));
  const colWidth = page.width / columnCount;

  rows.forEach((row, rowIndex) => {
    const cellLines = row.map((cell) => doc.splitTextToSize(cell, colWidth - 4));
    const rowHeight = Math.max(...cellLines.map((cell) => cell.length)) * 4.8 + 5;
    y = ensureSpace(doc, y, rowHeight);

    row.forEach((_, colIndex) => {
      const x = page.marginX + colIndex * colWidth;
      doc.setFillColor(rowIndex === 0 ? 238 : 255, rowIndex === 0 ? 242 : 255, rowIndex === 0 ? 245 : 255);
      doc.rect(x, y - 4, colWidth, rowHeight, "FD");
      doc.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
      doc.text(cellLines[colIndex] || [""], x + 2, y + 1);
    });

    y += rowHeight;
  });

  doc.setFont("helvetica", "normal");
  return y + 4;
}

function renderMarkdownToPdf(doc, markdown, y) {
  const lines = markdown.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      y += 3;
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      const tableLines = [];
      while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
        tableLines.push(lines[index]);
        index += 1;
      }
      index -= 1;
      y = writeTable(doc, tableLines, y);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(level === 1 ? 15 : level === 2 ? 13 : 11);
      y = ensureSpace(doc, y + 2, 10);
      y = writeWrapped(doc, line.replace(/^#{1,3}\s+/, ""), page.marginX, y, page.width, { lineHeight: 6 });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y += 2;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const content = line.replace(/^[-*]\s+/, "");
      y = writeWrapped(doc, `- ${content}`, page.marginX + 4, y, page.width - 4, { lineHeight: 5 });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      y = writeWrapped(doc, line, page.marginX + 4, y, page.width - 4, { lineHeight: 5 });
      continue;
    }

    doc.setFont("helvetica", /\*\*.*\*\*/.test(line) ? "bold" : "normal");
    doc.setFontSize(10);
    y = writeWrapped(doc, line, page.marginX, y, page.width, { lineHeight: 5 });
  }

  return y;
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
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
  const [exportError, setExportError] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumeContext, setResumeContext] = useState(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

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
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages, loading, resumeUploading]);

  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "44px";
    }
  }, [input]);

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
      
      if (!result || !result.user || !result.token) {
        setAuthError("Invalid server response. Please try again.");
        return;
      }
      
      setAuth(result);
      setUser(result.user);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An error occurred during authentication";
      setAuthError(message);
      console.error("[Auth Error]", { error, message });
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
    setResumeContext(null);
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
      setResumeContext(null);
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
    setExportError("");

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const title = activeSession?.title || "Placement Chat";
      let y = page.marginTop;

      doc.setProperties({
        title,
        subject: "Placement Guidance Chat Export",
        creator: "Placement Guidance Assistant"
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      y = writeWrapped(doc, title, page.marginX, y, page.width, { lineHeight: 7 }) + 3;

      messages.forEach((message, index) => {
        y = ensureSpace(doc, y, 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const label = message.role === "user" ? "You" : "Placement Assistant";
        const time = message.timestamp ? new Date(message.timestamp).toLocaleString() : new Date().toLocaleString();
        y = writeWrapped(doc, `${label} - ${time}`, page.marginX, y, page.width, { lineHeight: 5 });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        y = renderMarkdownToPdf(doc, message.content, y + 2) + 5;

        if (index < messages.length - 1) {
          y = ensureSpace(doc, y, 4);
          doc.setDrawColor(220, 226, 234);
          doc.line(page.marginX, y, page.marginX + page.width, y);
          y += 6;
        }
      });

      const pageCount = doc.getNumberOfPages();
      for (let index = 1; index <= pageCount; index += 1) {
        doc.setPage(index);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(104, 114, 132);
        doc.text(`Page ${index} of ${pageCount}`, page.marginX + page.width - 24, 290);
      }

      doc.save(inferPdfName(messages, title));
    } catch (error) {
      console.error("PDF export failed", error);
      setExportError("PDF export failed. Please try again after refreshing the page.");
    }
  }

  async function handleResumeFileUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(extension)) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "## Resume Upload Failed\n\nPlease upload a PDF, DOCX, or TXT resume.",
          timestamp: new Date().toISOString()
        }
      ]);
      return;
    }

    setResumeUploading(true);
    setUploadProgress(12);
    try {
      console.info("[resume-upload] Reading file", { name: file.name, type: file.type, size: file.size });
      const buffer = await readFileAsArrayBuffer(file);
      setUploadProgress(38);
      const result = await api.analyzeResume({
        sessionId: activeSessionId,
        fileName: file.name,
        mimeType: file.type,
        base64: arrayBufferToBase64(buffer),
        targetRole: resumeContext?.targetRoles?.[0] || ""
      });
      setUploadProgress(86);

      setActiveSessionId(result.sessionId);
      setResumeContext({
        parsedResume: result.parsedResume,
        atsScore: result.atsScore,
        missingSkills: result.missingSkills,
        targetRoles: result.targetRoles
      });
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: `Uploaded resume for analysis: ${file.name}`,
          timestamp: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer,
          timestamp: new Date().toISOString()
        }
      ]);
      await refreshSessions();
      setUploadProgress(100);
    } catch (error) {
      console.error("[resume-upload] Failed", error);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `## Resume Upload Failed\n\n${error.message || "Unable to extract text from the uploaded resume."}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      window.setTimeout(() => {
        setResumeUploading(false);
        setUploadProgress(0);
      }, 250);
    }
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
        {exportError && <div className="inline-error" role="alert">{exportError}</div>}

        <section ref={messagesRef} className="messages" aria-live="polite" aria-busy={loading || resumeUploading}>
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
          {resumeUploading && (
            <div className="message-row assistant analysis-loading" role="status">
              <div className="avatar" aria-hidden="true">
                <Bot size={17} />
              </div>
              <div className="bubble">
                <div className="upload-status">
                  <span className="spinner" aria-hidden="true" />
                  <div>
                    <strong>Analyzing resume</strong>
                    <span>Extracting content and preparing ATS insights...</span>
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="progress-track" aria-hidden="true">
                  <span style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="composer-shell">
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeFileUpload}
            />
            <button
              className="composer-icon-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload resume for analysis"
              title="Upload resume for analysis"
              disabled={loading || resumeUploading}
            >
              {resumeUploading ? <span className="spinner" aria-hidden="true" /> : <FileUp size={19} />}
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              aria-label="Chat message"
              placeholder="Ask about placements, resumes, DSA, interviews, internships..."
              onChange={(event) => setInput(event.target.value)}
              onInput={(event) => {
                event.currentTarget.style.height = "44px";
                event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
            />
            <button className="send-button" type="submit" disabled={!input.trim() || loading || resumeUploading} aria-label="Send message">
              <Send size={19} />
            </button>
          </form>
        </div>
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
      <p>Upload your resume or ask a placement-related question.</p>
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
  const isAtsReport = !isUser && /ATS Score|Resume-Based ATS|Skill Gap Report|Placement Readiness/i.test(message.content);

  return (
    <article className={`message-row ${isUser ? "user" : "assistant"} ${isAtsReport ? "ats-report" : ""}`}>
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
