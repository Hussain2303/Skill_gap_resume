import { useCallback, useState, useEffect, useRef } from "react";
import axios from "axios";

function ytUrl(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q.trim())}`;
}

function scoreColor(n) {
  if (n >= 75) return "#a78bfa";
  if (n >= 50) return "#fb923c";
  return "#f87171";
}

function scoreLabel(n) {
  if (n >= 80) return "Excellent fit";
  if (n >= 65) return "Good match";
  if (n >= 45) return "Partial match";
  return "Needs work";
}

function Ring({ value = 0, size = 140, stroke = 11, label = "", sub = "" }) {
  const [displayed, setDisplayed] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(100, Math.max(0, displayed))) / 100;
  const color = scoreColor(value);

  useEffect(() => {
    let start = null;
    const duration = 1200;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(ease * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e1b2e" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke 0.4s" }} />
      </svg>
      <div style={{ textAlign: "center", position: "relative" }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
          {displayed}<span style={{ fontSize: 14, color: "#4b4566" }}>%</span>
        </div>
        {label && <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color, marginTop: 2 }}>{label}</div>}
        {sub && <div style={{ fontSize: 9, color: "#4b4566", marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div className="c-card" style={style}>{children}</div>;
}

function Tag({ children, variant = "neutral" }) {
  const colors = {
    red:    { bg: "rgba(248,113,113,.12)",  border: "rgba(248,113,113,.3)",  color: "#fca5a5" },
    green:  { bg: "rgba(52,211,153,.10)",   border: "rgba(52,211,153,.25)",  color: "#6ee7b7" },
    blue:   { bg: "rgba(129,140,248,.10)",  border: "rgba(129,140,248,.28)", color: "#a5b4fc" },
    violet: { bg: "rgba(167,139,250,.12)",  border: "rgba(167,139,250,.3)",  color: "#c4b5fd" },
    amber:  { bg: "rgba(251,146,60,.10)",   border: "rgba(251,146,60,.28)",  color: "#fdba74" },
    neutral:{ bg: "rgba(100,116,139,.12)",  border: "rgba(100,116,139,.25)", color: "#94a3b8" },
  };
  const s = colors[variant] || colors.neutral;
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 600,
      display: "inline-block", letterSpacing: "0.03em",
    }}>{children}</span>
  );
}

function Bar({ label, value, color = "#a78bfa" }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 200); return () => clearTimeout(t); }, [value]);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#7c6f9f" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ background: "#1e1b2e", borderRadius: 6, height: 6, overflow: "hidden" }}>
        <div style={{
          width: `${w}%`, height: "100%", background: color, borderRadius: 6,
          transition: "width 1s cubic-bezier(.22,1,.36,1)",
        }} />
      </div>
    </div>
  );
}

function Accordion({ title, icon, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #1e1b2e" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 0", background: "none", border: "none", cursor: "pointer", color: "#e2d9f3",
        fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{icon}</span>{title}
        </span>
        <span style={{ color: "#4b4566", fontSize: 10, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>▼</span>
      </button>
      <div style={{
        overflow: "hidden", maxHeight: open ? 800 : 0,
        transition: "max-height 0.4s cubic-bezier(.22,1,.36,1)", paddingBottom: open ? 14 : 0
      }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 16, height: 16,
      border: "2.5px solid rgba(167,139,250,.25)", borderTopColor: "#a78bfa",
      borderRadius: "50%", animation: "spin 0.75s linear infinite", flexShrink: 0,
    }} />
  );
}

export default function App() {
  const [jd, setJd] = useState("");
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.type === "application/pdf") { setFile(f); setError(""); }
    else setError("Please drop a PDF file.");
  }, []);

  const analyze = async () => {
    setError(""); setResult(null);
    if (!jd.trim()) return setError("Paste a job description first.");
    if (!file) return setError("Upload your resume as a PDF.");
    const form = new FormData();
    form.append("jobDescription", jd.trim());
    form.append("resume", file);
    setLoading(true);
    try {
      const { data } = await axios.post("https://hussain23-my-ai-backend.hf.space/api/analyze", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #09060f;
          color: #e2d9f3;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes orb     { 0%,100% { opacity:.5; } 50% { opacity:.85; } }

        .page-wrap {
          max-width: 1140px;
          margin: 0 auto;
          padding: 44px 20px 100px;
          position: relative;
          z-index: 1;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 24px;
          margin-top: 44px;
        }
        @media (max-width: 800px) { .hero-grid { grid-template-columns: 1fr; } }

        .c-card {
          background: rgba(18,13,30,.8);
          border: 1px solid rgba(60,40,90,.6);
          border-radius: 18px;
          padding: 22px;
          backdrop-filter: blur(16px);
          animation: fadeUp 0.45s ease both;
        }

        .input-field {
          width: 100%;
          background: rgba(9,6,15,.85);
          border: 1px solid rgba(60,40,90,.7);
          border-radius: 12px;
          padding: 11px 15px;
          color: #e2d9f3;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
          border-color: rgba(167,139,250,.5);
          box-shadow: 0 0 0 3px rgba(167,139,250,.07);
        }
        .input-field::placeholder { color: #2d2440; }

        .drop-zone {
          border: 1.5px dashed rgba(60,40,90,.8);
          border-radius: 16px;
          padding: 28px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.22s;
          position: relative;
          background: rgba(9,6,15,.5);
        }
        .drop-zone.active {
          border-color: #a78bfa;
          background: rgba(167,139,250,.04);
        }
        .drop-zone input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }

        .btn-analyze {
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.22s;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          box-shadow: 0 4px 20px rgba(124,58,237,.3);
          white-space: nowrap;
        }
        .btn-analyze:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(124,58,237,.45);
        }
        .btn-analyze:disabled { opacity: 0.5; cursor: not-allowed; }

        .lbl {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4b4566;
          display: block;
          margin-bottom: 7px;
        }

        .sec-title {
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #4b4566;
          margin-bottom: 14px;
        }

        .r2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .r2 { grid-template-columns: 1fr; } }

        .info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 0; border-bottom: 1px solid rgba(30,27,46,.9);
          font-size: 13px;
        }
        .info-row:last-child { border-bottom: none; }
        .info-row .k { color: #4b4566; }
        .info-row .v { color: #e2d9f3; font-weight: 600; font-family: 'JetBrains Mono', monospace; font-size: 12px; }

        .rel-Low    { color: #f87171 !important; }
        .rel-Medium { color: #fb923c !important; }
        .rel-High   { color: #6ee7b7 !important; }

        .orb-wrap {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden;
        }
        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(100px); animation: orb 5s ease-in-out infinite;
        }

        .yt-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 13px;
          background: rgba(9,6,15,.6);
          border: 1px solid rgba(60,40,90,.55);
          border-radius: 10px;
          text-decoration: none; color: #c4b5fd; font-size: 12px;
          transition: all 0.18s; margin-bottom: 7px;
        }
        .yt-link:hover {
          border-color: rgba(248,113,113,.4);
          background: rgba(248,113,113,.07);
          color: #fca5a5;
        }

        .advice-box {
          background: rgba(124,58,237,.07);
          border: 1px solid rgba(124,58,237,.2);
          border-radius: 13px;
          padding: 16px 18px 16px 38px;
          font-size: 13px; color: #9d8cbf; line-height: 1.7; font-style: italic;
          position: relative;
        }
        .advice-box::before {
          content: '"'; position: absolute; top: 2px; left: 14px;
          font-size: 48px; color: rgba(124,58,237,.25); font-family: Georgia, serif; line-height: 1;
        }

        .overall-fb {
          font-size: 13px; line-height: 1.7; color: #9d8cbf;
          padding: 13px 15px;
          background: rgba(9,6,15,.5);
          border-radius: 10px;
          border-left: 3px solid #7c3aed;
        }

        .loading-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 14px; padding: 56px 20px; text-align: center;
        }
        .spin-ring {
          width: 50px; height: 50px; border-radius: 50%;
          border: 2px solid rgba(167,139,250,.2);
          border-top-color: #a78bfa;
          animation: spin 1s linear infinite;
        }

        .str-item {
          display: flex; gap: 10px; padding: 9px 0;
          border-bottom: 1px solid rgba(30,27,46,.7);
          font-size: 13px; color: #9d8cbf; line-height: 1.5;
          align-items: flex-start;
        }
        .str-item:last-child { border-bottom: none; }

        .empty-state {
          border: 1.5px dashed rgba(40,30,60,.9);
          border-radius: 18px; padding: 56px 24px;
          text-align: center;
        }

        .err-box {
          background: rgba(248,113,113,.08);
          border: 1px solid rgba(248,113,113,.28);
          border-radius: 10px; padding: 11px 15px;
          font-size: 13px; color: #fca5a5;
        }

        .imp-card {
          background: rgba(124,58,237,.06);
          border: 1px solid rgba(124,58,237,.15);
          border-radius: 12px; padding: 12px 14px;
          font-size: 12px; color: #9d8cbf; line-height: 1.6;
        }
        .imp-num {
          color: #7c3aed; font-family: 'JetBrains Mono', monospace;
          font-size: 10px; display: block; margin-bottom: 4px;
        }
      `}</style>

      {/* bg orbs */}
      <div className="orb-wrap">
        <div className="orb" style={{ width: 560, height: 360, top: -80, left: -160, background: "rgba(124,58,237,.06)" }} />
        <div className="orb" style={{ width: 400, height: 400, top: 300, right: -120, background: "rgba(251,146,60,.04)", animationDelay: "2.5s" }} />
        <div className="orb" style={{ width: 300, height: 300, bottom: 100, left: "40%", background: "rgba(167,139,250,.03)", animationDelay: "1.2s" }} />
      </div>

      <div className="page-wrap">
        {/* Header */}
        <header style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#7c3aed", opacity: .9 }}>
            — Resume Intelligence —
          </div>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: "clamp(28px,4.5vw,50px)", fontWeight: 800, color: "#f1eaff", letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 8 }}>
            Know Your Gap
          </h1>
          <p style={{ fontSize: 14, color: "#4b4566", marginTop: 10, maxWidth: 500, margin: "10px auto 0", lineHeight: 1.65 }}>
            Drop your resume. Paste the role. Get a brutally honest breakdown — where you fit, where you fall short, and exactly what to learn next.
          </p>
        </header>

        {/* Input grid */}
        <div className="hero-grid">
          <Card>
            <div style={{ marginBottom: 18 }}>
              <label className="lbl" htmlFor="jd">Job Description</label>
              <textarea id="jd" className="input-field" rows={10} value={jd}
                onChange={e => setJd(e.target.value)} placeholder="Paste the job description — requirements, responsibilities, all of it…" />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="lbl">Resume (PDF only)</label>
              <div className={`drop-zone ${drag ? "active" : ""}`}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}>
                <input type="file" accept="application/pdf" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f?.type === "application/pdf") { setFile(f); setError(""); }
                  else if (f) setError("Only PDF files are supported.");
                }} />
                <div style={{ pointerEvents: "none" }}>
                  <div style={{
                    width: 42, height: 42, margin: "0 auto 10px",
                    background: "rgba(124,58,237,.12)", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="20" height="20" fill="none" stroke="#a78bfa" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#c4b5fd" }}>
                    {file ? file.name : "Drag & drop or click to upload"}
                  </p>
                  <p style={{ fontSize: 11, color: "#2d2440", marginTop: 3 }}>PDF only · max 10 MB</p>
                </div>
              </div>
            </div>

            {error && <div className="err-box" style={{ marginBottom: 14 }}>{error}</div>}

            <button className="btn-analyze" onClick={analyze} disabled={loading}>
              {loading ? <><Spinner />Analyzing…</> : "Run Analysis →"}
            </button>
          </Card>

          <div>
            {!loading && !result && (
              <div className="empty-state">
                <div style={{ fontSize: 34, marginBottom: 10 }}>📋</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#2d2440", fontFamily: "'Outfit',sans-serif" }}>Nothing here yet</p>
                <p style={{ fontSize: 12, color: "#1e1b2e", marginTop: 5 }}>Paste the JD, upload your resume, hit Run. Takes about 15 seconds.</p>
              </div>
            )}

            {loading && (
              <div className="loading-box c-card">
                <div className="spin-ring" />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#9d8cbf", fontFamily: "'Outfit',sans-serif" }}>Crunching your resume…</p>
                  <p style={{ fontSize: 12, color: "#2d2440", marginTop: 4 }}>Matching skills, reading between the lines, checking every keyword. Almost there.</p>
                </div>
              </div>
            )}

            {!loading && result && (
              <Card>
                <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 18 }}>
                  <Ring value={result.matchPercentage ?? 0} label={scoreLabel(result.matchPercentage)} sub="role fit" />
                  <div style={{ flex: 1 }}>
                    <Bar label="ATS Score" value={result.atsScore ?? result.matchPercentage ?? 0} color="#a78bfa" />
                    <Bar label="Keyword Match" value={
                      result.keywordMatching
                        ? Math.round((result.keywordMatching.matched?.length || 0) /
                          Math.max(1, (result.keywordMatching.matched?.length || 0) + (result.keywordMatching.missing?.length || 0)) * 100)
                        : 0
                    } color="#fb923c" />
                  </div>
                </div>
                {result.overallFeedback && <div className="overall-fb">{result.overallFeedback}</div>}
              </Card>
            )}
          </div>
        </div>

        {/* Results */}
        {result && !loading && (
          <div ref={resultsRef} style={{ marginTop: 32, animation: "fadeUp 0.5s ease both" }}>

            {/* Row 1 */}
            <div className="r2" style={{ marginBottom: 18 }}>
              {result.experienceAnalysis && (
                <Card>
                  <div className="sec-title">📊 Experience Analysis</div>
                  <div className="info-row"><span className="k">Required</span><span className="v">{result.experienceAnalysis.yearsRequired}</span></div>
                  <div className="info-row"><span className="k">Your resume</span><span className="v">{result.experienceAnalysis.yearsInResume}</span></div>
                  <div className="info-row">
                    <span className="k">Relevance</span>
                    <span className={`v rel-${result.experienceAnalysis.relevance}`}>{result.experienceAnalysis.relevance}</span>
                  </div>
                  {result.experienceAnalysis.feedback && (
                    <p style={{ fontSize: 12, color: "#4b4566", marginTop: 11, lineHeight: 1.6 }}>{result.experienceAnalysis.feedback}</p>
                  )}
                </Card>
              )}

              {result.sectionFeedback && (
                <Card>
                  <div className="sec-title">🗂 Section Feedback</div>
                  {Object.entries(result.sectionFeedback).map(([key, val]) => val && (
                    <Accordion key={key} icon="›" title={key.charAt(0).toUpperCase() + key.slice(1)}>
                      <p style={{ fontSize: 12, color: "#4b4566", lineHeight: 1.7 }}>{val}</p>
                    </Accordion>
                  ))}
                </Card>
              )}
            </div>

            {/* Keywords */}
            {result.keywordMatching && (
              <Card style={{ marginBottom: 18 }}>
                <div className="sec-title">🔑 Keyword Matching</div>
                <div className="r2">
                  <div>
                    <div style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 9, textTransform: "uppercase" }}>
                      ✓ Matched ({result.keywordMatching.matched?.length || 0})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.keywordMatching.matched?.map((kw, i) => <Tag key={i} variant="green">{kw}</Tag>)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 9, textTransform: "uppercase" }}>
                      ✗ Missing ({result.keywordMatching.missing?.length || 0})
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.keywordMatching.missing?.map((kw, i) => <Tag key={i} variant="red">{kw}</Tag>)}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Skills */}
            <div className="r2" style={{ marginBottom: 18 }}>
              {result.presentSkills?.length > 0 && (
                <Card>
                  <div className="sec-title">✅ Matching Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.presentSkills.map((s, i) => <Tag key={i} variant="green">{s}</Tag>)}
                  </div>
                </Card>
              )}
              <Card>
                <div className="sec-title">❌ Missing Skills</div>
                <div style={{ marginBottom: 11 }}>
                  <div style={{ fontSize: 10, color: "#818cf8", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Technical</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.missingTechnicalSkills?.length
                      ? result.missingTechnicalSkills.map((s, i) => <Tag key={i} variant="blue">{s}</Tag>)
                      : <Tag variant="neutral">None flagged</Tag>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Soft Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.missingSoftSkills?.length
                      ? result.missingSoftSkills.map((s, i) => <Tag key={i} variant="violet">{s}</Tag>)
                      : <Tag variant="neutral">None flagged</Tag>}
                  </div>
                </div>
              </Card>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="r2" style={{ marginBottom: 18 }}>
              {result.strengths?.length > 0 && (
                <Card>
                  <div className="sec-title">💪 Strengths</div>
                  {result.strengths.map((s, i) => (
                    <div key={i} className="str-item">
                      <span style={{ color: "#6ee7b7", marginTop: 2, flexShrink: 0 }}>▸</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </Card>
              )}
              {result.weaknesses?.length > 0 && (
                <Card>
                  <div className="sec-title">⚠️ Weaknesses</div>
                  {result.weaknesses.map((w, i) => (
                    <div key={i} className="str-item">
                      <span style={{ color: "#f87171", marginTop: 2, flexShrink: 0 }}>▸</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </Card>
              )}
            </div>

            {/* Improvement suggestions */}
            {result.improvementSuggestions?.length > 0 && (
              <Card style={{ marginBottom: 18 }}>
                <div className="sec-title">🚀 Improvement Suggestions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
                  {(Array.isArray(result.improvementSuggestions)
                    ? result.improvementSuggestions
                    : [result.improvementSuggestions]
                  ).map((tip, i) => (
                    <div key={i} className="imp-card">
                  <span className="imp-num">step {String(i + 1).padStart(2, "0")} —</span>
                      {tip}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* YouTube + Career Advice */}
            <div className="r2" style={{ marginBottom: 18 }}>
              {result.youtubeSearchTerms?.length > 0 && (
                <Card>
                  <div className="sec-title">▶ Recommended Learning</div>
                  <p style={{ fontSize: 11, color: "#2d2440", marginBottom: 13 }}>One click opens a targeted YouTube search for each gap you need to close.</p>
                  {result.youtubeSearchTerms.map((term, i) => (
                    <a key={i} href={ytUrl(term)} target="_blank" rel="noreferrer" className="yt-link">
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{term}</span>
                      <span style={{ fontSize: 9, color: "#2d2440", flexShrink: 0, marginLeft: 8, fontFamily: "'JetBrains Mono',monospace" }}>YouTube →</span>
                    </a>
                  ))}
                </Card>
              )}
              {result.careerAdvice && (
                <Card>
                  <div className="sec-title">🎯 Career Advice</div>
                  <div className="advice-box">{result.careerAdvice}</div>
                </Card>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
