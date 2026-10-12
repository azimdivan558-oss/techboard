import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import "./RecruiterCopilot.css";

const suggestions = [
  "Rank the top candidates for my latest job",
  "Who should I shortlist and why?",
  "Find candidates with React and Node.js",
  "Compare my strongest candidates",
];

export default function RecruiterCopilot({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [topCandidates, setTopCandidates] = useState([]);
  const [overview, setOverview] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    try {
      const res = await API.get("/recruiter-copilot/overview");
      setOverview(res.data?.overview || null);
      setTopCandidates(res.data?.overview?.topCandidates || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load recruiter insights.");
    }
  };

  useEffect(() => {
    if (open) loadOverview();
  }, [open]);

  const send = async (preset) => {
    const text = String(preset ?? message).trim();
    if (!text || loading) return;
    setMessage("");
    setError("");
    setMessages((items) => [...items, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await API.post("/recruiter-copilot/chat", { message: text, sessionId });
      setSessionId(res.data?.sessionId || sessionId);
      setMessages((items) => [...items, { role: "assistant", content: res.data?.message || "No response received." }]);
      setTopCandidates(res.data?.topCandidates || []);
    } catch (err) {
      const msg = err.response?.data?.message || "Copilot could not complete that request.";
      setError(msg);
      setMessages((items) => [...items, { role: "assistant", content: msg, error: true }]);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    applications: overview?.totalApplications || topCandidates.length || 0,
    shortlisted: overview?.shortlisted || 0,
    interviews: overview?.interviews || 0,
  }), [overview, topCandidates]);

  return (
    <>
      <button className={`copilot-launch ${compact ? "copilot-launch-compact" : ""}`} onClick={() => setOpen(true)} type="button">
        <span className="copilot-spark">✦</span><span>AI Recruiter Copilot</span><span className="copilot-launch-arrow">→</span>
      </button>

      {open && (
        <div className="copilot-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <section className="copilot-modal" role="dialog" aria-modal="true" aria-label="AI Recruiter Copilot">
            <header className="copilot-header">
              <div><div className="copilot-kicker">RECRUITMENT INTELLIGENCE</div><h2>✨ AI Recruiter Copilot</h2><p>Analyze applicants, rank talent and prepare better interviews.</p></div>
              <button className="copilot-close" onClick={() => setOpen(false)} type="button">×</button>
            </header>
            <div className="copilot-body">
              <aside className="copilot-sidebar">
                <div className="copilot-mini-stats"><div><strong>{stats.applications}</strong><span>Applications</span></div><div><strong>{stats.shortlisted}</strong><span>Shortlisted</span></div><div><strong>{stats.interviews}</strong><span>Interviews</span></div></div>
                <h4>Quick actions</h4>
                <div className="copilot-suggestions">{suggestions.map((item) => <button key={item} type="button" onClick={() => send(item)}>{item}</button>)}</div>
                <h4>Top candidates</h4>
                <div className="copilot-top-list">
                  {topCandidates.slice(0, 5).map((candidate, index) => <div className="copilot-candidate" key={candidate.applicationId || index}><span className="candidate-rank">{index + 1}</span><div><strong>{candidate.name}</strong><small>{candidate.jobMatchScore}% match</small></div><b>{candidate.recruiterScore}</b></div>)}
                  {!topCandidates.length && <small className="copilot-muted">No scored candidates yet.</small>}
                </div>
              </aside>
              <div className="copilot-chat">
                <div className="copilot-messages">
                  {!messages.length && <div className="copilot-welcome"><div className="copilot-welcome-icon">✦</div><h3>Hire with more confidence.</h3><p>Ask me to rank, compare, search or explain candidates using your real application data.</p></div>}
                  {messages.map((item, index) => <div className={`copilot-message ${item.role === "user" ? "user" : "assistant"}`} key={index}><span className="copilot-message-label">{item.role === "user" ? "You" : "Copilot"}</span><div>{item.content}</div></div>)}
                  {loading && <div className="copilot-message assistant"><span className="copilot-message-label">Copilot</span><div className="copilot-loading"><i></i><i></i><i></i> Analyzing candidates…</div></div>}
                </div>
                {error && <div className="copilot-error">{error}</div>}
                <div className="copilot-input-wrap"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask: Who are my best candidates for React?" disabled={loading} /><button type="button" onClick={() => send()} disabled={loading || !message.trim()}>➤</button></div>
                <small className="copilot-disclaimer">Recommendations use job-match, ATS, skills, experience and application data. AI does not use protected attributes for ranking.</small>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
