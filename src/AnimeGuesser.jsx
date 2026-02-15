import { useState, useEffect, useCallback, useRef } from "react";

const ANIME_DB = [
  { mal: 44511, title: "Chainsaw Man", accept: ["chainsaw man", "chainsawman", "csm"] },
  { mal: 40748, title: "Jujutsu Kaisen", accept: ["jujutsu kaisen", "jjk"] },
  { mal: 54856, title: "Blue Lock", accept: ["blue lock", "bluelock"] },
  { mal: 41467, title: "Bleach: TYBW", accept: ["bleach"] },
  { mal: 56214, title: "Kaiju No. 8", accept: ["kaiju no 8", "kaiju no. 8", "kaiju no.8", "kaiju 8", "kaiju no8"] },
  { mal: 58567, title: "Sakamoto Days", accept: ["sakamoto days", "sakamoto"] },
  { mal: 21, title: "One Piece", accept: ["one piece", "onepiece"] },
  { mal: 16498, title: "Attack on Titan", accept: ["attack on titan", "aot", "shingeki no kyojin", "snk"] },
  { mal: 11061, title: "Hunter x Hunter", accept: ["hunter x hunter", "hxh", "hunter hunter"] },
  { mal: 20, title: "Naruto", accept: ["naruto"] },
  { mal: 38000, title: "Demon Slayer", accept: ["demon slayer", "kimetsu no yaiba", "kny"] },
  { mal: 30276, title: "One Punch Man", accept: ["one punch man", "opm"] },
];

const NUM_ROUNDS = 10;
const TIMER = 60, COLS = 6, ROWS = 4, TOTAL = COLS * ROWS;

async function fetchJikanPics(malId) {
  try {
    const r = await fetch(`https://api.jikan.moe/v4/anime/${malId}/pictures`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data || []).map(p => p.jpg?.large_image_url || p.jpg?.image_url).filter(Boolean);
  } catch { return []; }
}

async function loadAllImages(onProgress) {
  const pool = [];
  for (let i = 0; i < ANIME_DB.length; i++) {
    const a = ANIME_DB[i];
    if (i > 0) await new Promise(r => setTimeout(r, 400));
    const urls = await fetchJikanPics(a.mal);
    for (const url of urls) pool.push({ image: url, accept: a.accept, hint: a.title });
    onProgress(Math.round(((i + 1) / ANIME_DB.length) * 100));
  }
  return pool;
}

function buildRoundsFromPool(pool) {
  if (pool.length < NUM_ROUNDS) return null;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const rounds = [];
  const usedImages = new Set();
  const titleCount = {};
  for (const r of shuffled) {
    if (rounds.length >= NUM_ROUNDS) break;
    if (usedImages.has(r.image)) continue;
    const c = titleCount[r.hint] || 0;
    if (c >= 2) continue;
    rounds.push(r);
    usedImages.add(r.image);
    titleCount[r.hint] = c + 1;
  }
  if (rounds.length < NUM_ROUNDS) {
    for (const r of shuffled) {
      if (rounds.length >= NUM_ROUNDS) break;
      if (usedImages.has(r.image)) continue;
      rounds.push(r);
      usedImages.add(r.image);
    }
  }
  return rounds.slice(0, NUM_ROUNDS);
}

const WRONG = [
  g => `"${g}"? Filler arc answer`,
  () => `Not quite~ try again senpai`,
  g => `"${g}" has left the chat`,
  () => `Needs more training arc`,
  g => `Plot twist: not "${g}"`,
  () => `That got isekai'd away`,
  g => `"${g}"... nani?!`,
  () => `Close but no dango`,
];

function calcScore(t, tiles) {
  return Math.max(10, Math.round(Math.round(1000 - (tiles / TOTAL) * 900) * (t / TIMER)));
}

function getRank(p) {
  if (p >= 90) return { t: "ANIME GOD", e: "⚡", c: "#fbbf24", g: "linear-gradient(135deg,#fbbf24,#f59e0b)" };
  if (p >= 70) return { t: "OTAKU KING", e: "👑", c: "#a78bfa", g: "linear-gradient(135deg,#a78bfa,#7c6cf0)" };
  if (p >= 50) return { t: "WEEB WARRIOR", e: "⚔️", c: "#34d399", g: "linear-gradient(135deg,#34d399,#10b981)" };
  if (p >= 30) return { t: "CASUAL FAN", e: "🌟", c: "#38bdf8", g: "linear-gradient(135deg,#38bdf8,#0ea5e9)" };
  return { t: "NORMIE", e: "😶‍🌫️", c: "#fb7185", g: "linear-gradient(135deg,#fb7185,#f43f5e)" };
}

const speedLabel = t => t > 45 ? "⚡ LIGHTNING" : t > 30 ? "🚀 FAST" : t > 15 ? "👍 SOLID" : "🐢 SLOW";

const Q_CHARS = Array.from({length: 100}, () => "?").join("  ");

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#09090d;--s1:#111116;--s2:#1a1a21;
  --b:rgba(255,255,255,0.05);--b2:rgba(255,255,255,0.08);
  --t:#ededf0;--t2:#8585a0;--t3:#4a4a60;
  --ac:#7c6cf0;--ac2:#a78bfa;--acg:rgba(124,108,240,0.12);
  --g:#4ade80;--gg:rgba(74,222,128,0.12);
  --r:#fb7185;--rg:rgba(251,113,133,0.1);
  --am:#fbbf24;
}
.R{font-family:'Nunito',sans-serif;min-height:100vh;background:var(--bg);color:var(--t);position:relative;overflow-x:hidden}
.amb{position:fixed;pointer-events:none;border-radius:50%}
.amb1{top:-40vh;left:-20vw;width:70vw;height:70vw;background:radial-gradient(circle,rgba(124,108,240,0.06),transparent 65%);animation:drift 14s ease-in-out infinite alternate}
.amb2{bottom:-30vh;right:-20vw;width:60vw;height:60vw;background:radial-gradient(circle,rgba(251,113,133,0.04),transparent 65%);animation:drift 18s ease-in-out infinite alternate-reverse}

.S{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;position:relative;z-index:1}
.P{justify-content:flex-start;padding:12px 12px 24px}

.qbg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.qbg-txt{
  position:absolute;inset:-30px;
  font-family:'Outfit',sans-serif;font-size:30px;font-weight:900;
  line-height:1.8;letter-spacing:0.4em;word-spacing:0.3em;
  color:rgba(255,255,255,0.028);
  white-space:pre-wrap;word-break:break-all;
}
.qbg-mask{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 55% 45% at 50% 50%,transparent 30%,var(--bg) 70%);
}
.qbg-sheen{
  position:absolute;inset:0;
  background:linear-gradient(115deg,transparent 20%,rgba(124,108,240,0.05) 35%,rgba(167,139,250,0.08) 50%,rgba(124,108,240,0.05) 65%,transparent 80%);
  background-size:300% 300%;
  animation:sheen 7s ease-in-out infinite;
}

.s-z{position:relative;z-index:2}
.s-icon{width:76px;height:76px;border-radius:22px;background:linear-gradient(135deg,var(--ac),#fb7185);display:flex;align-items:center;justify-content:center;font-size:38px;margin-bottom:16px;box-shadow:0 8px 32px var(--acg)}
.s-t{font-family:'Outfit',sans-serif;font-size:32px;font-weight:900;letter-spacing:-0.04em;color:#fff;margin-bottom:6px}
.s-t span{background:linear-gradient(135deg,var(--ac2),#fb7185);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.s-sub{color:var(--t2);font-size:14px;line-height:1.6;text-align:center;max-width:280px;margin-bottom:16px}
.s-stats{display:flex;gap:6px;margin-bottom:24px}
.s-stat{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 16px;border-radius:14px;background:var(--s1);border:1px solid var(--b)}
.s-stat-v{font-family:'Outfit',sans-serif;font-size:20px;font-weight:900;color:#fff}
.s-stat-l{font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.08em}
.s-rules{display:flex;flex-direction:column;gap:6px;width:100%;max-width:300px;margin-bottom:28px}
.s-rule{display:flex;align-items:center;gap:10px;padding:8px 14px;border-radius:10px;background:var(--s1);border:1px solid var(--b);font-size:13px;color:var(--t2);font-weight:600}
.s-rule-n{width:22px;height:22px;border-radius:7px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-size:11px;font-weight:800;color:var(--ac2);flex-shrink:0}
.s-api{font-size:11px;color:var(--t3);margin-top:12px;font-weight:600}

.btn{font-family:'Outfit',sans-serif;font-weight:700;cursor:pointer;border:none;border-radius:14px;transition:all 0.2s;position:relative;overflow:hidden}
.btn-go{padding:16px 56px;font-size:17px;color:#fff;background:linear-gradient(135deg,#7c6cf0,#9b6cf0);box-shadow:0 6px 28px var(--acg)}
.btn-go::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%);animation:btnShine 2.5s ease-in-out infinite}
.btn-go:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(124,108,240,0.3)}
.btn-go:active{transform:translateY(0) scale(0.97)}
.btn-nxt{width:100%;padding:15px 0;font-size:16px;color:#fff;background:linear-gradient(135deg,#7c6cf0,#9b6cf0);box-shadow:0 4px 20px var(--acg)}
.btn-gs{padding:13px 28px;font-size:15px;color:#fff;background:var(--ac);box-shadow:0 2px 12px var(--acg);border-radius:14px}

.H{width:100%;max-width:560px;margin-bottom:8px}
.H-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.H-l{display:flex;align-items:center;gap:8px}
.rnd{padding:3px 10px;border-radius:7px;background:var(--s2);border:1px solid var(--b);font-family:'Outfit',sans-serif;font-size:12px;font-weight:700;color:var(--t2)}
.dots{display:flex;gap:4px;align-items:center}
.dot{width:7px;height:7px;border-radius:50%;transition:all 0.3s}
.H-sc{display:flex;align-items:center;gap:4px}
.H-sc-l{font-size:10px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:0.08em}
.H-sc-n{font-family:'Outfit',sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.02em;min-width:40px;text-align:right}
.strk{display:flex;align-items:center;gap:4px;padding:3px 10px;border-radius:7px;font-size:11px;font-weight:800;animation:popIn 0.3s ease;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.2);color:var(--am)}

.Tw{position:relative;width:100%;height:5px;border-radius:5px;background:var(--s2);overflow:visible}
.Tf{height:100%;border-radius:5px;transition:width 1s linear,background 0.5s}
.Tg{position:absolute;top:-3px;height:11px;border-radius:5px;filter:blur(6px);opacity:0.4;transition:width 1s linear,background 0.5s}
.Tm{display:flex;justify-content:space-between;margin-top:5px}
.Ts{font-family:'Outfit',sans-serif;font-size:13px;font-weight:800}
.Ti{font-size:11px;color:var(--t3);font-weight:600}
.Ti em{font-style:normal;font-weight:800}

.B{width:100%;max-width:560px;aspect-ratio:16/10;position:relative;border-radius:16px;overflow:hidden;background:var(--s1);box-shadow:0 16px 56px rgba(0,0,0,0.7),0 0 0 1px var(--b);transition:box-shadow 0.6s}
.B.gg{box-shadow:0 0 50px var(--gg),0 0 0 1.5px rgba(74,222,128,0.25),0 16px 56px rgba(0,0,0,0.5)}
.B.gr{box-shadow:0 0 50px var(--rg),0 0 0 1.5px rgba(251,113,133,0.2),0 16px 56px rgba(0,0,0,0.5)}
.B img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;visibility:hidden}
.B.vis img{visibility:visible}
.G{position:absolute;inset:0;z-index:1;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(4,1fr)}
.tile{display:flex;align-items:center;justify-content:center;user-select:none;cursor:pointer;background:var(--s1);border:1px solid rgba(255,255,255,0.025);transition:all 0.35s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden}
.tile::before{content:'';position:absolute;inset:0;background:linear-gradient(150deg,rgba(255,255,255,0.035),transparent 50%);pointer-events:none}
.tile:hover:not(.X){background:var(--s2);border-color:var(--b2);transform:scale(0.94)}
.tile:hover:not(.X) .tn{color:rgba(255,255,255,0.45)}
.tile:active:not(.X){transform:scale(0.82);transition:transform 0.08s}
.tile.X{opacity:0;transform:scale(0.5) rotateY(90deg);pointer-events:none;background:transparent;border-color:transparent}
.tn{font-family:'Outfit',sans-serif;font-size:11px;font-weight:800;color:rgba(255,255,255,0.22);position:relative;z-index:1;transition:color 0.15s}

.res{width:100%;max-width:560px;text-align:center;padding:14px 0 4px;animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.res-e{font-size:36px;margin-bottom:2px}
.res-l{font-family:'Outfit',sans-serif;font-size:18px;font-weight:800}
.res-p{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:var(--am);margin-top:2px}
.res-sp{display:inline-block;padding:3px 10px;border-radius:6px;background:var(--s2);border:1px solid var(--b);font-size:11px;font-weight:700;color:var(--t2);margin-top:6px}
.res-miss{font-size:14px;color:var(--t2);margin-top:4px}
.res-miss strong{color:#fff;font-weight:700}

.I{width:100%;max-width:560px;margin-top:12px}
.Ir{display:flex;gap:8px}
.inp{flex:1;padding:13px 18px;border-radius:14px;font-size:15px;font-weight:600;color:#fff;background:var(--s2);border:1.5px solid var(--b);outline:none;caret-color:var(--ac);font-family:'Nunito',sans-serif;transition:border 0.2s,box-shadow 0.2s}
.inp:focus{border-color:rgba(124,108,240,0.4);box-shadow:0 0 0 3px var(--acg)}
.inp.er{border-color:rgba(251,113,133,0.4);box-shadow:0 0 0 3px var(--rg)}
.inp::placeholder{color:var(--t3);font-weight:500}
.wt{text-align:center;margin-top:10px;padding:8px 16px;border-radius:10px;background:var(--rg);border:1px solid rgba(251,113,133,0.12);color:#fda4af;font-size:13px;font-weight:600;animation:popIn 0.25s ease}
.ht{text-align:center;font-size:11px;color:var(--t3);margin-top:10px;font-weight:500}

.Fe{font-size:60px;animation:pulse 2s ease infinite}
.Frk{font-family:'Outfit',sans-serif;font-size:13px;font-weight:900;letter-spacing:0.12em;padding:4px 14px;border-radius:8px;display:inline-block}
.Fsc{font-family:'Outfit',sans-serif;font-size:80px;font-weight:900;color:#fff;letter-spacing:-0.06em;line-height:1;margin:6px 0 2px}
.Fb{width:100%;max-width:400px;height:8px;border-radius:8px;background:var(--s2);margin:12px 0;overflow:hidden}
.Fbf{height:100%;border-radius:8px;transition:width 1.5s cubic-bezier(0.4,0,0.2,1)}
.Fsub{color:var(--t2);font-size:13px;font-weight:600;margin-bottom:20px}
.Fgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;width:100%;max-width:400px;margin-bottom:8px}
.Fc{aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;position:relative}
.Fcs{position:absolute;bottom:3px;font-family:'Outfit',sans-serif;font-size:9px;font-weight:800}
.Frows{width:100%;max-width:400px}
.Fr{display:flex;align-items:center;padding:8px 14px;border-radius:10px;background:var(--s1);border:1px solid var(--b);font-size:13px}
.Fr+.Fr{margin-top:4px}
.Frn{color:var(--t3);font-weight:700;width:44px;font-size:11px}
.Fnm{color:var(--t);font-weight:600;flex:1;text-align:center}
.Fpt{font-weight:800;width:56px;text-align:right;font-size:13px}

@keyframes drift{from{transform:translate(0,0)}to{transform:translate(25px,-15px)}}
@keyframes popIn{from{opacity:0;transform:translateY(10px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
@keyframes countPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes sheen{0%,100%{background-position:100% 100%}50%{background-position:0% 0%}}
@keyframes btnShine{0%,100%{left:-100%}40%{left:120%}41%{left:-100%}}

.btn-giveup{display:flex;align-items:center;gap:6px;padding:10px 18px;font-size:13px;color:var(--t2);background:var(--s2);border:1px solid var(--b);border-radius:12px;cursor:pointer;transition:all 0.2s;font-family:'Outfit',sans-serif;font-weight:700}
.btn-giveup:hover{color:var(--r);background:var(--rg);border-color:rgba(251,113,133,0.2)}
.btn-giveup:active{transform:scale(0.95)}
.btn-giveup svg{width:16px;height:16px;flex-shrink:0}

@media(max-width:640px){
  .S{padding:14px 10px}
  .P{padding:8px 8px 16px}
  .s-icon{width:60px;height:60px;border-radius:18px;font-size:30px;margin-bottom:12px}
  .s-t{font-size:24px}
  .s-sub{font-size:13px;max-width:260px;margin-bottom:12px}
  .s-stats{gap:4px;margin-bottom:18px}
  .s-stat{padding:8px 12px;border-radius:12px}
  .s-stat-v{font-size:17px}
  .s-stat-l{font-size:9px}
  .s-rules{gap:5px;max-width:100%;margin-bottom:20px}
  .s-rule{padding:7px 12px;font-size:12px;gap:8px}
  .btn-go{padding:14px 44px;font-size:15px;border-radius:12px}

  .H{max-width:100%;margin-bottom:6px}
  .H-top{flex-wrap:wrap;gap:6px}
  .H-l{gap:6px}
  .rnd{font-size:11px;padding:2px 8px}
  .dots .dot{width:5px;height:5px}
  .H-sc-n{font-size:18px;min-width:32px}
  .strk{font-size:10px;padding:2px 8px}
  .Ts{font-size:12px}
  .Ti{font-size:10px}

  .B{max-width:100%;border-radius:12px;aspect-ratio:16/10}
  .tile .tn{font-size:9px}

  .res{padding:10px 0 2px}
  .res-e{font-size:28px}
  .res-l{font-size:15px}
  .res-p{font-size:13px}

  .I{max-width:100%;margin-top:8px}
  .Ir{gap:6px}
  .inp{padding:11px 14px;font-size:14px;border-radius:12px}
  .btn-gs{padding:11px 20px;font-size:14px;border-radius:12px}
  .btn-nxt{padding:13px 0;font-size:15px;border-radius:12px}
  .btn-giveup{padding:8px 14px;font-size:12px;border-radius:10px}
  .ht{font-size:10px;margin-top:8px}
  .wt{font-size:12px;padding:6px 12px}

  .Fe{font-size:44px}
  .Fsc{font-size:56px}
  .Frk{font-size:11px;padding:3px 12px}
  .Fb{max-width:100%;height:6px;margin:10px 0}
  .Fsub{font-size:12px;margin-bottom:14px}
  .Fgrid{max-width:100%;gap:3px}
  .Fc{border-radius:8px;font-size:15px}
  .Fcs{font-size:8px}
  .Frows{max-width:100%}
  .Fr{padding:7px 10px;font-size:12px;border-radius:8px}
  .Frn{width:36px;font-size:10px}
  .Fpt{width:48px;font-size:12px}
}

@media(max-width:380px){
  .s-t{font-size:20px}
  .s-sub{font-size:12px}
  .s-stat{padding:6px 10px}
  .s-stat-v{font-size:15px}
  .btn-go{padding:12px 36px;font-size:14px}
  .B{aspect-ratio:4/3;border-radius:10px}
  .Fsc{font-size:44px}
  .Fgrid{grid-template-columns:repeat(5,1fr)}
  .dots .dot{width:4px;height:4px}
  .H-sc-n{font-size:16px}
}
`;

export default function AnimeGuesser() {
  const [screen, setScreen] = useState("start");
  const [rounds, setRounds] = useState(null);
  const [round, setRound] = useState(0);
  const [revealed, setRevealed] = useState(new Set());
  const [guess, setGuess] = useState("");
  const [time, setTime] = useState(TIMER);
  const [total, setTotal] = useState(0);
  const [rScore, setRScore] = useState(0);
  const [result, setResult] = useState(null);
  const [results, setResults] = useState([]);
  const [wrongMsg, setWrongMsg] = useState("");
  const [streak, setStreak] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const [floats, setFloats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prog, setProg] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const fid = useRef(0);

  const initRound = useCallback(() => {
    setRevealed(new Set()); setGuess(""); setTime(TIMER);
    setResult(null); setRScore(0); setWrongMsg(""); setFloats([]);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
    }, 1000);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const [loadMsg, setLoadMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  const startGame = async () => {
    setRound(0); setTotal(0); setResults([]); setStreak(0); setShowBar(false);
    setLoading(true); setProg(0); setLoadMsg("Fetching anime images..."); setLoadError("");
    const pool = await loadAllImages((p) => {
      setProg(Math.min(p, 100));
      if (p < 40) setLoadMsg("Fetching anime images...");
      else if (p < 80) setLoadMsg("Almost there...");
      else setLoadMsg("Building rounds...");
    });
    if (pool.length === 0) {
      setLoadError("Failed to fetch images. Check your internet connection and try again.");
      setLoading(false);
      return;
    }
    const r = buildRoundsFromPool(pool);
    if (!r) {
      setLoadError(`Only got ${pool.length} images. Need at least ${NUM_ROUNDS}. Try again.`);
      setLoading(false);
      return;
    }
    setRounds(r);
    setLoading(false);
    setScreen("playing");
    initRound();
  };

  useEffect(() => { if (time === 0 && screen === "playing" && !result) endRound(false, 0); }, [time, screen, result]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const addFloat = (text, color) => {
    const id = ++fid.current;
    setFloats(p => [...p, { id, text, color, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 1200);
  };

  const endRound = (correct, sc, surrendered = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const r = { correct, score: sc, answer: rounds[round].hint, surrendered };
    setResult(r); setRScore(sc);
    if (correct) { setTotal(p => p + sc); setStreak(p => p + 1); addFloat(`+${sc}`, "var(--am)"); }
    else setStreak(0);
    setResults(p => [...p, r]);
    setRevealed(new Set(Array.from({ length: TOTAL }, (_, i) => i)));
  };

  const handleGiveUp = () => {
    if (result || !rounds) return;
    endRound(false, 0, true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || result || !rounds) return;
    const n = guess.trim().toLowerCase();
    if (rounds[round].accept.some(a => n === a)) endRound(true, calcScore(time, revealed.size));
    else {
      setWrongMsg(WRONG[Math.floor(Math.random() * WRONG.length)](guess.trim()));
      setTimeout(() => setWrongMsg(""), 2500);
      setGuess("");
    }
  };

  const nextRound = () => {
    if (round < rounds.length - 1) { setRound(r => r + 1); initRound(); }
    else { setScreen("results"); setTimeout(() => setShowBar(true), 400); }
  };

  const pct = (time / TIMER) * 100;
  const tc = time > 40 ? "var(--g)" : time > 15 ? "var(--am)" : "var(--r)";
  const maxPts = rounds ? Math.round(1000 - (revealed.size / TOTAL) * 900) : 1000;

  // ===== START / LOADING =====
  if (screen === "start") return (
    <div className="R"><style>{CSS}</style>
      <div className="amb amb1"/><div className="amb amb2"/>
      <div className="S">
        <div className="qbg">
          <div className="qbg-txt">{Q_CHARS}</div>
          <div className="qbg-mask"/>
          <div className="qbg-sheen"/>
        </div>
        {loading ? (
          <div className="s-z" style={{textAlign:"center"}}>
            <div style={{width:44,height:44,border:"3px solid var(--s2)",borderTopColor:"var(--ac)",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
            <div style={{fontSize:15,color:"var(--t)",fontWeight:700,marginBottom:4}}>{loadMsg}</div>
            <div style={{fontSize:12,color:"var(--t3)",marginBottom:12}}>{prog}%</div>
            <div style={{width:220,height:5,borderRadius:5,background:"var(--s2)",margin:"0 auto",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:5,background:"linear-gradient(90deg,var(--ac),#fb7185)",transition:"width 0.4s",width:`${prog}%`}}/>
            </div>
          </div>
        ) : loadError ? (
          <div className="s-z" style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>😵</div>
            <div style={{fontSize:15,color:"var(--r)",fontWeight:700,marginBottom:8}}>{loadError}</div>
            <button className="btn btn-go" onClick={startGame}>Retry</button>
          </div>
        ) : (<>
          <div className="s-icon s-z">{"🎬"}</div>
          <h1 className="s-t s-z">Guess the <span>Anime</span></h1>
          <p className="s-sub s-z">Reveal tiles from hidden anime images and name the anime before time runs out.</p>
          <div className="s-stats s-z">
            <div className="s-stat"><span className="s-stat-v">{NUM_ROUNDS}</span><span className="s-stat-l">Rounds</span></div>
            <div className="s-stat"><span className="s-stat-v">{TIMER}s</span><span className="s-stat-l">Per Round</span></div>
            <div className="s-stat"><span className="s-stat-v">1K</span><span className="s-stat-l">Max Pts</span></div>
          </div>
          <div className="s-rules s-z">
            <div className="s-rule"><span className="s-rule-n">1</span>Click tiles to peek at the image</div>
            <div className="s-rule"><span className="s-rule-n">2</span>Type the anime name and guess</div>
            <div className="s-rule"><span className="s-rule-n">3</span>Fewer tiles + faster = more points</div>
          </div>
          <button className="btn btn-go s-z" onClick={startGame}>Start Game</button>
          <p className="s-api s-z">{ANIME_DB.length} anime · Images from MyAnimeList</p>
        </>)}
      </div>
    </div>
  );

  // ===== RESULTS =====
  if (screen === "results") {
    const max = rounds.length * 1000;
    const p = Math.round((total / max) * 100);
    const ct = results.filter(r => r.correct).length;
    const rk = getRank(p);
    return (
      <div className="R"><style>{CSS}</style>
        <div className="amb amb1"/><div className="amb amb2"/>
        <div className="S">
          <div className="Fe">{rk.e}</div>
          <div className="Frk" style={{background:rk.g+"22",color:rk.c,border:`1px solid ${rk.c}33`}}>{rk.t}</div>
          <div className="Fsc">{total}</div>
          <div className="Fb"><div className="Fbf" style={{width:showBar?`${p}%`:"0%",background:rk.g}}/></div>
          <p className="Fsub">{ct}/{rounds.length} correct &mdash; {p}% accuracy</p>
          <div className="Fgrid">
            {results.map((r,i)=>(
              <div key={i} className="Fc" style={{background:r.correct?"var(--gg)":"var(--rg)",border:`1px solid ${r.correct?"rgba(74,222,128,0.2)":"rgba(251,113,133,0.15)"}`}}>
                <span>{r.correct?"✔️":"❌"}</span>
                <span className="Fcs" style={{color:r.correct?"var(--g)":"var(--r)"}}>{r.correct?r.score:0}</span>
              </div>
            ))}
          </div>
          <div className="Frows">
            {results.map((r,i)=>(
              <div key={i} className="Fr">
                <span className="Frn">R{i+1}</span>
                <span className="Fnm">{r.answer}</span>
                <span className="Fpt" style={{color:r.correct?"var(--g)":"var(--r)"}}>{r.correct?`+${r.score}`:"✗"}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-go" style={{marginTop:24}} onClick={startGame}>Play Again</button>
        </div>
      </div>
    );
  }

  // ===== PLAYING =====
  if (!rounds) return null;
  const rd = rounds[round];
  const bc = `B ${revealed.size > 0 ? "vis" : ""} ${result ? (result.correct ? "gg" : "gr") : ""}`;

  return (
    <div className="R"><style>{CSS}</style>
      <div className="amb amb1"/><div className="amb amb2"/>
      <div className="S P">
        <div className="H">
          <div className="H-top">
            <div className="H-l">
              <div className="rnd">R{round+1}/{rounds.length}</div>
              <div className="dots">
                {rounds.map((_,i)=>(
                  <div key={i} className="dot" style={{
                    background:i<round?(results[i]?.correct?"var(--g)":"var(--r)"):i===round?"var(--ac)":"var(--s2)",
                    boxShadow:i===round?"0 0 8px var(--acg)":"none"
                  }}/>
                ))}
              </div>
              {streak>=2&&<div className="strk">{"🔥"} {streak}x streak</div>}
            </div>
            <div className="H-sc">
              <span className="H-sc-l">Score</span>
              <span className="H-sc-n">{total}</span>
            </div>
          </div>
          <div className="Tw">
            <div className="Tf" style={{width:`${pct}%`,background:tc}}/>
            <div className="Tg" style={{width:`${pct}%`,background:tc}}/>
          </div>
          <div className="Tm">
            <span className="Ts" style={{color:tc}}>{time}s</span>
            <span className="Ti">{revealed.size}/{TOTAL} tiles · max <em style={{color:"var(--ac2)"}}>{maxPts}</em> pts</span>
          </div>
        </div>

        <div className={bc} style={{position:"relative"}}>
          <img src={rd.image} alt=""/>
          <div className="G">
            {Array.from({length:TOTAL},(_,i)=>(
              <div key={i} className={`tile ${revealed.has(i)?"X":""}`}
                onClick={()=>!revealed.has(i)&&!result&&setRevealed(p=>new Set(p).add(i))}>
                {!revealed.has(i)&&<span className="tn">{i+1}</span>}
              </div>
            ))}
          </div>
          {floats.map(f=>(
            <div key={f.id} style={{
              position:"absolute",left:`${f.x}%`,top:"40%",zIndex:10,
              fontFamily:"'Outfit',sans-serif",fontSize:28,fontWeight:900,
              color:f.color,textShadow:"0 2px 12px rgba(0,0,0,0.5)",
              animation:"countPop 0.6s ease forwards",pointerEvents:"none"
            }}>{f.text}</div>
          ))}
        </div>

        {result&&(
          <div className="res">
            {result.correct?(<>
              <div className="res-e">{rScore>=800?"🔥":rScore>=500?"✨":"✅"}</div>
              <div className="res-l" style={{color:"var(--g)"}}>Correct!</div>
              <div className="res-p" style={{animation:"countPop 0.5s ease"}}>+{rScore} pts</div>
              <div className="res-sp">{speedLabel(time)}</div>
            </>):(<>
              <div className="res-e">{result.surrendered?"🏳️":time===0?"⏰":"🙅"}</div>
              <div className="res-l" style={{color:"var(--r)"}}>{result.surrendered?"Surrendered!":time===0?"Time's up!":"Nope!"}</div>
              <div className="res-miss">It was <strong>{rd.hint}</strong></div>
            </>)}
          </div>
        )}

        <div className="I">
          {!result?(<>
            <form className="Ir" onSubmit={handleSubmit}>
              <input ref={inputRef} type="text" value={guess} onChange={e=>setGuess(e.target.value)}
                placeholder="Type the anime name..." autoComplete="off" className={`inp ${wrongMsg?"er":""}`}/>
              <button type="submit" className="btn btn-gs">Guess</button>
              <button type="button" className="btn-giveup" onClick={handleGiveUp} title="Give up">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </button>
            </form>
            {wrongMsg&&<div className="wt">{wrongMsg}</div>}
            <p className="ht">Click tiles to reveal · Type your answer · Unlimited guesses</p>
          </>):(
            <button className="btn btn-nxt" onClick={nextRound}>
              {round<rounds.length-1?"Next Round →":"See Results →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
