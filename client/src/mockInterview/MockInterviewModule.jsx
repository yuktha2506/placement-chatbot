import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, History, Mic, MicOff, Play, Send, Volume2, X } from "lucide-react";
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
  const [interviewMode, setInterviewMode] = useState("text");
  const [interview, setInterview] = useState(null);
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("idle");
  const [voiceMessage, setVoiceMessage] = useState("");
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const voiceQuestionIdRef = useRef(null);
  const voiceTranscriptRef = useRef("");

  const elapsedSeconds = useMemo(() => Math.max(1, Math.round((Date.now() - startedAt) / 1000)), [question, answer]);
  const speechRecognitionSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const speechSynthesisSupported = typeof window !== "undefined" && Boolean(window.speechSynthesis);
  const voiceSupported = speechRecognitionSupported && speechSynthesisSupported;

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

  useEffect(() => {
    return () => {
      stopListening();
      stopMicTracks();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (interviewMode !== "voice" || !question || !voiceSupported) return;
    if (voiceQuestionIdRef.current === question.id) return;
    voiceQuestionIdRef.current = question.id;
    speakQuestion(question.prompt);
  }, [interviewMode, question, voiceSupported]);

  function stopSpeaking() {
    if (speechSynthesisSupported) {
      window.speechSynthesis.cancel();
    }
  }

  function stopMicTracks() {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        // Browser may already have ended recognition.
      }
      recognitionRef.current = null;
    }
    stopMicTracks();
  }

  async function ensureMicrophonePermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Voice interviews are not supported in this browser.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    stopMicTracks();
  }

  function speakQuestion(text) {
    if (!speechSynthesisSupported || !text) return;
    stopSpeaking();
    setVoiceStatus("speaking");
    setVoiceMessage("AI is speaking...");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      setVoiceStatus("ready");
      setVoiceMessage("Your turn. Tap the microphone and answer.");
    };
    utterance.onerror = () => {
      setVoiceStatus("ready");
      setVoiceMessage("Unable to play audio. You can read the question and answer by voice or text.");
    };
    window.speechSynthesis.speak(utterance);
  }

  async function startInterview(event) {
    event.preventDefault();
    setError("");
    setVoiceMessage("");
    if (interviewMode === "voice" && !voiceSupported) {
      setError("Voice interviews are not supported in this browser. Please use Text mode or try Chrome/Edge.");
      return;
    }
    setLoading(true);
    try {
      if (interviewMode === "voice") {
        await ensureMicrophonePermission();
      }
      const result = await api.startMockInterview(setup);
      setInterview(result.interview);
      setQuestion(result.question);
      setReport(null);
      setAnswer("");
      setStartedAt(Date.now());
      voiceQuestionIdRef.current = null;
    } catch (err) {
      if (interviewMode === "voice" && /permission|denied|notallowed/i.test(err.message || "")) {
        setError("Microphone access is required for voice interviews. Please allow microphone access and try again.");
      } else {
        setError(err.message || "Unable to start mock interview.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswerValue(answerText) {
    if (!answerText.trim() || !interview || !question) return;
    setError("");
    setLoading(true);
    if (interviewMode === "voice") {
      setVoiceStatus("processing");
      setVoiceMessage("Processing your answer...");
    }
    try {
      const result = await api.answerMockInterview(interview.id, {
        answer: answerText,
        timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000)
      });
      setAnswer("");
      if (result.completed) {
        setQuestion(null);
        setReport(result.report);
        setVoiceStatus("idle");
        setVoiceMessage("Interview completed. Your report is ready.");
        stopSpeaking();
        stopListening();
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

  async function submitAnswer(event) {
    event.preventDefault();
    await submitAnswerValue(answer);
  }

  function startListening() {
    if (!voiceSupported) {
      setError("Voice interviews are not supported in this browser. Please use Text mode.");
      return;
    }
    if (voiceStatus === "listening" || loading || !interview || !question) return;

    stopSpeaking();
    stopListening();
    setError("");
    setAnswer("");
    setVoiceStatus("listening");
    setVoiceMessage("Listening...");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    voiceTranscriptRef.current = "";

    let finalTranscript = "";
    let submitted = false;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      voiceTranscriptRef.current = `${finalTranscript} ${interimTranscript}`.trim();
      setAnswer(voiceTranscriptRef.current);
    };

    recognition.onerror = (event) => {
      const message = event.error === "no-speech"
        ? "I could not hear an answer. Please tap the microphone and try again."
        : event.error === "not-allowed"
          ? "Microphone access is required for voice interviews. Please allow microphone access and try again."
          : "Speech recognition failed. Please try again or type your answer.";
      setError(message);
      setVoiceStatus("ready");
      setVoiceMessage("Your turn. Tap the microphone and answer.");
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      stopMicTracks();
      const spokenAnswer = voiceTranscriptRef.current.trim();
      if (submitted) return;
      submitted = true;
      if (!spokenAnswer) {
        setVoiceStatus("ready");
        setVoiceMessage("No clear speech detected. Tap the microphone and try again.");
        return;
      }
      submitAnswerValue(spokenAnswer);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceStatus("ready");
      setVoiceMessage("Unable to start listening. Please try again.");
    }
  }

  async function finishInterview() {
    if (!interview) return;
    stopListening();
    stopSpeaking();
    setLoading(true);
    try {
      const result = await api.finishMockInterview(interview.id);
      setQuestion(null);
      setReport(result.report);
      setVoiceStatus("idle");
      setVoiceMessage("Interview completed. Your report is ready.");
      await loadHistory();
    } catch (err) {
      setError(err.message || "Unable to finish interview.");
    } finally {
      setLoading(false);
    }
  }

  async function openHistory(id) {
    stopListening();
    stopSpeaking();
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
          <button className="icon-button" type="button" onClick={() => { stopListening(); stopSpeaking(); onClose(); }} aria-label="Close mock interview">
            <X size={20} />
          </button>
        </div>

        {error && <p className="error-text mock-error">{error}</p>}

        {!interview && !report && (
          <form className="mock-setup" onSubmit={startInterview}>
            <label>Role<select value={setup.role} onChange={event => setSetup({ ...setup, role: event.target.value })}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
            <label>Difficulty<select value={setup.difficulty} onChange={event => setSetup({ ...setup, difficulty: event.target.value })}>{difficulties.map(item => <option key={item}>{item}</option>)}</select></label>
            <label>Duration<select value={setup.duration} onChange={event => setSetup({ ...setup, duration: Number(event.target.value) })}>{durations.map(item => <option key={item} value={item}>{item} minutes</option>)}</select></label>
            <fieldset className="mock-mode-toggle">
              <legend>Interview Mode</legend>
              <label><input type="radio" name="mock-mode" value="text" checked={interviewMode === "text"} onChange={() => setInterviewMode("text")} /> Text</label>
              <label><input type="radio" name="mock-mode" value="voice" checked={interviewMode === "voice"} onChange={() => setInterviewMode("voice")} /> Voice</label>
            </fieldset>
            <button className="primary-button" type="submit" disabled={loading}><Play size={16} /> Start Interview</button>
            {interviewMode === "voice" && !voiceSupported && <p className="mock-muted mock-voice-warning">Voice mode needs browser speech recognition and speech synthesis support.</p>}
          </form>
        )}

        {question && (
          <form className="mock-active" onSubmit={submitAnswer}>
            <div className="mock-question-meta">
              <span>{interview.role}</span>
              <span>{interview.difficulty}</span>
              <span>{question.type}</span>
              <span>{interviewMode === "voice" ? "Voice mode" : "Text mode"}</span>
            </div>
            {interviewMode === "voice" && (
              <div className={`mock-voice-panel ${voiceStatus}`}>
                <div>
                  <strong>{voiceMessage || "Voice interview is ready."}</strong>
                  <span>{voiceStatus === "listening" ? "Recording..." : voiceStatus === "speaking" ? "Listen to the interviewer." : voiceStatus === "processing" ? "Evaluating through the existing interview engine." : "Use the microphone or type if needed."}</span>
                </div>
                <Volume2 size={18} />
              </div>
            )}
            <h3>{question.prompt}</h3>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              rows={8}
              placeholder={interviewMode === "voice" ? "Your spoken answer transcript will appear here. You can edit or type if needed." : "Type your answer. Multi-line code is supported."}
            />
            <div className="mock-actions">
              {interviewMode === "voice" && (
                voiceStatus === "listening" ? (
                  <button className="secondary-button" type="button" onClick={() => recognitionRef.current?.stop()} disabled={loading}><MicOff size={16} /> Stop Recording</button>
                ) : (
                  <button className="secondary-button" type="button" onClick={startListening} disabled={loading || voiceStatus === "speaking" || voiceStatus === "processing"}><Mic size={16} /> Tap to Speak</button>
                )
              )}
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
