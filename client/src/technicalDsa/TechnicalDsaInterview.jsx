import React, { useMemo, useState } from "react";
import { Code2, Download, Lightbulb, Play, RotateCcw, Send, X } from "lucide-react";
import { api } from "../api";

const difficulties = ["Beginner", "Easy", "Medium", "Hard"];
const totalQuestions = 5;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function makeReportText(summary, attempts) {
  return [
    "Technical DSA Interview Report",
    `Overall Score: ${summary.overallScore}%`,
    `Questions Attempted: ${summary.questionsAttempted}`,
    `Questions Solved: ${summary.questionsSolved}`,
    `Questions Partially Solved: ${summary.questionsPartiallySolved}`,
    `Accuracy: ${summary.accuracy}%`,
    `Problem Solving: ${summary.problemSolving}`,
    `Code Quality: ${summary.codeQuality}`,
    `Time Management: ${summary.timeManagement}`,
    "",
    "Topics:",
    ...Object.entries(summary.topics).map(([topic, rating]) => `- ${topic}: ${rating}`),
    "",
    "Recommended Topics:",
    ...(summary.recommendedTopics.length ? summary.recommendedTopics.map(topic => `- ${topic}`) : ["- Keep practicing mixed DSA problems."]),
    "",
    "Question Attempts:",
    ...attempts.map((item, index) => `Q${index + 1}. ${item.title} (${item.topic}) - ${item.status}, ${item.accuracy}%`)
  ].join("\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain" });
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

export default function TechnicalDsaInterview({ onClose }) {
  const [difficulty, setDifficulty] = useState("Medium");
  const [question, setQuestion] = useState(null);
  const [askedIds, setAskedIds] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [code, setCode] = useState("");
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [interviewerMessage, setInterviewerMessage] = useState("");
  const [hints, setHints] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tick, setTick] = useState(Date.now());

  React.useEffect(() => {
    if (!startedAt || summary) return undefined;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, summary]);

  const elapsedSeconds = useMemo(() => startedAt ? Math.round((tick - startedAt) / 1000) : 0, [startedAt, tick]);
  const progress = question ? `${attempts.length + 1} / ${totalQuestions}` : `${attempts.length} / ${totalQuestions}`;

  async function fetchNext(nextAskedIds = askedIds, lastAccepted = false) {
    const result = await api.nextDsaQuestion({ difficulty, askedIds: nextAskedIds, lastAccepted });
    setQuestion(result.question);
    setInterviewerMessage(result.interviewerMessage || "");
    setCode(result.question.starterCode);
    setRunResult(null);
    setSubmitResult(null);
    setHints([]);
    setQuestionStartedAt(Date.now());
  }

  async function startInterview(event) {
    event.preventDefault();
    setError("");
    setSummary(null);
    setAttempts([]);
    setAskedIds([]);
    setStartedAt(Date.now());
    setLoading(true);
    try {
      await fetchNext([], false);
    } catch (err) {
      setError(err.message || "Unable to start Technical DSA Interview.");
      setStartedAt(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCodeKeyDown(event) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextCode = `${code.slice(0, start)}    ${code.slice(end)}`;
    setCode(nextCode);
    window.setTimeout(() => {
      target.selectionStart = start + 4;
      target.selectionEnd = start + 4;
    }, 0);
  }

  async function runCode() {
    if (!question) return;
    setError("");
    setRunResult(null);
    setLoading(true);
    try {
      setRunResult(await api.runDsaCode({ questionId: question.id, code }));
    } catch (err) {
      setError(err.message || "Unable to run code.");
    } finally {
      setLoading(false);
    }
  }

  async function submitCode() {
    if (!question) return;
    setError("");
    setLoading(true);
    try {
      const elapsed = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
      const result = await api.submitDsaCode({ questionId: question.id, code, elapsedSeconds: elapsed });
      setSubmitResult(result);
      const attempt = {
        id: question.id,
        title: question.title,
        topic: question.topic,
        difficulty: question.difficulty,
        status: result.status,
        accuracy: result.feedback.accuracy,
        timeSpentSeconds: elapsed
      };
      const nextAttempts = [...attempts, attempt];
      const nextAskedIds = [...askedIds, question.id];
      setAttempts(nextAttempts);
      setAskedIds(nextAskedIds);
      if (nextAttempts.length >= totalQuestions) {
        const totalSeconds = Math.round((Date.now() - startedAt) / 1000);
        const localSummary = buildLocalSummary(nextAttempts, totalSeconds);
        setSummary(localSummary);
        setQuestion(null);
      }
    } catch (err) {
      setError(err.message || "Unable to submit solution.");
    } finally {
      setLoading(false);
    }
  }

  async function continueInterview() {
    setLoading(true);
    try {
      await fetchNext(askedIds, submitResult?.status === "Accepted");
    } catch (err) {
      setError(err.message || "No more DSA questions are available.");
    } finally {
      setLoading(false);
    }
  }

  async function getHint() {
    if (!question) return;
    setError("");
    try {
      const result = await api.getDsaHint({ questionId: question.id, usedHints: hints.length });
      setHints(current => [...current, result.hint]);
    } catch (err) {
      setError(err.message || "Unable to load hint.");
    }
  }

  function restart(nextDifficulty = difficulty) {
    setDifficulty(nextDifficulty);
    setQuestion(null);
    setAskedIds([]);
    setAttempts([]);
    setCode("");
    setRunResult(null);
    setSubmitResult(null);
    setHints([]);
    setError("");
    setStartedAt(null);
    setSummary(null);
  }

  return (
    <div className="modal-overlay dsa-shell">
      <div className="modal-content dsa-modal">
        <div className="modal-header">
          <div>
            <h2>Technical DSA Interview</h2>
            <p className="mock-muted">Python coding interview with sample and hidden tests.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close Technical DSA Interview"><X size={20} /></button>
        </div>
        {error && <p className="error-text mock-error">{error}</p>}

        {!question && !summary && (
          <form className="dsa-setup" onSubmit={startInterview}>
            <label>Difficulty<select value={difficulty} onChange={event => setDifficulty(event.target.value)}>{difficulties.map(item => <option key={item}>{item}</option>)}</select></label>
            <button className="primary-button" type="submit" disabled={loading}><Play size={16} /> Start Technical Interview</button>
          </form>
        )}

        {question && (
          <>
            <div className="dsa-statusbar">
              <span>Level: {difficulty}</span>
              <span>Question: {progress}</span>
              <span>Topic: {question.topic}</span>
              <span>Time: {formatTime(elapsedSeconds)}</span>
            </div>
            <div className="dsa-workspace">
              <section className="dsa-question-panel">
                <span className="dsa-pill">{question.difficulty}</span>
                <h3>{question.title}</h3>
                <p>{question.description}</p>
                {interviewerMessage && <div className="dsa-interviewer"><strong>Interviewer</strong><p>{interviewerMessage}</p></div>}
                <h4>Input Format</h4><p>{question.inputFormat}</p>
                <h4>Output Format</h4><p>{question.outputFormat}</p>
                <h4>Constraints</h4>
                <ul>{question.constraints.map(item => <li key={item}>{item}</li>)}</ul>
                <h4>Example</h4>
                <pre>{question.examples[0].input}{`\nOutput: ${question.examples[0].output}`}</pre>
                {question.sourceUrl && <a href={question.sourceUrl} target="_blank" rel="noreferrer">Reference pattern</a>}
              </section>
              <section className="dsa-code-panel">
                <div className="dsa-editor-header"><Code2 size={16} /> Python Editor</div>
                <div className="dsa-editor">
                  <pre aria-hidden="true">{code.split("\n").map((_, index) => <span key={index}>{index + 1}</span>)}</pre>
                  <textarea value={code} onChange={event => setCode(event.target.value)} onKeyDown={handleCodeKeyDown} spellCheck="false" />
                </div>
                <div className="dsa-actions">
                  <button className="secondary-button" type="button" onClick={() => setCode(question.starterCode)} disabled={loading}><RotateCcw size={16} /> Reset</button>
                  <button className="secondary-button" type="button" onClick={getHint} disabled={loading}><Lightbulb size={16} /> Get Hint</button>
                  <button className="secondary-button" type="button" onClick={runCode} disabled={loading}><Play size={16} /> Run Code</button>
                  <button className="primary-button" type="button" onClick={submitCode} disabled={loading}><Send size={16} /> Submit</button>
                </div>
              </section>
            </div>
            {!!hints.length && <section className="dsa-card"><h4>Hints</h4>{hints.map((hint, index) => <p key={`${hint}-${index}`}>Hint {index + 1}: {hint}</p>)}</section>}
            {runResult && <TestResults title="Sample Test Results" result={runResult} reveal />}
            {submitResult && (
              <section className="dsa-card">
                <h4>Submission Result</h4>
                <p><strong>{submitResult.status}</strong> - {submitResult.passed} / {submitResult.total} test cases passed.</p>
                <p>Correctness: {submitResult.feedback.correctness}</p>
                <p>Complexity: {submitResult.feedback.complexity}</p>
                <p>{submitResult.feedback.feedback}</p>
                {submitResult.interviewerMessage && <p><strong>Interviewer:</strong> {submitResult.interviewerMessage}</p>}
                {attempts.length < totalQuestions && <button className="primary-button" type="button" onClick={continueInterview} disabled={loading}>Next Question</button>}
              </section>
            )}
          </>
        )}

        {summary && (
          <section className="dsa-summary">
            <h3>Technical Interview Report</h3>
            <strong>Overall Score: {summary.overallScore}%</strong>
            <div className="dsa-summary-grid">
              <span>Attempted: {summary.questionsAttempted}</span>
              <span>Solved: {summary.questionsSolved}</span>
              <span>Partially Solved: {summary.questionsPartiallySolved}</span>
              <span>Accuracy: {summary.accuracy}%</span>
              <span>Problem Solving: {summary.problemSolving}</span>
              <span>Code Quality: {summary.codeQuality}</span>
              <span>Time: {summary.timeManagement}</span>
            </div>
            <h4>Topics</h4>
            {Object.entries(summary.topics).map(([topic, rating]) => <p key={topic}>{topic}: {rating}</p>)}
            <h4>Recommended Practice</h4>
            {(summary.recommendedTopics.length ? summary.recommendedTopics : ["Mixed DSA revision"]).map(topic => <p key={topic}>{topic}</p>)}
            <div className="dsa-actions">
              <button className="secondary-button" type="button" onClick={() => downloadText("Technical_DSA_Report.txt", makeReportText(summary, attempts))}><Download size={16} /> Download Report</button>
              <button className="secondary-button" type="button" onClick={() => restart()}>Restart Interview</button>
              <button className="primary-button" type="button" onClick={() => restart("Easy")}>Try Another Difficulty</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TestResults({ title, result }) {
  return (
    <section className="dsa-card">
      <h4>{title}</h4>
      <p><strong>{result.status}</strong> - {result.passed} / {result.total} passed</p>
      {result.message && <p className="error-text">{result.message}</p>}
      {result.results.map(item => (
        <article key={item.index} className={item.passed ? "dsa-pass" : "dsa-fail"}>
          <strong>Test Case {item.index}: {item.passed ? "Passed" : "Failed"}</strong>
          {"input" in item && <pre>{`Input: ${JSON.stringify(item.input)}\nExpected: ${JSON.stringify(item.expected)}\nYour Output: ${JSON.stringify(item.actual ?? item.error ?? null)}`}</pre>}
        </article>
      ))}
    </section>
  );
}

function buildLocalSummary(attempts, totalSeconds) {
  const solved = attempts.filter(item => item.status === "Accepted").length;
  const partial = attempts.filter(item => item.status === "Partially Correct").length;
  const accuracy = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.accuracy, 0) / attempts.length) : 0;
  const topics = {};
  attempts.forEach(item => {
    topics[item.topic] = item.accuracy >= 85 ? "Excellent" : item.accuracy >= 65 ? "Good" : item.accuracy >= 40 ? "Needs Improvement" : "Weak";
  });
  return {
    overallScore: accuracy,
    questionsAttempted: attempts.length,
    questionsSolved: solved,
    questionsPartiallySolved: partial,
    accuracy,
    problemSolving: accuracy >= 80 ? "Strong" : accuracy >= 55 ? "Developing" : "Needs practice",
    codeQuality: solved >= Math.ceil(attempts.length / 2) ? "Good" : "Needs cleaner, tested implementations",
    timeManagement: `${Math.round(totalSeconds / Math.max(1, attempts.length))}s average per question`,
    topics,
    recommendedTopics: Object.entries(topics).filter(([, rating]) => /Needs|Weak/.test(rating)).map(([topic]) => topic)
  };
}
