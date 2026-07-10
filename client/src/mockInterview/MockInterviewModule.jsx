import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, History, Play, Send, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { api } from "../api";

const roles = ["Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "AI Engineer", "ML Engineer", "Data Analyst", "QA Engineer", "Product Manager"];
const difficulties = ["Beginner", "Intermediate", "Advanced"];
const durations = [10, 20, 30];

function saveBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 500);
}

function reportToText(report) {
  return [
    `AI Mock Interview Report`,
    `Role: ${report.role}`,
    `Difficulty: ${report.difficulty}`,
    `Overall Score: ${report.overallScore}/100`,
    `Recommendation: ${report.recommendation}`,
    "",
    `Strengths: ${report.strengths.join(", ")}`,
    `Weaknesses: ${report.weaknesses.join(", ")}`,
    "",
    "Improvement Areas:",
    ...report.improvementAreas.map(item => `- ${item}`),
    "",
    "Question-wise Analysis:",
    ...report.questionAnalysis.map((item) => `Q${item.questionNumber}. ${item.question}\nScore: ${item.score}/100\nAnswer: ${item.answer}\nFeedback: ${item.feedback?.summary || ""}\n`)
  ].join("\n");
}

function downloadPdf(report) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AI Mock Interview Report", 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`${report.role} | ${report.difficulty} | Score: ${report.overallScore}/100`, 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  reportToText(report).split("\n").forEach((line) => {
    if (y > 280) {
      doc.addPage();
      y = 14;
    }
    const wrapped = doc.splitTextToSize(line, 180);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 5;
  });
  doc.save(`Mock_Interview_Report_${report.role.replace(/\s+/g, "_")}.pdf`);
}

function ScoreRing({ score }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg className="mock-score-ring" viewBox="0 0 120 120" role="img" aria-label={`Overall score ${score} out of 100`}>
      <circle cx="60" cy="60" r={radius} />
      <circle cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - (score / 100) * circumference} />
      <text x="60" y="64" textAnchor="middle">{score}</text>
    </svg>
  );
}

function RadarChart({ skills }) {
  const entries = Object.entries(skills);
  const points = entries.map(([, value], index) => {
    const angle = (-90 + (360 / entries.length) * index) * Math.PI / 180;
    const distance = 42 * (value / 100);
    return `${60 + Math.cos(angle) * distance},${60 + Math.sin(angle) * distance}`;
  }).join(" ");

  return (
    <svg className="mock-radar" viewBox="0 0 120 120" aria-label="Skill radar chart">
      <circle cx="60" cy="60" r="42" />
      <circle cx="60" cy="60" r="28" />
      <circle cx="60" cy="60" r="14" />
      <polygon points={points} />
    </svg>
  );
}

function ReportDashboard({ report }) {
  if (!report) return null;
  const skillEntries = Object.entries(report.skills);
  return (
    <div className="mock-report">
      <div className="mock-report-top">
        <ScoreRing score={report.overallScore} />
        <div>
          <h3>{report.recommendation}</h3>
          <p>{report.summary}</p>
        </div>
        <RadarChart skills={report.skills} />
      </div>

      <div className="mock-skill-grid">
        {skillEntries.map(([name, value]) => (
          <div key={name} className="mock-skill-bar">
            <span>{name.replace(/([A-Z])/g, " $1")}</span>
            <strong>{value}</strong>
            <div><i style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>

      <div className="mock-card-grid">
        <section>
          <h4>Strengths</h4>
          {report.strengths.map(item => <p key={item}>{item}</p>)}
        </section>
        <section>
          <h4>Weaknesses</h4>
          {report.weaknesses.map(item => <p key={item}>{item}</p>)}
        </section>
        <section>
          <h4>Suggestions</h4>
          {report.improvementAreas.map(item => <p key={item}>{item}</p>)}
        </section>
      </div>

      <section className="mock-question-analysis">
        <h4>Question-wise Analysis</h4>
        {report.questionAnalysis.map(item => (
          <article key={`${item.questionNumber}-${item.question}`}>
            <strong>Q{item.questionNumber}. {item.question}</strong>
            <span>{item.type} | {item.score}/100 | {item.timeSpentSeconds}s</span>
            <p>{item.feedback?.summary}</p>
            <details>
              <summary>Correct answer and best practice</summary>
              <p>{item.feedback?.correctAnswer}</p>
              <p>{item.feedback?.bestPractice}</p>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function MockInterviewModule({ onClose }) {
  const [setup, setSetup] = useState({ role: roles[0], difficulty: difficulties[1], duration: 10 });
  const [interview, setInterview] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const elapsedSeconds = useMemo(() => Math.max(1, Math.round((Date.now() - startedAt) / 1000)), [question, answer]);

  async function loadHistory() {
    try {
      const result = await api.listMockInterviews();
      setHistory(result.interviews || []);
    } catch (err) {
      console.error("Mock interview history failed", err);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function startInterview(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.startMockInterview(setup);
      setInterview(result.interview);
      setQuestion(result.question);
      setReport(null);
      setAnswer("");
      setStartedAt(Date.now());
    } catch (err) {
      setError(err.message || "Unable to start mock interview.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!answer.trim() || !interview || !question) return;
    setError("");
    setLoading(true);
    try {
      const result = await api.answerMockInterview(interview.id, {
        answer,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000)
      });
      setAnswer("");
      if (result.completed) {
        setQuestion(null);
        setReport(result.report);
        await loadHistory();
      } else {
        setQuestion(result.question);
        setStartedAt(Date.now());
        window.setTimeout(() => textareaRef.current?.focus(), 0);
      }
    } catch (err) {
      setError(err.message || "Unable to submit answer.");
    } finally {
      setLoading(false);
    }
  }

  async function finishInterview() {
    if (!interview) return;
    setLoading(true);
    try {
      const result = await api.finishMockInterview(interview.id);
      setQuestion(null);
      setReport(result.report);
      await loadHistory();
    } catch (err) {
      setError(err.message || "Unable to finish interview.");
    } finally {
      setLoading(false);
    }
  }

  async function openHistory(id) {
    setLoading(true);
    try {
      const result = await api.getMockInterview(id);
      setInterview(result.interview);
      setQuestion(null);
      setReport(result.report);
    } catch (err) {
      setError(err.message || "Unable to open report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay mock-interview-shell">
      <div className="modal-content mock-interview-modal">
        <div className="modal-header">
          <h2>AI Mock Interview</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close mock interview">
            <X size={20} />
          </button>
        </div>

        {error && <p className="error-text mock-error">{error}</p>}

        {!interview && !report && (
          <form className="mock-setup" onSubmit={startInterview}>
            <label>Role<select value={setup.role} onChange={event => setSetup({ ...setup, role: event.target.value })}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
            <label>Difficulty<select value={setup.difficulty} onChange={event => setSetup({ ...setup, difficulty: event.target.value })}>{difficulties.map(item => <option key={item}>{item}</option>)}</select></label>
            <label>Duration<select value={setup.duration} onChange={event => setSetup({ ...setup, duration: Number(event.target.value) })}>{durations.map(item => <option key={item} value={item}>{item} minutes</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={loading}><Play size={16} /> Start Interview</button>
          </form>
        )}

        {question && (
          <form className="mock-active" onSubmit={submitAnswer}>
            <div className="mock-question-meta">
              <span>{interview.role}</span>
              <span>{interview.difficulty}</span>
              <span>{question.type}</span>
            </div>
            <h3>{question.prompt}</h3>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              rows={8}
              placeholder="Type your answer. Multi-line code is supported."
            />
            <div className="mock-actions">
              <button className="secondary-button" type="button" onClick={finishInterview} disabled={loading}>Finish Interview</button>
              <button className="primary-button" type="submit" disabled={loading || !answer.trim()}><Send size={16} /> Submit Answer</button>
            </div>
            <p className="mock-muted">Current answer time: {elapsedSeconds}s</p>
          </form>
        )}

        {report && (
          <>
            <div className="mock-downloads">
              <button className="icon-text-button" type="button" onClick={() => downloadPdf(report)}><Download size={16} /> PDF Report</button>
              <button className="icon-text-button" type="button" onClick={() => saveBlob("Mock_Interview_Report.txt", reportToText(report), "text/plain")}><Download size={16} /> TXT Report</button>
              <button className="icon-text-button" type="button" onClick={() => saveBlob("Mock_Interview_Report.json", JSON.stringify(report, null, 2), "application/json")}><Download size={16} /> JSON Report</button>
            </div>
            <ReportDashboard report={report} />
          </>
        )}

        <aside className="mock-history">
          <h3><History size={16} /> Interview History</h3>
          {history.length ? history.map(item => (
            <button type="button" key={item.id} onClick={() => openHistory(item.id)}>
              <strong>{item.role}</strong>
              <span>{item.difficulty} | {item.score ?? "Active"}/100 | {new Date(item.startedAt).toLocaleDateString()}</span>
            </button>
          )) : <p className="mock-muted">No previous mock interviews yet.</p>}
        </aside>
      </div>
    </div>
  );
}
