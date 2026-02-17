import { useState, useEffect, useCallback, useRef } from "react";

// Anime-only: all entries are MAL anime IDs (TV/movie). Primary image from main anime endpoint (cover); supplemented by /pictures for variety.
const ANIME_DB = [
  { mal: 49596, title: "Blue Lock", accept: ["blue lock", "bluelock", "bllk"] },
  { mal: 40748, title: "Jujutsu Kaisen", accept: ["jujutsu kaisen", "jjk"] },
  { mal: 44511, title: "Chainsaw Man", accept: ["chainsaw man", "chainsawman", "csm"] },
  { mal: 58939, title: "Sakamoto Days", accept: ["sakamoto days", "sakamoto", "skdy"] },
  { mal: 41467, title: "Bleach", accept: ["bleach"] },
  { mal: 20583, title: "Haikyu!!", accept: ["haikyu", "haikyuu", "haikyu!!"] },
  { mal: 58811, title: "Tougen Anki", accept: ["tougen anki", "tougenanki"] },
  { mal: 38000, title: "Demon Slayer", accept: ["demon slayer", "kimetsu no yaiba", "kny"] },
  { mal: 52588, title: "Kaiju No. 8", accept: ["kaiju no 8", "kaiju no. 8", "kaiju no.8", "kaiju 8", "kaiju no8"] },
  { mal: 31964, title: "My Hero Academia", accept: ["my hero academia", "bnha", "boku no hero academia", "mha"] },
  { mal: 20, title: "Naruto", accept: ["naruto", "nrt"] },
  { mal: 21, title: "One Piece", accept: ["one piece", "onepiece", "op"] },
  { mal: 16498, title: "Attack on Titan", accept: ["attack on titan", "shingeki no kyojin", "aot", "snk"] },
];

const NUM_ROUNDS = 10;
const TIMER = 60, COLS = 6, ROWS = 4, TOTAL = COLS * ROWS;
const LOADING_IMAGES = ['/loading/1.jpg', '/loading/2.jpg', '/loading/3.jpg', '/loading/4.jpg'];

async function fetchJikanPics(malId) {
  try {
    const images = [];

    // 1. Get main anime data — trailer thumbnail is always an anime screenshot
    const animeRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    if (!animeRes.ok) return [];
    const animeData = await animeRes.json();

    // Main cover image (anime key visual)
    if (animeData.data?.images?.jpg?.large_image_url) {
      images.push(animeData.data.images.jpg.large_image_url);
    }

    // Trailer thumbnail — always an actual anime frame/screenshot
    if (animeData.data?.trailer?.images?.maximum_image_url) {
      images.push(animeData.data.trailer.images.maximum_image_url);
    } else if (animeData.data?.trailer?.images?.large_image_url) {
      images.push(animeData.data.trailer.images.large_image_url);
    }

    // 2. Get episode thumbnails — actual anime screenshots
    await new Promise(r => setTimeout(r, 500));
    const epRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/videos/episodes`);
    if (epRes.ok) {
      const epData = await epRes.json();
      const epList = epData.data || [];
      for (const ep of epList.slice(0, 8)) {
        if (ep.images?.jpg?.image_url) images.push(ep.images.jpg.image_url);
      }
    }

    // 3. Get staff/promotional videos — thumbnails are anime frames
    await new Promise(r => setTimeout(r, 500));
    const vidRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/videos`);
    if (vidRes.ok) {
      const vidData = await vidRes.json();
      const promos = vidData.data?.promo || [];
      for (const p of promos) {
        if (p.trailer?.images?.maximum_image_url) {
          images.push(p.trailer.images.maximum_image_url);
        } else if (p.trailer?.images?.large_image_url) {
          images.push(p.trailer.images.large_image_url);
        }
      }
      const episodes = vidData.data?.episodes || [];
      for (const ep of episodes.slice(0, 8)) {
        if (ep.images?.jpg?.image_url) images.push(ep.images.jpg.image_url);
      }
    }

    // Fallback: pictures for variety (appended last so video thumbnails are prioritized)
    await new Promise(r => setTimeout(r, 500));
    const picRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/pictures`);
    if (picRes.ok) {
      const picData = await picRes.json();
      const pics = (picData.data || [])
        .map(p => p.jpg?.large_image_url || p.jpg?.image_url)
        .filter(Boolean);
      images.push(...pics);
    }

    return [...new Set(images)];
  } catch { return []; }
}

function preloadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function loadAllImages(onProgress, onImageFetched) {
  const pool = [];
  const totalAnime = ANIME_DB.length;
  const batchSize = 2;

  for (let i = 0; i < totalAnime; i += batchSize) {
    const batch = ANIME_DB.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(a => fetchJikanPics(a.mal).catch(() => []))
    );

    results.forEach((urls, j) => {
      const a = batch[j];
      for (const url of urls) {
        pool.push({ image: url, accept: a.accept, hint: a.title });
        if (onImageFetched) onImageFetched(url);
      }
    });

    const progress = Math.round(((i + batchSize) / totalAnime) * 85);
    onProgress(Math.min(progress, 85));

    if (i + batchSize < totalAnime) {
      await new Promise(r => setTimeout(r, 600));
    }
  }

  onProgress(90);
  return pool;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRoundsFromPool(pool, avoidTitles = []) {
  if (pool.length < NUM_ROUNDS) return null;

  const shuffled = shuffle(pool);
  const rounds = [];
  const titleCount = {};
  const usedImages = new Set();
  const avoidSet = new Set(avoidTitles);

  // Pass 1: Pick unique anime that weren't in the last game
  for (const r of shuffled) {
    if (rounds.length >= NUM_ROUNDS) break;
    if (usedImages.has(r.image)) continue;
    if (titleCount[r.hint]) continue;
    if (avoidSet.has(r.hint)) continue;
    rounds.push(r);
    usedImages.add(r.image);
    titleCount[r.hint] = 1;
  }

  // Pass 2: If not enough, allow anime from last game but still unique titles
  if (rounds.length < NUM_ROUNDS) {
    for (const r of shuffled) {
      if (rounds.length >= NUM_ROUNDS) break;
      if (usedImages.has(r.image)) continue;
      if (titleCount[r.hint]) continue;
      rounds.push(r);
      usedImages.add(r.image);
      titleCount[r.hint] = 1;
    }
  }

  // Pass 3: If still not enough, allow max 2 per anime
  if (rounds.length < NUM_ROUNDS) {
    for (const r of shuffled) {
      if (rounds.length >= NUM_ROUNDS) break;
      if (usedImages.has(r.image)) continue;
      if ((titleCount[r.hint] || 0) >= 2) continue;
      rounds.push(r);
      usedImages.add(r.image);
      titleCount[r.hint] = (titleCount[r.hint] || 0) + 1;
    }
  }

  // Pass 4: Rearrange to prevent consecutive same anime
  const arranged = [];
  const remaining = [...rounds];
  let lastTitle = null;

  while (remaining.length > 0) {
    let foundIndex = remaining.findIndex(r => r.hint !== lastTitle);
    if (foundIndex === -1) foundIndex = 0;
    arranged.push(remaining[foundIndex]);
    lastTitle = remaining[foundIndex].hint;
    remaining.splice(foundIndex, 1);
  }

  return arranged;
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

const CONFETTI_COLORS = ["#DEFF0A", "#FF6B35", "#111", "#FF9BE2"];
function genConfetti() {
  return Array.from({ length: 14 }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    cx: (Math.random() - 0.5) * 120,
    cy: (Math.random() - 0.5) * 120,
    rot: (Math.random() - 0.5) * 720,
  }));
}

const LANDING_CONFETTI_COLORS = ["#DEFF0A", "#B8D900", "#9AE600", "#22c55e", "#16a34a", "#15803d"];
function genLandingConfetti() {
  return Array.from({ length: 32 }, (_, i) => ({
    id: `land-${i}`,
    color: LANDING_CONFETTI_COLORS[i % LANDING_CONFETTI_COLORS.length],
    left: 5 + Math.random() * 90,
    tx: (Math.random() - 0.5) * 120,
    ty: 95 + Math.random() * 25,
    rot: (Math.random() - 0.5) * 720,
    delay: Math.random() * 0.4,
    duration: 2 + Math.random() * 0.8,
  }));
}

function calcScore(tilesRevealed, timeLeft, totalTime) {
  const totalTiles = 24;

  // Tile score: 1 tile = 950, each additional tile loses points
  const tileScore = Math.round(950 * Math.max(0, 1 - (tilesRevealed - 1) / (totalTiles - 1)));

  // Time bonus: up to 50 points (full if answered within first 3 seconds)
  const timeElapsed = totalTime - timeLeft;
  let timeBonus = 0;
  if (timeElapsed <= 3) {
    timeBonus = 50;
  } else {
    timeBonus = Math.round(50 * Math.max(0, timeLeft / (totalTime - 3)));
  }

  const total = tileScore + timeBonus;
  return Math.max(Math.min(total, 1000), 50); // Min 50, max 1000
}

function getRank(p) {
  if (p >= 90) return { t: "ANIME GOD", e: "—", c: "#111" };
  if (p >= 70) return { t: "OTAKU KING", e: "—", c: "#111" };
  if (p >= 50) return { t: "WEEB WARRIOR", e: "—", c: "#111" };
  if (p >= 30) return { t: "CASUAL FAN", e: "—", c: "#111" };
  return { t: "NORMIE", e: "—", c: "#111" };
}

const speedLabel = t => t > 45 ? "⚡ LIGHTNING" : t > 30 ? "🚀 FAST" : t > 15 ? "👍 SOLID" : "🐢 SLOW";

const RESULT_TITLES = [
  /* 9000+ */ ["Senpai noticed you!", "Main character energy!", "Omedetou! SSS rank.", "Your power level... it's over 9000!", "Nakama would be proud.", "Certified otaku. No cap.", "Kami-sama tier.", "That was very kawaii of you."],
  /* 8000–9000 */ ["Sugoi! Solid arc.", "Your power level is acceptable.", "Worthy of a second season.", "Ara ara, not bad~", "The council of weebs approves.", "Strong protagonist energy.", "Yare yare, that was clean."],
  /* 6000–8000 */ ["A filler arc, but we still love you.", "The training arc continues.", "Plot armor: partial. Keep grinding.", "Getting there, nakama!", "Honorable mention from the guild.", "Mid diff. Respectable.", "Your chūnibyō phase is paying off."],
  /* 4000–6000 */ ["Even isekai protagonists had a rough start.", "The power of friendship didn't kick in yet.", "Plot armor was on break.", "Nani?! Room to grow.", "Character development arc: loading...", "We've seen worse. Barely.", "Your waifu believes in you."],
  /* 2000–4000 */ ["At least you tried. Ganbare!", "Maybe stick to the OP/ED for now.", "Your waifu would still be proud. Probably.", "Skill issue. (We say with love.)", "The tutorial was optional, we guess.", "It's the journey, right? Right?!", "Next run: protagonist moment."],
  /* 0–2000 */ ["The tutorial was that way. →", "Even NPCs had a better day. Maybe.", "Certified moment. We believe in glow-ups.", "It's the thought that counts?", "We're not crying. You're crying.", "Your power level is... evolving. Slowly.", "Gacha luck will balance out. Copium."],
];
function getResultTitle(total) {
  const tier = total >= 9000 ? 0 : total >= 8000 ? 1 : total >= 6000 ? 2 : total >= 4000 ? 3 : total >= 2000 ? 4 : 5;
  const msgs = RESULT_TITLES[tier];
  return msgs[total % msgs.length];
}

const CSS = `
html, body, #root {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  background: #F5F5F0;
  overflow-x: hidden;
}
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F5F5F0;--accent:#DEFF0A;--t:#111111;--t2:#333;--b:#111;--card:#FFFFFF;
}
@font-face{
  font-family:'Gasoek';
  src:url('/fonts/Gasoek-Heavy.ttf') format('truetype');
  font-weight:400;font-style:normal;font-display:swap;
}
@font-face{
  font-family:'Bricolage Grotesque';
  src:url('/fonts/BricolageGrotesque-Variable.ttf') format('truetype');
  font-weight:100 900;font-style:normal;font-display:swap;
}
.R{width:100%;min-width:100%;min-height:100vh;max-width:100vw;font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;background:#F5F5F0;color:var(--t);position:relative;overflow-x:hidden;border-top:3px solid #DEFF0A}
.R,.R *{cursor:url('/pochita-cursor.png') 16 16,auto !important}

.s-loading{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.s-loading-text{font-family:Gasoek;text-transform:uppercase;letter-spacing:0.1em;font-size:13px;color:#111;text-align:center}
.s-loading-pct{font-family:'Bricolage Grotesque';font-size:28px;font-weight:900;color:#111}
.s-loading-bar{width:280px;height:6px;border-radius:4px;background:#E0E0D8;margin:0 auto;overflow:hidden}
.s-loading-bar-fill{height:100%;border-radius:4px;background:rgba(200,230,0,1);transition:width 0.4s ease-out}
.s-loading-tip{font-family:'Bricolage Grotesque';font-size:11px;color:#999;font-style:italic;margin-top:16px}
@media (min-width:768px){.s-loading-bar{width:280px}}

.S{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:24px;width:100%;max-width:1200px;margin-left:auto;margin-right:auto;box-sizing:border-box;position:relative;z-index:1}
.S.S--loading{max-width:none;width:100%}
.P{justify-content:flex-start;padding:12px 16px;align-items:stretch;height:100vh;display:flex;flex-direction:column;overflow:hidden}

.s-z{position:relative;z-index:2}
.s-t{font-family:'Gasoek','Vina Sans','Impact','Arial Black',sans-serif;font-weight:400;font-size:68px;letter-spacing:0.05em;color:var(--t);margin-bottom:16px;line-height:1.05;text-transform:uppercase;text-align:left;width:100%}
.s-t .shiny-text{margin-top:36px;display:inline-block;background:linear-gradient(90deg,#111 0%,#111 42%,rgba(255,255,255,0.9) 50%,#111 58%,#111 100%);background-size:400% 100%;background-clip:text;-webkit-background-clip:text;color:transparent;background-position:0 0;background-repeat:no-repeat;animation:shiny-text 12s cubic-bezier(0.6,0.6,0,1) infinite}
@keyframes shiny-text{0%,90%,100%{background-position:0% 0}30%,60%{background-position:100% 0}}
@keyframes shimmer-spin{to{transform:rotate(360deg)}}
@keyframes shimmer-slide{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes spin-around{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
@keyframes flip{0%{transform:perspective(120px) scaleX(1)}25%{transform:perspective(120px) scaleX(0)}50%{transform:perspective(120px) scaleX(1)}75%{transform:perspective(120px) scaleX(0)}100%{transform:perspective(120px) scaleX(1)}}
.loader-card{backface-visibility:hidden;-webkit-backface-visibility:hidden}
.s-sub{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#666;font-size:16px;font-weight:400;line-height:1.5;text-align:left;width:100%;max-width:360px;margin-top:16px;margin-bottom:32px;text-transform:none;letter-spacing:0;margin-left:auto;margin-right:auto}
.start-desc{font-family:'Bricolage Grotesque';font-size:16px;line-height:20px;color:#888;max-width:380px;text-transform:none;letter-spacing:0.01em;margin-top:16px;margin-bottom:32px;text-align:left;width:100%}
.s-stats{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:28px;margin-bottom:28px;width:100%}
.s-stat{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:24px 20px;flex:1;min-width:120px;border:none;border-radius:16px;box-shadow:0 2px 0 rgba(0,0,0,0.15);transition:transform 0.2s ease}
.s-stat:hover{transform:rotate(0deg)}
.s-stat--chartreuse{background:rgba(230, 255, 66, 1);color:#111}
.s-stat--chartreuse .s-stat-v,.s-stat--chartreuse .s-stat-l{color:#111}
.s-stat--black{background:#111;color:#F5F5F0}
.s-stat--black .s-stat-v,.s-stat--black .s-stat-l{color:#F5F5F0}
.s-stat--orange{background:#FF6B35;color:#FFF}
.s-stat--orange .s-stat-v,.s-stat--orange .s-stat-l{color:#FFF}
.s-stat--r1{transform:rotate(-2deg)}
.s-stat--r2{transform:rotate(1deg)}
.s-stat--r3{transform:rotate(-1.5deg)}
.s-stat-v{font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;font-size:36px;font-weight:900}
.s-stat-l{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;opacity:0.7}
.s-stats-line{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;font-weight:400;color:var(--t2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:24px}
.s-rules{display:flex;flex-direction:column;width:100%;max-width:300px;list-style:none;margin:0;padding:0}
.s-rule{display:flex;align-items:flex-start;gap:12px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:500;color:#555;margin-bottom:8px;text-transform:none;letter-spacing:0}
.s-rule-n{font-weight:900;color:var(--t);flex-shrink:0}
.s-api{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#999;padding-top:16px;border-top:1px solid #ccc;width:100%;font-weight:500;text-transform:uppercase;letter-spacing:0.1em;margin:24px 0 16px;text-align:center}

.s-hero{display:flex;flex-direction:column;align-items:center;text-align:center;width:90%;max-width:960px;margin-left:auto;margin-right:auto;flex-wrap:nowrap}
.s-hero-left{display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;flex-shrink:0}
.s-hero-right{display:flex;flex-direction:column;align-items:center;width:100%;flex-shrink:0}

.btn{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:600;cursor:pointer;border:none;transition:background 0.15s,color 0.15s,border-color 0.15s}
.btn-go{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;width:100%;padding:16px 56px;font-size:14px;font-weight:600;color:#111;background:#DEFF0A;border:none;border-radius:9999px;text-transform:uppercase;letter-spacing:0.1em;transition:background 0.2s ease,color 0.2s ease}
.btn-go:hover{background:#111;color:#DEFF0A}
.btn-go:active{opacity:0.9}
.btn-shimmer{position:relative;z-index:0;overflow:hidden;background:var(--bg,#DEFF0A) !important;border:2px solid #A8C200}
.btn-shimmer .btn-shimmer-edge{position:absolute;inset:0;z-index:-30;overflow:hidden;border-radius:9999px;filter:blur(2px)}
.btn-shimmer .btn-shimmer-spark{position:absolute;inset:-100%;background:conic-gradient(from 225deg, transparent 0deg, rgba(255,255,220,0.95) 90deg, transparent 90deg);animation:spin-around 4s infinite linear}
.btn-shimmer .btn-shimmer-fill{position:absolute;top:0;left:0;right:2px;bottom:2px;border-radius:9999px;background:var(--bg,#DEFF0A);z-index:-20}
.shimmer-highlight{box-shadow:inset 0 -8px 10px rgba(0,0,0,0.06)}
.btn-shimmer:hover .shimmer-highlight{box-shadow:inset 0 -6px 10px rgba(0,0,0,0.1)}
.btn-shimmer span{position:relative;z-index:1;color:#111}
.btn-shimmer:hover{color:#111;transform:scale(1.06);box-shadow:0 6px 20px rgba(0,0,0,0.12);border-color:#A8C200}
.btn-shimmer:focus,.btn-shimmer:focus-visible{outline:2px solid #A8C200;outline-offset:2px}
.btn-shimmer:hover .btn-shimmer-fill{background:rgba(220, 242, 74, 1)}
.btn-go-inner{transition:background 0.2s ease}
.start-buttons{display:flex;flex-direction:row;gap:10px}
.start-buttons .btn{padding:14px 28px;font-size:13px;min-width:160px}
.start-buttons .btn-go,.start-buttons .btn-howto{padding:14px 28px;font-size:13px;min-width:160px;width:auto;max-width:none}
.btn-howto-wrap{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.btn-howto-wrap .btn-go,.btn-howto-wrap .btn-howto{width:230px;min-width:230px;max-width:230px;box-sizing:border-box;padding:16px 56px;font-size:14px;white-space:nowrap}
.btn-howto{background:transparent;border:1.5px solid #111;border-radius:9999px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#111;cursor:pointer;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;transition:background 0.2s,color 0.2s,border-color 0.2s,transform 0.2s ease,box-shadow 0.2s ease}
.btn-howto:hover{background:#E5E5E0;color:#111;border-color:#333;transform:scale(1.04);box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-backdrop.modal-exit{animation:modalBackdropOut 0.3s cubic-bezier(0.4,0,0.2,1) forwards}
.modal-card{background:#F5F5F0;border:2px solid #111;border-radius:12px;padding:40px;max-width:480px;width:90%;position:relative;animation:modalIn 0.25s ease-out}
.modal-card.modal-exit{animation:modalCardOut 0.3s cubic-bezier(0.4,0,0.2,1) forwards}
@keyframes modalBackdropOut{from{opacity:1}to{opacity:0}}
@keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes modalCardOut{from{opacity:1;transform:scale(1) translateY(0)}to{opacity:0;transform:scale(0.96) translateY(8px)}}
.modal-title{font-family:'Vina Sans','Impact','Arial Black',sans-serif;font-size:28px;text-transform:uppercase;margin-bottom:24px;color:#111}
.modal-rule{display:flex;align-items:center;gap:16px;margin-bottom:16px}
.modal-rule:last-of-type{margin-bottom:0}
.modal-rule-badge{width:32px;height:32px;border-radius:50%;background:#DEFF0A;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:#111;flex-shrink:0}
.modal-rule-text{font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;font-size:15px;color:#333;font-weight:500}
.modal-score-note{font-size:12px;color:#999;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin-top:20px;text-transform:uppercase;letter-spacing:0.05em}
.modal-close{position:absolute;top:16px;right:16px;width:32px;height:32px;min-width:32px;min-height:32px;padding:0;border-radius:50%;aspect-ratio:1;background:#111;color:#F5F5F0;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-sizing:border-box;flex-shrink:0}
.modal-close .modal-close-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:0;pointer-events:none}
.modal-close:hover{opacity:0.9}
.btn-nxt{width:100%;max-width:100%;padding:14px 32px;font-size:12px;color:#FFF;background:#111;border-radius:9999px;text-transform:uppercase;letter-spacing:0.1em}
.btn-pill{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:6px 18px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;background:transparent;border:1.5px solid #111;border-radius:9999px;color:var(--t);cursor:pointer}
.btn-pill:hover{background:#FFF;border-color:#111}
.btn-pill.active{background:#111;color:#FFF}

.logo{font-family:'Vina Sans','Impact','Arial Black',sans-serif;font-weight:400;color:var(--t);letter-spacing:0.08em}
.logo sup{font-size:0.5em;opacity:0.8;vertical-align:super;margin-left:1px}
.s-logo-wrap{position:absolute;top:24px;left:0;right:0;width:100%;text-align:center;margin-bottom:0;display:flex;justify-content:center;align-items:center}
.s-logo-wrap .logo{font-size:14px;letter-spacing:0.15em;text-transform:uppercase}
.s-logo{font-size:20px;letter-spacing:0.12em;margin-bottom:8px;text-transform:uppercase}
.topbar{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;margin-bottom:20px;position:relative;min-height:44px}
.topbar .logo{font-size:14px;letter-spacing:0.15em;text-transform:uppercase;position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap}
.topbar-title{font-family:'Vina Sans','Impact','Arial Black',sans-serif;font-weight:400;font-size:14px;letter-spacing:0.15em;text-transform:uppercase;color:var(--t)}
.topbar-pills{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.vlabel{display:none}

.play-wrap{width:100%;max-width:800px;margin-left:auto;margin-right:auto;display:flex;flex-direction:column;gap:8px;position:relative;padding:0;flex:1;min-height:0}
.play-main{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px}

.H{width:100%;margin-bottom:0;padding:12px 16px;background:var(--card);border:1px solid var(--b);border-radius:4px;flex-shrink:0}
.H-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:0;margin-top:0;padding-bottom:8px;flex-wrap:wrap;gap:8px;box-sizing:content-box}
.H-l{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rnd{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:4px 8px;background:transparent;border:1px solid var(--b);border-radius:4px;font-size:9px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:0.1em}
.dots{display:flex;gap:3px;align-items:center}
.dot{width:7px;height:7px;border-radius:2px;background:var(--t);transition:background 0.2s}
.H-sc{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:4px 10px;height:44px;box-sizing:border-box;border-radius:8px;background:rgba(255,255,255,0.5);border:1px solid rgba(0,0,0,0.04);box-shadow:none}
.H-sc-l{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9px;color:var(--t);font-weight:700;text-transform:uppercase;letter-spacing:0.12em}
.H-sc-n{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:900;color:#111}
.H-sc-pts{font-size:16px;font-weight:700;color:#111;margin-left:2px}
.H-streak{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:900;color:#c45a2a}
.H-streak.H-streak--zero{color:#bbb}
.H-divider{color:#bbb;font-weight:400;user-select:none}
.flame{width:20px;height:24px;background:radial-gradient(ellipse at 50% 90%,#FF6B35 0%,#FFB800 40%,#DEFF0A 75%,transparent 100%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%;position:relative;flex-shrink:0;filter:drop-shadow(0 4px 8px rgba(255,107,53,0.4))}
.flame::after{content:'';position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:10px;height:12px;background:radial-gradient(ellipse at 50% 100%,#FFF4CC,#FFB800 60%,transparent 100%);border-radius:50% 50% 50% 50%/60% 60% 40% 40%}
.flame.flame--muted{filter:grayscale(1);opacity:0.3}
.flame.flame--pulse{animation:flamePulse 1.2s ease-in-out infinite;transform:scale(1.1)}
.flame.flame--hype{animation:flameHype 0.6s ease-in-out infinite;transform:scale(1.2);box-shadow:0 0 16px rgba(255,184,0,0.5)}
@keyframes flamePulse{0%,100%{opacity:1;transform:scale(1.1)}50%{opacity:0.85;transform:scale(1.15)}}
@keyframes flameHype{0%,100%{opacity:1;transform:scale(1.2)}50%{opacity:0.9;transform:scale(1.25)}}
.strk{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:4px 8px;font-size:9px;font-weight:700;background:var(--accent);color:var(--t);border:1px solid var(--b);border-radius:9999px;text-transform:uppercase;letter-spacing:0.08em}

.Tw{position:relative;width:100%;height:4px;border-radius:2px;background:#ddd;overflow:hidden}
.Tf{height:100%;border-radius:2px;transition:width 1s linear,background 0.3s ease;background:#111}
.Tf.timer-bar-orange{background:#FF6B35}
.Tf.timer-bar-urgent{background:#FF4444}
.Tm{display:flex;justify-content:space-between;margin-top:4px;align-items:center}
.Ts{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:700;color:var(--t)}
.Ti{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:9px;color:var(--t2);font-weight:500;text-transform:uppercase;letter-spacing:0.06em}
.Ti em{font-style:normal;font-weight:700;color:var(--t)}

.board-wrap{flex:1;min-height:0;display:flex;flex-direction:column;min-height:0}
.board-wrap>div{flex:1;min-height:0;width:100%;display:flex;flex-direction:column}
.B{width:100%;max-width:100%;aspect-ratio:16/10;position:relative;border-radius:4px;overflow:hidden;background:var(--card);border:1px solid var(--b);flex:1;min-height:0;max-height:100%}
.B img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;visibility:hidden}
.B.vis img{visibility:visible}
.G{position:absolute;inset:0;z-index:1;display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(4,1fr);gap:0;grid-gap:0;padding:0;perspective:400px}
.tile{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;user-select:none;cursor:pointer;width:100%;height:100%;margin:0;padding:0;background:#E8E8E2;border:none;outline:none;box-shadow:inset 0 0 0 0.5px rgba(0,0,0,0.08);position:relative;transform-style:preserve-3d}
.tile:hover:not(.X){background:#e0e0da}
.tile:active:not(.X){opacity:0.9}
.tile.X{background:transparent;box-shadow:none;outline:none;opacity:0;pointer-events:none;cursor:default}
.tn{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:10px;font-weight:400;color:#999;position:relative;z-index:1}
.B-meta{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;justify-content:space-between;font-size:11px;font-weight:500;color:#bbb;margin-top:8px;text-transform:uppercase;letter-spacing:0.1em}

.res{width:100%;max-width:100%;text-align:center;padding:12px 0 8px;flex-shrink:0;user-select:none}
.res-e{font-size:32px;margin-bottom:8px;color:var(--t)}
.res-l{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:700;color:var(--t);text-transform:uppercase;letter-spacing:0.12em}
.res-l--correct{color:#111;font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;font-size:32px;font-weight:900}
.res-p{font-size:14px;font-weight:700;color:var(--t);margin-top:4px}
.res-p.score-flash{color:#111;font-family:Gasoek;font-size:40px;font-weight:900;margin-top:0}
.res--correct .res-e{margin-bottom:4px}
.res-sp{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:inline-block;padding:6px 12px;border:1px solid var(--b);border-radius:9999px;font-size:10px;font-weight:700;color:var(--t);margin-top:12px;text-transform:uppercase;letter-spacing:0.1em}
.res-miss{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:var(--t2);margin-top:8px;text-transform:uppercase}
.res-miss strong{color:var(--t);font-weight:700}

.I{width:100%;margin-top:10px;flex-shrink:0;display:flex;flex-direction:column;align-items:stretch;position:relative;z-index:5}
.input-row{display:flex;flex-direction:column;gap:8px;width:100%;align-items:stretch}
.input-row-actions{display:flex;gap:8px;align-items:center;width:100%}
.input-row-actions .btn-confirm{flex:1;min-width:0}
.game-input{flex:1;min-width:0;padding:12px 16px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#111;background:#FFFFFF;border:1.5px solid #111;border-image:none;border-radius:12px;outline:none;caret-color:#111;transition:border-color 0.2s,box-shadow 0.2s}
.game-input::placeholder{color:#999;font-weight:500}
.game-input:focus{border-color:rgba(200,230,0,0.71);box-shadow:0 0 0 3px rgba(0,0,0,0.08)}
.game-input.error{border-color:#FF3333;box-shadow:0 0 0 3px rgba(255,51,51,0.15);animation:inputShake 0.4s ease}
.btn-confirm{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#F5F5F0;background:#111;border:2px solid #111;border-radius:12px;cursor:pointer;transition:all 0.15s ease;white-space:nowrap;flex-shrink:0}
.btn-confirm:hover{background:rgba(200,230,0,1);color:#111;border-color:#111}
.btn-confirm:active{transform:translateY(2px)}
.btn-giveup-ghost{display:flex;align-items:center;justify-content:center;gap:6px;min-width:52px;height:52px;padding:0 14px;box-sizing:border-box;background:transparent;border:1.5px solid #333;border-radius:12px;cursor:pointer;color:#555;transition:all 0.2s ease;flex-shrink:0;position:relative;z-index:5;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em}
.btn-giveup-ghost:hover{border-color:#FF3333;color:#FF3333;background:rgba(255,51,51,0.04)}
.btn-giveup-ghost:active{transform:translateY(1px)}
.wrong-toast{text-align:center;margin-top:8px;padding:8px 16px;border-radius:8px;background:rgba(255,51,51,0.08);border:1px solid rgba(255,51,51,0.15);color:#FF3333;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;animation:popIn 0.25s ease}
.wrong-toast.toast-enter{animation:toastSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards}
.ht{font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center;font-size:10px;color:#ccc;margin-top:6px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em}

.S--results{min-height:100vh;max-height:100vh;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden}
.S--results .res-wrap{flex:1;min-height:0;overflow-y:auto;padding-bottom:120px}
.res-wrap{width:100%;max-width:800px;margin-left:auto;margin-right:auto;display:flex;flex-direction:column;align-items:center;padding:24px;box-sizing:border-box}
.res-profile{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:20px}
.res-avatar{width:56px;height:56px;border-radius:50%;background:#E0E0D8;border:1.5px solid rgba(0,0,0,0);border-image:none;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;flex-shrink:0;transition:background 0.2s ease,border-color 0.2s ease,transform 0.2s ease}
.res-avatar:hover{background:#D5D5CC;border-color:rgba(0,0,0,0.12);transform:scale(1.04)}
.res-avatar img{width:100%;height:100%;object-fit:cover}
.res-avatar-icon{color:#999;font-size:24px;line-height:1;pointer-events:none;display:flex;align-items:center;justify-content:center}
.res-avatar-icon svg{display:block}
.res-avatar:hover .res-avatar-icon{color:#777}
.res-name-input-wrap{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:8px 0;border-bottom:1.5px solid #e0e0d8;transition:border-color 0.2s ease, box-shadow 0.2s ease;min-width:180px}
.res-name-input-wrap:focus-within{border-bottom-color:#111;outline:none}
.res-name-input-wrap .res-name-input-edit-icon{flex-shrink:0;color:#999;transition:color 0.2s ease;display:flex;align-items:center;justify-content:center}
.res-name-input-wrap:focus-within .res-name-input-edit-icon{color:#111}
.res-name-input-wrap .res-name-input-edit-icon svg{display:block;width:14px;height:14px}
.res-name-input{background:transparent;border:none;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;text-align:center;color:#111;padding:0;width:100%;min-width:0;flex:1;outline:none}
.res-name-input::placeholder{color:#999}
.res-title{font-family:Gasoek;font-size:22px;text-transform:uppercase;color:#111;margin-bottom:8px}
.res-score{font-family:'Cabinet Grotesk';font-size:64px;font-weight:900;line-height:1;background:linear-gradient(180deg,#111 0%,#2a2a2a 35%,#444 50%,#2a2a2a 65%,#111 100%);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block}
.res-meta{display:inline-block;font-size:12px;color:#555;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-transform:uppercase;letter-spacing:0.1em;margin-top:10px;padding:6px 14px;border-radius:9999px;background:rgba(0,0,0,0.06);font-weight:700}
.res-grid{display:grid;grid-template-columns:repeat(5,64px);gap:10px;justify-content:center;margin:20px auto;perspective:400px;position:relative}
.res-grid::after{content:'';position:absolute;inset:-20px;background:radial-gradient(ellipse at center,rgba(222,255,10,0.08),transparent 70%);pointer-events:none;z-index:-1}
.res-block{width:64px;height:64px;border-radius:10px;display:flex;align-items:center;justify-content:center;transform-style:preserve-3d;transition:all 0.2s ease}
.res-block>.res-block-icon{display:flex;align-items:center;justify-content:center;width:100%;height:100%;line-height:1;text-align:center}
.res-block:nth-child(odd){transform:rotate(-1deg)}
.res-block:nth-child(even){transform:rotate(0.8deg)}
.res-block--correct{background:#DEFF0A;box-shadow:inset 0 4px 12px rgba(0,80,0,0.15),inset 0 -2px 8px rgba(255,255,255,0.3),0 4px 16px rgba(222,255,10,0.25);border:1.5px solid rgba(0,0,0,0.06)}
.res-block--correct:hover{transform:rotate(0deg) scale(1.08);box-shadow:inset 0 4px 16px rgba(0,80,0,0.2),0 8px 24px rgba(222,255,10,0.35)}
.res-block--wrong,.res-block--time{background:#111;box-shadow:inset 0 4px 12px rgba(255,255,255,0.05),inset 0 -2px 8px rgba(0,0,0,0.3),0 4px 12px rgba(0,0,0,0.15);border:1.5px solid rgba(255,255,255,0.05)}
.res-block--wrong:hover,.res-block--time:hover{transform:rotate(0deg) scale(1.08)}
.res-block-num{font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;font-size:16px;font-weight:900}
.res-block--correct .res-block-num{color:#111}
.res-block--wrong .res-block-num,.res-block--time .res-block-num{color:#555}
@keyframes blockReveal{0%{transform:scale(0) rotateX(90deg);opacity:0}70%{transform:scale(1.1) rotateX(0deg);opacity:1}100%{transform:scale(1) rotateX(0deg);opacity:1}}
.res-rows{width:100%;margin-top:24px;border-top:1px solid rgba(0,0,0,0.06)}
.res-row{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(0,0,0,0.06)}
.res-row-label{font-size:12px;color:#999;font-weight:700;width:36px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
.res-row-title{font-size:14px;color:#111;font-weight:600;flex:1;margin-left:8px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.res-pill{padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:900;font-family:'SF Pro',-apple-system,BlinkMacSystemFont,sans-serif}
.res-pill--correct{background:#DEFF0A;color:#111}
.res-pill--wrong{background:#111;color:#F5F5F0}
.results-footer{position:sticky;bottom:0;left:0;width:100%;padding:20px 0 24px;display:flex;flex-direction:column;align-items:center;gap:10px;z-index:10;background:#F5F5F0;flex-shrink:0}
.results-footer::before{content:'';position:absolute;bottom:100%;left:0;right:0;height:60px;background:linear-gradient(to bottom,rgba(245,245,240,0),rgba(245,245,240,1));pointer-events:none}
.res-actions{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:10px;max-width:800px;margin:0 auto;flex-wrap:wrap}
.res-actions .btn-share,.res-actions .btn-play-again-outline{width:200px;min-width:200px;box-sizing:border-box}
.btn-share{background:#DEFF0A;color:#111;border:none;border-radius:9999px;padding:14px 40px;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform 0.2s ease,box-shadow 0.2s ease,background 0.2s ease}
.btn-share:hover{background:#d4f000;transform:scale(1.03);box-shadow:0 4px 16px rgba(222,255,10,0.4)}
.btn-share:active{transform:scale(0.98)}
.btn-play-again-outline{background:transparent;border:1.5px solid #111;border-radius:9999px;padding:12px 36px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#111;font-family:'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;white-space:nowrap;transition:transform 0.2s ease,box-shadow 0.2s ease,background 0.2s ease;outline:none;box-shadow:none}
.btn-play-again-outline:hover{background:rgba(0,0,0,0.06);border-color:#111;transform:scale(1.03);box-shadow:0 4px 16px rgba(0,0,0,0.12)}
.btn-play-again-outline:focus,.btn-play-again-outline:focus-visible{outline:none !important;box-shadow:0 0 0 0 transparent}
.btn-play-again-outline:active{transform:scale(0.98)}

@keyframes surFloat{0%,100%{transform:translateY(0) rotate(var(--r))}50%{transform:translateY(-18px) rotate(calc(var(--r) + 6deg))}}

.float-obj{position:absolute;pointer-events:none;user-select:none;z-index:0;filter:drop-shadow(0 10px 20px rgba(0,0,0,0.12));animation:surFloat ease-in-out infinite}
.float-sphere{top:8%;right:5%;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#FF6B35,#E2450A);box-shadow:inset -8px -8px 20px rgba(0,0,0,0.3),inset 4px 4px 10px rgba(255,255,255,0.4),0 10px 30px rgba(226,69,10,0.3);--r:0deg;animation-duration:6s;animation-delay:0s}
.float-pill{top:8%;left:5%;width:80px;height:35px;border-radius:9999px;background:linear-gradient(135deg,#DEFF0A,#B8D900);box-shadow:inset -4px -4px 12px rgba(0,0,0,0.15),inset 2px 2px 8px rgba(255,255,255,0.5),0 8px 24px rgba(222,255,10,0.25);--r:-15deg;animation-duration:7s;animation-delay:0.5s}
.float-donut{bottom:12%;right:6%;width:55px;height:55px;border-radius:50%;background:transparent;border:14px solid #111;box-shadow:inset 0 -4px 8px rgba(255,255,255,0.1),0 8px 20px rgba(0,0,0,0.3);--r:0deg;animation-duration:5s;animation-delay:1s}
.float-blob{top:42%;left:4%;width:50px;height:50px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#FF9BE2,#9BF0FF,#DEFF0A);--r:-45deg;box-shadow:0 8px 24px rgba(255,155,226,0.3);animation-duration:8s;animation-delay:1.5s}
.float-egg{bottom:10%;left:6%;width:40px;height:55px;border-radius:50%;background:repeating-linear-gradient(45deg,#FF6B35,#FF6B35 4px,#FFB088 4px,#FFB088 8px);box-shadow:0 8px 20px rgba(255,107,53,0.25);--r:0deg;animation-duration:6.5s;animation-delay:0.2s}
.float-cube{top:10%;left:58%;width:45px;height:45px;border-radius:8px;background:linear-gradient(135deg,rgba(255,255,255,0.6),rgba(255,255,255,0.1));border:1px solid rgba(255,255,255,0.4);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);box-shadow:0 8px 24px rgba(0,0,0,0.1);--r:12deg;animation-duration:7.5s;animation-delay:2s}
.float-star1{top:18%;right:12%;width:30px;height:30px;background:#DEFF0A;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);box-shadow:0 4px 12px rgba(222,255,10,0.4);--r:0deg;animation-duration:5.5s;animation-delay:0.8s}
.float-star2{bottom:22%;left:8%;width:30px;height:30px;background:#DEFF0A;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);box-shadow:0 4px 12px rgba(222,255,10,0.4);--r:0deg;animation-duration:9s;animation-delay:1.2s}

@media (min-width:768px){
  .input-row{flex-direction:row;align-items:center}
  .input-row-actions{width:auto;flex-shrink:0}
  .input-row-actions .btn-confirm{flex:0 1 auto}
}
@media (max-width: 767px){
  .float-sphere{width:39px;height:39px;box-shadow:inset -5px -5px 13px rgba(0,0,0,0.3),inset 3px 3px 6px rgba(255,255,255,0.4),0 6px 20px rgba(226,69,10,0.3)}
  .float-pill{width:52px;height:23px}
  .float-donut{width:36px;height:36px;border-width:9px}
  .float-blob{display:none}
  .float-egg{width:26px;height:36px}
  .float-cube{display:none}
  .float-star1{width:20px;height:20px}
  .float-star2{display:none}
  .btn-howto-wrap{width:100%;flex-direction:column}
  .btn-howto-wrap .btn-go,.btn-howto-wrap .btn-howto{width:100%;min-width:0;max-width:none}
}

@media (max-width: 768px){
  .S.P{height:100dvh;min-height:100dvh;overflow:hidden}
  .play-wrap{padding:8px;gap:6px}
  .B{aspect-ratio:4/3 !important}
  .res-wrap{text-align:center;align-items:center}
  .res-title{text-align:center;padding:0 20px}
  .res-grid{grid-template-columns:repeat(5,56px);gap:6px}
  .res-block{width:56px;height:56px}
}
@media (max-width: 480px){
  .start-buttons{flex-direction:column;width:100%}
  .start-buttons .btn,.start-buttons .btn-howto{width:100%}
  .title-line2{white-space:normal}
  .s-stats{gap:8px}
  .s-stat{padding:16px 8px}
  .s-stat-v{font-size:24px}
  .s-stat-l{font-size:9px}
  .B{aspect-ratio:1/1 !important}
}
@media (max-width: 400px){
  .res-grid{grid-template-columns:repeat(5,48px);gap:5px}
  .res-block{width:48px;height:48px}
}

@media (max-width: 639px){
  .s-hero{margin-top:56px}
  .s-hero-left{align-items:center;text-align:center}
  .s-hero-left .s-t,.s-hero-left .s-sub,.s-hero-left .start-desc{text-align:center}
  .s-hero-left .btn-howto-wrap{align-items:center}
}

@media (min-width: 640px){
  .s-hero{flex-direction:row;gap:80px;align-items:flex-start;text-align:left;max-width:960px;width:90%;margin-left:auto;margin-right:auto}
  .s-hero-left{display:flex;flex-direction:column;align-items:flex-start;text-align:left;flex:1;min-width:0;width:auto}
  .s-hero-left .s-t,.s-hero-left .s-sub,.s-hero-left .start-desc,.s-hero-left .btn-howto-wrap{width:100%;max-width:100%}
  .s-hero-left .s-sub,.s-hero-left .start-desc{margin-left:0;margin-right:0}
  .s-hero-right{display:flex;flex-direction:column;align-items:center;flex:1;min-width:0;width:auto}
}
@media (max-width: 1023px){
  .start-content{flex-direction:column;align-items:center;text-align:center;gap:32px}
  .start-left{align-items:center}
  .start-title{text-align:center}
  .title-line2{white-space:nowrap}
  .start-desc{text-align:center;font-size:14px}
  .start-buttons{flex-direction:row;justify-content:center}
  .s-stats{flex-wrap:nowrap;flex-direction:row;gap:10px;justify-content:center}
  .s-stat{flex:1;min-width:0;padding:20px 12px}
  .s-stat-v{font-size:28px}
  .s-stat-l{font-size:10px;letter-spacing:0.08em}
}
@media (min-width: 768px){
  .S{padding:48px}
  .P{padding:12px 16px}
  .s-t{font-size:68px;letter-spacing:0.05em}
  .start-title{font-size:64px;line-height:1.05}
  .s-sub{max-width:360px;font-size:16px}
  .s-stats{gap:12px;margin-bottom:28px}
  .s-stat{padding:24px 20px;border-radius:16px;flex:1;min-width:120px}
  .s-stat-v{font-size:36px;font-weight:900}
  .s-stat-l{font-size:12px;letter-spacing:0.12em;opacity:0.7}
  .s-stats-line{font-size:12px}
  .s-rules{max-width:400px;margin-bottom:0}
  .btn-go{width:auto;padding:16px 56px;font-size:14px}
  .topbar{flex-direction:row;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap}
  .topbar .logo{font-size:18px}
  .topbar-title{font-size:18px}
  .H{max-width:100%}
  .B{max-width:100%;aspect-ratio:16/8}
  .res{max-width:100%}
  .I{max-width:100%}
  .H-sc-n{font-size:22px}
  .res-grid{grid-template-columns:repeat(5,80px)}
  .res-block{width:80px;height:80px}
}

@media (min-width: 1024px){
  .start-content{flex-direction:row;align-items:center;gap:80px}
  .start-left{align-items:flex-start;text-align:left}
  .start-buttons{flex-direction:row}
  .H{max-width:100%}
  .B{max-width:100%;aspect-ratio:16/8}
  .res{max-width:100%}
  .I{max-width:100%}
  .play-wrap{max-width:900px}
  .res-wrap{max-width:900px}
  .res-actions{max-width:900px}
  .topbar{max-width:900px;margin-left:auto;margin-right:auto}
  .H-sc-n{font-size:26px}
  .rnd{padding:8px 14px;font-size:11px}
  .s-hero{max-width:1100px;gap:100px}
  .s-t{font-size:56px;line-height:1.05;letter-spacing:0.02em;max-width:12ch}
  .s-sub{font-size:18px;line-height:1.55;max-width:420px}
  .start-desc{font-size:16px}
  .btn-go{padding:18px 60px;font-size:16px;transition:all 0.2s ease}
  .btn-howto-wrap .btn-go,.btn-howto-wrap .btn-howto{width:250px;min-width:250px;max-width:250px;padding:18px 60px;font-size:16px}
  .start-buttons .btn-go,.start-buttons .btn-howto{min-width:160px;width:auto;max-width:none;padding:14px 28px;font-size:13px}
  .s-stats{gap:14px}
  .s-stat{padding:28px 32px;min-width:160px}
  .s-stat-v{font-size:44px}
  .s-stat-l{font-size:12px}
  .s-rules{gap:14px}
  .s-rule{font-size:15px;margin-bottom:0}
  .s-rule-n{font-size:16px;font-weight:900}
  .s-api{font-size:11px}
  .float-sphere{width:80px;height:80px}
  .float-pill{width:104px;height:46px}
  .float-donut{width:78px;height:78px;border-width:18px}
  .float-blob{width:65px;height:65px}
  .float-egg{width:52px;height:72px}
  .float-cube{width:58px;height:58px}
  .float-star1{width:45px;height:45px}
  .float-star2{width:45px;height:45px}
}

@media (min-width: 1440px){
  .s-hero{max-width:1200px;gap:120px}
  .s-t{font-size:56px;max-width:12ch}
  .s-stat-v{font-size:52px}
}

/* Micro-interaction keyframes */
@keyframes correctPulse{0%{box-shadow:0 0 0 0 #DEFF0A}70%{box-shadow:0 0 0 12px rgba(222,255,10,0)}100%{box-shadow:0 0 0 0 transparent}}
@keyframes confetti{0%{opacity:1;transform:translate(0,0) rotate(0deg)}100%{opacity:0;transform:translate(var(--cx),var(--cy)) rotate(var(--rot))}}
@keyframes landingConfetti{0%{opacity:0.95;transform:translate(0,0) rotate(0deg)}70%{opacity:0.9;transform:translate(var(--tx),var(--ty)) rotate(var(--rot))}100%{opacity:0;transform:translate(var(--tx),var(--ty)) rotate(var(--rot))}}
@keyframes bounceIn{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes scorePulse{0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
@keyframes inputShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
@keyframes wrongBorderFlash{0%{border-bottom-color:#FF4444}100%{border-bottom-color:var(--b)}}
@keyframes toastSlideUp{0%{opacity:0;transform:translateY(12px)}70%{transform:translateY(-2px)}100%{opacity:1;transform:translateY(0)}}
@keyframes popIn{0%{opacity:0;transform:scale(0.96)}100%{opacity:1;transform:scale(1)}}
@keyframes tileReveal{to{opacity:0;transform:scale(0.5) rotateX(90deg)}}
@keyframes tileFlip{0%{transform:scale(1) rotateY(0);opacity:1}100%{transform:scale(0.7) rotateY(90deg);opacity:0}}
@keyframes ripple{0%{transform:scale(0);opacity:0.6}100%{transform:scale(2);opacity:0}}
@keyframes slideOutLeft{to{transform:translateX(-30px);opacity:0}}
@keyframes slideInRight{from{transform:translateX(30px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}
@keyframes timerBarUrgent{0%,100%{background:#FF4444}50%{background:#cc3333}}

.B.board-shake{animation:shake 0.3s ease-out}
.B.board-correct-pulse{animation:correctPulse 0.5s ease-out}
.res-e.bounce-in{animation:bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards}
.res-p.score-flash{transition:color 0.5s ease,opacity 0.5s ease}
.float-score-text{color:#111;font-family:'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif;font-size:36px;font-weight:900}
.wrong-toast.toast-enter{animation:toastSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards}
.tile.tile-flipping{animation:tileFlip 0.25s ease-out forwards;pointer-events:none}
.tile.tile-cascade{animation:tileReveal 0.4s ease-out forwards}
.res-miss.typewriter{overflow:hidden;white-space:nowrap;border-right:2px solid var(--t);animation:typewriterCursor 0.5s step-end infinite}
.H-sc-n.score-pulse{animation:scorePulse 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.strk.streak-bounce{animation:bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.strk.streak-glow{box-shadow:0 0 12px rgba(222,255,10,0.5)}
.strk.streak-hype{animation:streakPulse 0.6s ease-in-out infinite;box-shadow:0 0 16px rgba(222,255,10,0.6)}
@keyframes typewriterCursor{50%{border-color:transparent}}
@keyframes streakPulse{0%,100%{transform:scale(1);box-shadow:0 0 16px rgba(222,255,10,0.6)}50%{transform:scale(1.05);box-shadow:0 0 20px rgba(222,255,10,0.8)}}
.Ts.timer-urgent{animation:pulse 0.8s ease infinite}
.Ts.timer-critical{animation:pulse 0.4s ease infinite}
.Tf.timer-bar-urgent{animation:timerBarUrgent 0.8s ease infinite}
.play-main.slide-out{animation:slideOutLeft 0.2s ease-out forwards}
.play-main.slide-in{animation:slideInRight 0.2s ease-out forwards}
.result-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.05);pointer-events:none;z-index:2;border-radius:4px}
.confetti-wrap{position:absolute;inset:0;pointer-events:none;z-index:5}
.confetti-piece{position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:1px;animation:confetti 1s ease-out forwards}
.landing-confetti-wrap{position:fixed;inset:0;pointer-events:none;z-index:50}
.landing-confetti-piece{position:absolute;top:-12px;width:10px;height:10px;border-radius:2px;animation:landingConfetti 2.4s ease-out forwards}
.inp-wrap{position:relative;flex:1}
.inp-x{position:absolute;right:0;top:50%;transform:translateY(-50%);font-size:18px;font-weight:700;color:#FF4444;animation:inpXFade 0.4s ease-out;pointer-events:none}
@keyframes inpXFade{0%{opacity:0;transform:translateY(-50%) scale(0.5)}50%{opacity:1;transform:translateY(-50%) scale(1.2)}100%{opacity:0;transform:translateY(-50%) scale(1)}}
.tile-ripple{position:absolute;inset:0;margin:auto;width:20px;height:20px;border-radius:50%;background:rgba(222,255,10,0.4);animation:ripple 0.35s ease-out forwards;pointer-events:none}
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
  const [displayProg, setDisplayProg] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [modalExiting, setModalExiting] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const fid = useRef(0);
  const roundEndedRef = useRef(false);

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [showLandingConfetti, setShowLandingConfetti] = useState(false);
  const [landingConfettiPieces, setLandingConfettiPieces] = useState([]);
  const landingConfettiShownRef = useRef(false);
  const [prevGameTitles, setPrevGameTitles] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [boardPulse, setBoardPulse] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [scorePulse, setScorePulse] = useState(false);
  const [inputShake, setInputShake] = useState(false);
  const [inputBorderFlash, setInputBorderFlash] = useState(false);
  const [wrongToastSlide, setWrongToastSlide] = useState(false);
  const [inpXShow, setInpXShow] = useState(false);
  const [flippingTiles, setFlippingTiles] = useState(new Set());
  const [rippleTile, setRippleTile] = useState(null);
  const [cascadeReveal, setCascadeReveal] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [showOverlay, setShowOverlay] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState(null);
  const [prevRound, setPrevRound] = useState(0);
  const [streakBounce, setStreakBounce] = useState(false);
  const lastStreakRef = useRef(0);
  const typewriterRef = useRef(null);

  const initRound = useCallback(() => {
    setRevealed(new Set()); setGuess(""); setTime(TIMER);
    setResult(null); setRScore(0); setWrongMsg(""); setFloats([]);
    setShowConfetti(false); setConfettiPieces([]); setIsShaking(false); setBoardPulse(false);
    setDisplayScore(0); setInputShake(false); setInputBorderFlash(false); setWrongToastSlide(false);
    setInpXShow(false); setFlippingTiles(new Set()); setRippleTile(null); setCascadeReveal(false);
    setTypewriterText(""); setShowOverlay(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTime(p => { if (p <= 1) { clearInterval(timerRef.current); return 0; } return p - 1; });
    }, 1000);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const [loadMsg, setLoadMsg] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isReplay, setIsReplay] = useState(false);
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const [loadImgIndex, setLoadImgIndex] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [imageSaved, setImageSaved] = useState(false);
  const avatarInputRef = useRef(null);

  const startGame = async () => {
    const replay = screen === "results" || screen === "playing";
    const titlesToAvoid = rounds && rounds.length > 0 ? rounds.map(r => r.hint) : [];
    if (titlesToAvoid.length > 0) setPrevGameTitles(titlesToAvoid);
    setIsReplay(replay);
    setRound(0); setTotal(0); setResults([]); setStreak(0); setShowBar(false);
    setLoading(true); setProg(0); setDisplayProg(0); setLoadError("");
    setLoadMsg(replay ? "SUMMONING NEW SCENES..." : "SUMMONING ANIME SCENES...");
    const pool = await loadAllImages((p) => {
      setProg(Math.min(p, 100));
      if (replay) {
        if (p < 40) setLoadMsg("SUMMONING NEW SCENES...");
        else if (p < 80) setLoadMsg("PLOT ARMOR ACTIVATED...");
        else setLoadMsg("FINAL FORM UNLOCKED");
      } else {
        if (p < 40) setLoadMsg("SUMMONING ANIME SCENES...");
        else if (p < 80) setLoadMsg("LOADING FILLER ARC...");
        else setLoadMsg("OMAE WA MOU READY");
      }
    });
    if (pool.length === 0) {
      setLoadError("Failed to fetch images. Check your internet connection and try again.");
      setLoading(false);
      return;
    }
    const r = buildRoundsFromPool(pool, titlesToAvoid);
    if (!r) {
      setLoadError(`Only got ${pool.length} images. Need at least ${NUM_ROUNDS}. Try again.`);
      setLoading(false);
      return;
    }
    setProg(92);
    await new Promise(r => setTimeout(r, 200));
    await Promise.all(r.slice(0, 3).map(round => preloadImage(round.image)));
    setProg(96);
    await new Promise(r => setTimeout(r, 200));
    setProg(100);
    await new Promise(r => setTimeout(r, 300));
    setRounds(r);
    setLoading(false);
    setScreen("playing");
    initRound();
  };

  const LOADING_TIPS = ["FEWER TILES = MORE POINTS", "SPEED RUN MODE: ON", "YOU KNOW YOUR ANIME", "REVEAL LESS, SCORE MORE", "IT'S IN THE EYES (AND HAIR)"];
  useEffect(() => {
    if (!loading) return;
    if (prog === 0) {
      setDisplayProg(0);
      return;
    }
    const id = setInterval(() => {
      setDisplayProg(prev => Math.min(prev + 2, prog));
    }, 50);
    return () => clearInterval(id);
  }, [loading, prog]);
  useEffect(() => {
    if (!loading) return;
    setLoadingTipIndex(0);
    const id = setInterval(() => setLoadingTipIndex((i) => (i + 1) % LOADING_TIPS.length), 2000);
    return () => clearInterval(id);
  }, [loading]);
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadImgIndex(prev => (prev + 1) % LOADING_IMAGES.length);
    }, 600);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (screen === 'results') {
      setShowConfetti(true);
      setConfettiPieces(genConfetti());
      const timer = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [screen]);

  useEffect(() => {
    if (!result || screen !== 'playing') return;
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nextRound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, screen]);

  useEffect(() => { if (time === 0 && screen === "playing" && !result) endRound(false, 0); }, [time, screen, result]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (screen !== "playing" || !rounds) return;
    if (rounds[round + 1]) preloadImage(rounds[round + 1].image);
    if (rounds[round + 2]) preloadImage(rounds[round + 2].image);
  }, [round, screen, rounds]);

  const UNICORN_SDK = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";
  useEffect(() => {
    if (screen !== "start" || loading) {
      if (typeof window !== "undefined" && window.UnicornStudio) window.UnicornStudio.destroy();
      return;
    }
    let cancelled = false;
    const init = () => {
      if (cancelled || !window.UnicornStudio) return;
      window.UnicornStudio.init().catch(() => {});
    };
    if (window.UnicornStudio) {
      init();
      return () => { if (window.UnicornStudio) window.UnicornStudio.destroy(); };
    }
    const script = document.createElement("script");
    script.src = UNICORN_SDK;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    return () => {
      cancelled = true;
      if (window.UnicornStudio) window.UnicornStudio.destroy();
    };
  }, [screen, loading]);

  useEffect(() => {
    if (!result || !result.correct || rScore <= 0) return;
    const duration = 600; const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 2);
      setDisplayScore(Math.round(rScore * easeOut));
      if (t < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [result?.correct, rScore]);

  useEffect(() => {
    if (!result || result.correct || !rounds) return;
    const full = `It was ${rounds[round].hint}`;
    const len = full.length;
    const dur = 500 / len;
    let i = 0;
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      i++;
      setTypewriterText(full.slice(0, i));
      if (i >= len) clearInterval(typewriterRef.current);
    }, dur);
    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current); };
  }, [result?.correct, result?.gaveUp, round, rounds]);

  useEffect(() => {
    if (streak > lastStreakRef.current && streak >= 2) {
      setStreakBounce(true);
      lastStreakRef.current = streak;
      const t = setTimeout(() => setStreakBounce(false), 400);
      return () => clearTimeout(t);
    }
    lastStreakRef.current = streak;
  }, [streak]);

  const addFloat = (text, color) => {
    const id = ++fid.current;
    setFloats(p => [...p, { id, text, color, x: 30 + Math.random() * 40 }]);
    setTimeout(() => setFloats(p => p.filter(f => f.id !== id)), 1200);
  };

  const endRound = (correct, sc, gaveUp = false) => {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;
    inputRef.current?.blur();
    if (timerRef.current) clearInterval(timerRef.current);
    const r = { correct, score: sc, answer: rounds[round].hint, gaveUp };
    setResult(r); setRScore(sc);
    if (correct) {
      setTotal(p => p + sc); setStreak(p => p + 1); addFloat(`+${sc}`, "#111");
      setIsShaking(true); setBoardPulse(true); setDisplayScore(0); setScorePulse(true);
      setTimeout(() => setIsShaking(false), 300);
      setTimeout(() => setBoardPulse(false), 500);
      setTimeout(() => setScorePulse(false), 400);
    } else {
      setStreak(0);
      setCascadeReveal(true); setShowOverlay(true);
      setTypewriterText("");
    }
    setResults(p => [...p, r]);
    setRevealed(new Set(Array.from({ length: TOTAL }, (_, i) => i)));
  };

  const giveUp = () => {
    if (result || !rounds) return;
    endRound(false, 0, true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!guess.trim() || result || !rounds) return;
    const n = guess.trim().toLowerCase();
    if (rounds[round].accept.some(a => n === a)) endRound(true, calcScore(revealed.size, time, TIMER));
    else {
      setWrongMsg(WRONG[Math.floor(Math.random() * WRONG.length)](guess.trim()));
      setInputShake(true); setInputBorderFlash(true); setWrongToastSlide(true); setInpXShow(true);
      setTimeout(() => setInputShake(false), 400);
      setTimeout(() => setInputBorderFlash(false), 300);
      setTimeout(() => setInpXShow(false), 400);
      setTimeout(() => setWrongToastSlide(false), 350);
      setTimeout(() => setWrongMsg(""), 2500);
      setGuess("");
    }
  };

  useEffect(() => { roundEndedRef.current = false; }, [round]);

  const nextRound = () => {
    if (round >= rounds.length - 1) { setScreen("results"); setTimeout(() => setShowBar(true), 400); return; }
    setPrevRound(round);
    setTransitionPhase("out");
    setTimeout(() => {
      setRound(r => r + 1);
      initRound();
      setTransitionPhase("in");
      setTimeout(() => setTransitionPhase(null), 200);
    }, 200);
  };

  const pct = (time / TIMER) * 100;
  const maxPts = rounds ? calcScore(revealed.size, time, TIMER) : 1000;

  // ===== START / LOADING =====
  if (screen === "start") return (
    <div className="R"><style>{CSS}</style>
      {!loading && (
        <div
          style={{position:'fixed',inset:0,width:'100%',height:'100%',zIndex:0,pointerEvents:'none'}}
          data-us-project="rM2CAERCn0pScAMGJGl2"
        />
      )}
      <div className={loading ? "S S--loading" : "S"}>
        {loading ? (
          <div className="s-loading s-z">
            <div className="loader-card" style={{width:75,height:75,borderRadius:8,overflow:'hidden',animation:'flip 1.2s ease-in-out infinite',margin:'0 auto 16px',boxShadow:'0 4px 20px rgba(200,230,0,0.2)'}}>
              <img
                key={loadImgIndex}
                src={LOADING_IMAGES[loadImgIndex]}
                alt=""
                style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}}
              />
            </div>
            <div className="s-loading-text" style={{marginBottom:8}}>{loadMsg}</div>
            <div className="s-loading-pct" style={{marginBottom:12}}>{displayProg}%</div>
            <div className="s-loading-bar">
              <div className="s-loading-bar-fill" style={{width:`${displayProg}%`}}/>
            </div>
            <div className="s-loading-tip">{LOADING_TIPS[loadingTipIndex]}</div>
          </div>
        ) : loadError ? (
          <div className="s-z" style={{textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:12}}>—</div>
            <div style={{fontSize:12,color:"#111",fontWeight:700,marginBottom:12,textTransform:"uppercase"}}>{loadError}</div>
            <button className="btn btn-go" onClick={startGame}>Retry</button>
          </div>
        ) : (<>
        {showRules && (
          <div
            className={`modal-backdrop ${modalExiting ? "modal-exit" : ""}`}
            onClick={() => { if (!modalExiting) { setModalExiting(true); setTimeout(() => { setShowRules(false); setModalExiting(false); }, 320); } }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div
              className={`modal-card ${modalExiting ? "modal-exit" : ""}`}
              onClick={e => e.stopPropagation()}
            >
              <button type="button" className="modal-close" onClick={() => { if (!modalExiting) { setModalExiting(true); setTimeout(() => { setShowRules(false); setModalExiting(false); }, 320); } }} aria-label="Close">
                <span className="modal-close-icon" aria-hidden>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M2 2l10 10M12 2L2 12"/></svg>
                </span>
              </button>
              <h2 id="modal-title" className="modal-title">How to Play</h2>
              <div className="modal-rule">
                <span className="modal-rule-badge">1</span>
                <span className="modal-rule-text">Click tiles to peek at the image</span>
              </div>
              <div className="modal-rule">
                <span className="modal-rule-badge">2</span>
                <span className="modal-rule-text">Type the anime name and guess</span>
              </div>
              <div className="modal-rule">
                <span className="modal-rule-badge">3</span>
                <span className="modal-rule-text">Fewer tiles + faster = more points</span>
              </div>
              <p className="modal-score-note">Fewer tiles revealed + faster guess = higher score. Max 1,000 points per round.</p>
            </div>
          </div>
        )}
        <div className="s-logo-wrap s-z">
          <img src="/textmarklogo-aniguess.svg" alt="ANIGUESS°" style={{ height: 36, width: 'auto' }} />
        </div>
        <div className="s-hero s-z start-content">
          <div className="s-hero-left start-left">
            <div className="logo-mark" aria-hidden />
            <h1 className="s-t start-title"><span className="shiny-text">GUESS<br />THE ANIME</span></h1>
            <p className="start-desc">Reveal tiles from hidden anime images<br />and name the anime before time runs out.</p>
            <div className="btn-howto-wrap start-buttons">
              <button className="btn btn-go btn-shimmer" onClick={startGame} style={{'--spread':'90deg','--shimmer-color':'#EAFF60','--radius':'9999px','--speed':'3s','--cut':'0.05em','--bg':'rgba(220, 242, 74, 1)'}}>
                <div className="btn-shimmer-edge">
                  <div className="btn-shimmer-spark" />
                </div>
                <div className="btn-shimmer-fill shimmer-highlight" />
                <span>START GAME</span>
              </button>
              <button type="button" className="btn-howto" onClick={() => setShowRules(true)}>How to Play</button>
            </div>
          </div>
          <div className="s-hero-right">
            <div className="s-stats">
              <div className="s-stat s-stat--chartreuse s-stat--r1"><span className="s-stat-v">{NUM_ROUNDS}</span><span className="s-stat-l">Rounds</span></div>
              <div className="s-stat s-stat--black s-stat--r2"><span className="s-stat-v">{TIMER}s</span><span className="s-stat-l">Per Round</span></div>
              <div className="s-stat s-stat--orange s-stat--r3"><span className="s-stat-v">1K</span><span className="s-stat-l">Max Pts</span></div>
            </div>
          </div>
        </div>
        </>)}
      </div>
    </div>
  );

  // ===== RESULTS =====
  if (screen === "results") {
    const ct = results.filter(r => r.correct).length;
    const blockMod = (r) => r.correct ? "res-block--correct" : "res-block--wrong";
    const displayResults = results.length >= NUM_ROUNDS ? results.slice(0, NUM_ROUNDS) : [...results, ...Array(NUM_ROUNDS - results.length).fill({ correct: false, score: 0, answer: "—", gaveUp: false })];

    const handleAvatarChange = (e) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
      e.target.value = "";
    };

    const saveImage = () => {
      const W = 400, H = 420, scale = 2;
      const padT = 32, padB = 32, padL = 24;
      const c = document.createElement("canvas");
      c.width = W * scale;
      c.height = H * scale;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = "#F5F5F0";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#DEFF0A";
      ctx.fillRect(0, 0, W, 4);
      const blockSize = 48, gap = 6, cols = 5;
      const gridRows = Math.ceil(displayResults.length / cols);
      const gridHeight = gridRows * blockSize + (gridRows - 1) * gap;
      const contentHeight = 24 + 4 + 56 + 2 + 12 + 16 + gridHeight + 16;
      const noAvatarNoName = !avatar && !playerName.trim();
      const contentStartY = noAvatarNoName
        ? (H - contentHeight) / 2
        : padT;
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        let y = contentStartY;
        if (avatar) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(200, y + 40, 40, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            const d = 80;
            const scale = Math.max(d / img.naturalWidth, d / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 200 - dw / 2, y + 40 - dh / 2, dw, dh);
            ctx.restore();
            y += 88;
            drawRest(false);
          };
          img.onerror = () => { y += 48; drawRest(false); };
          img.src = avatar;
        } else if (!noAvatarNoName && playerName.trim()) {
          ctx.fillStyle = "#888";
          ctx.font = "700 12px 'Bricolage Grotesque',sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(playerName.trim().toUpperCase(), 200, y + 8);
          y += 28;
          drawRest(true);
        } else {
          drawRest(true);
        }
        function drawRest(skipName) {
          if (!skipName && playerName.trim()) {
            ctx.fillStyle = "#888";
            ctx.font = "700 12px 'Bricolage Grotesque',sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(playerName.trim().toUpperCase(), 200, y + 8);
            y += 28;
          }
          const logoH = 22;
          const logoW = logoImg.naturalWidth / logoImg.naturalHeight * logoH;
          ctx.drawImage(logoImg, 200 - logoW / 2, y + 1, logoW, logoH);
          y += 24 + 4;
          ctx.font = "900 56px 'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif";
          ctx.fillText(total.toLocaleString(), 200, y + 28);
          y += 56 + 2;
          ctx.fillStyle = "#888";
          ctx.font = "400 12px 'Bricolage Grotesque',sans-serif";
          ctx.fillText(`${ct}/${rounds.length} CORRECT`, 200, y + 6);
          y += 12 + 16;
          const startX = (W - cols * blockSize - (cols - 1) * gap) / 2;
          const r2 = 8;
          for (let i = 0; i < displayResults.length; i++) {
            const r = displayResults[i];
            const row = Math.floor(i / 5), col = i % 5;
            const x = startX + col * (blockSize + gap), by = y + row * (blockSize + gap);
            ctx.fillStyle = r.correct ? "#DEFF0A" : "#111";
            ctx.beginPath();
            ctx.moveTo(x + r2, by);
            ctx.lineTo(x + blockSize - r2, by);
            ctx.quadraticCurveTo(x + blockSize, by, x + blockSize, by + r2);
            ctx.lineTo(x + blockSize, by + blockSize - r2);
            ctx.quadraticCurveTo(x + blockSize, by + blockSize, x + blockSize - r2, by + blockSize);
            ctx.lineTo(x + r2, by + blockSize);
            ctx.quadraticCurveTo(x, by + blockSize, x, by + blockSize - r2);
            ctx.lineTo(x, by + r2);
            ctx.quadraticCurveTo(x, by, x + r2, by);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = r.correct ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = r.correct ? "#111" : "#555";
            ctx.font = r.correct ? "900 20px 'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif" : "700 16px 'Cabinet Grotesk','Helvetica Neue','Arial',sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(r.correct ? "✓" : "✕", x + blockSize / 2, by + blockSize / 2);
          }
          ctx.fillStyle = "#bbb";
          ctx.font = "400 10px 'Bricolage Grotesque',sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("PLAY AT ANIGUESS.COM", 200, H - 16);
          const link = document.createElement("a");
          link.download = "aniguess-score.png";
          link.href = c.toDataURL("image/png");
          link.click();
          setImageSaved(true);
          setTimeout(() => setImageSaved(false), 2000);
        }
      };
      logoImg.onerror = () => {};
      logoImg.src = "/textmarklogo-aniguess.svg";
    };

    return (
      <div className="R"><style>{CSS}</style>
        <div className="S S--results">
          {showConfetti && (
            <div className="confetti-wrap" style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:50}}>
              {confettiPieces.map(p=>(
                <div key={p.id} className="confetti-piece" style={{
                  background:p.color,
                  "--cx":`${p.cx}px`,"--cy":`${p.cy}px`,"--rot":`${p.rot}deg`
                }}/>
              ))}
            </div>
          )}
          <div className="res-wrap">
            <div className="res-profile">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <div className="res-avatar" onClick={() => avatarInputRef.current?.click()} role="button" tabIndex={0} aria-label="Upload profile image" title="Click to upload image" onKeyDown={e => e.key === "Enter" && avatarInputRef.current?.click()}>
                {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : (
                  <span className="res-avatar-icon" aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="res-name-input-wrap">
                <span className="res-name-input-edit-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </span>
                <input
                  type="text"
                  className="res-name-input"
                  placeholder="YOUR NAME, SENPAI"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                />
              </div>
            </div>
            <h1 className="res-title">{getResultTitle(total)}</h1>
            <div className="res-score">{total.toLocaleString()}</div>
            <div className="res-meta">{ct}/{rounds.length} correct</div>
            <div className="res-grid">
              {displayResults.map((r, i) => (
                <div
                  key={i}
                  className={`res-block ${blockMod(r)}`}
                  style={{
                    animation: "blockReveal 0.3s ease backwards",
                    animationDelay: `${i * 100}ms`,
                  }}
                >
                  {r.correct ? (
                    <span className="res-block-icon" style={{ fontSize: 24, fontWeight: 900, color: '#111' }}>✓</span>
                  ) : (
                    <span className="res-block-icon" style={{ fontSize: 20, fontWeight: 700, color: '#555' }}>✕</span>
                  )}
                </div>
              ))}
            </div>
            <div className="res-rows">
              {displayResults.map((r, i) => (
                <div key={i} className="res-row">
                  <span className="res-row-label">R{i + 1}</span>
                  <span className="res-row-title">{r.answer}</span>
                  <span className={`res-pill ${r.correct ? "res-pill--correct" : "res-pill--wrong"}`}>
                    {r.correct ? r.score : "MISS"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="results-footer">
            <div className="res-actions">
              <button type="button" className="btn-play-again-outline" onClick={() => { setScreen("start"); startGame(); }}>
                Play Again
              </button>
              <button type="button" className="btn-share" onClick={saveImage}>
                <span aria-hidden>↓</span>
                {imageSaved ? "SAVED!" : "SAVE IMAGE"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== PLAYING =====
  if (!rounds) return null;
  const rd = rounds[round];
  const bc = `B ${revealed.size > 0 ? "vis" : ""} ${isShaking ? "board-shake" : ""} ${boardPulse ? "board-correct-pulse" : ""}`;

  const handleTileClick = (i) => {
    if (revealed.has(i) || result || flippingTiles.has(i)) return;
    setFlippingTiles(s => new Set(s).add(i));
    setRippleTile(i);
    setTimeout(() => {
      setRevealed(p => new Set(p).add(i));
      setFlippingTiles(s => { const n = new Set(s); n.delete(i); return n; });
      setRippleTile(null);
    }, 250);
  };

  return (
    <div className="R"><style>{CSS}</style>
      <div className="S P">
        <div className="play-wrap" style={{position:"relative"}}>
          <div className={`play-main ${transitionPhase === "out" ? "slide-out" : transitionPhase === "in" ? "slide-in" : ""}`}>
            <div className="H">
              <div className="H-top">
                <div className="H-l">
                  <div className="rnd">R{round+1}/{rounds.length}</div>
                  <div className="dots">
                    {rounds.map((_,i)=>(
                      <div key={i} className="dot" style={{
                        background:i<round?"#111":i===round?"#C8E600":"#ddd"
                      }}/>
                    ))}
                  </div>
                </div>
                <div className="H-sc">
                  <span className="H-sc-streak-wrap" title="Correct guesses in a row" style={{display:"flex",alignItems:"center",gap:"inherit",cursor:"help"}}>
                    <div className={`flame ${streak === 0 ? "flame--muted" : streak >= 5 ? "flame--hype" : streak >= 3 ? "flame--pulse" : ""}`} aria-hidden />
                    <span className={`H-streak ${streak === 0 ? "H-streak--zero" : ""}`}>×{streak}</span>
                  </span>
                  <span className="H-divider">·</span>
                  <span className={`H-sc-n ${scorePulse ? "score-pulse" : ""}`}>{total.toLocaleString()}<span className="H-sc-pts"> PTS</span></span>
                </div>
              </div>
              <div className="Tw">
                <div className={`Tf ${time > 0 && time < 5 ? "timer-bar-urgent" : time > 0 && time < 15 ? "timer-bar-orange" : ""}`} style={{width:`${pct}%`}}/>
              </div>
              <div className="Tm">
                <span className={`Ts ${time > 0 && time < 15 ? "timer-urgent" : ""} ${time > 0 && time < 5 ? "timer-critical" : ""}`}>{time}s</span>
                <span className="Ti">{revealed.size}/{TOTAL} tiles · max <em>{maxPts}</em> pts</span>
              </div>
            </div>

            <div className="board-wrap">
            <div className={bc} style={{position:"relative"}}>
              {showOverlay && <div className="result-overlay" aria-hidden />}
              <img src={rd.image} alt=""/>
              <div className="G">
                {Array.from({length:TOTAL},(_,i)=>(
                  <div
                    key={i}
                    className={`tile ${revealed.has(i)?"X":""} ${flippingTiles.has(i)?"tile-flipping":""} ${cascadeReveal?"tile-cascade":""}`}
                    style={cascadeReveal ? { animationDelay: `${i * 30}ms` } : undefined}
                    onClick={()=>handleTileClick(i)}
                  >
                    {!revealed.has(i) && !flippingTiles.has(i) && <span className="tn">{i+1}</span>}
                    {rippleTile === i && <span className="tile-ripple" />}
                  </div>
                ))}
              </div>
              {floats.map(f=>(
                <div key={f.id} className="float-score-text" style={{
                  position:"absolute",left:`${f.x}%`,top:"40%",zIndex:10,
                  pointerEvents:"none",
                  color:"#DEFF0A",
                  textShadow:"0 2px 8px rgba(0,0,0,0.7), 0 0 16px rgba(222,255,10,0.3)",
                  WebkitTextStroke:"1px #111"
                }}>{f.text}</div>
              ))}
            </div>
            </div>

            {result&&(
              <div className={`res ${result.correct ? "res--correct" : ""}`}>
                {result.correct?(<>
                  <div className="res-e bounce-in">✓</div>
                  <div className="res-p score-flash">+{displayScore} pts</div>
                  <div className="res-sp">{speedLabel(time)}</div>
                </>):(<>
                  <div className="res-e">✗</div>
                  <div className="res-l">{result.gaveUp?"Gave Up":time===0?"Time's Up":"Wrong"}</div>
                  <div className={`res-miss ${typewriterText ? "typewriter" : ""}`}>
                    {typewriterText ? <>It was <strong>{typewriterText.slice(7)}</strong></> : `It was ${rd.hint}`}
                  </div>
                </>)}
              </div>
            )}

            <div className="I">
              {!result?(<>
                <form className="input-row" onSubmit={handleSubmit}>
                  <input ref={inputRef} type="text" value={guess} onChange={e=>setGuess(e.target.value)}
                    placeholder="TYPE ANIME NAME" autoComplete="off"
                    aria-label="Type your anime guess"
                    className={`game-input ${wrongMsg?"error":""}`}/>
                  <div className="input-row-actions">
                    <button type="submit" className="btn-confirm" aria-label="Submit guess">
                      CONFIRM
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                    <button type="button" className="btn-giveup-ghost" onClick={giveUp} aria-label="Give up">
                      <span>GIVE UP</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="giveup-flag" aria-hidden>
                        <defs>
                          <linearGradient id="giveup-pole" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="currentColor" stopOpacity="0.5"/>
                            <stop offset="30%" stopColor="currentColor"/>
                            <stop offset="100%" stopColor="currentColor"/>
                          </linearGradient>
                          <linearGradient id="giveup-flag-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#FFF"/>
                            <stop offset="100%" stopColor="#E8E8E2"/>
                          </linearGradient>
                          <filter id="giveup-shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodOpacity="0.2"/>
                          </filter>
                        </defs>
                        <ellipse cx="12" cy="21.5" rx="4" ry="1" fill="rgba(0,0,0,0.08)" />
                        <rect x="4" y="2" width="2.5" height="20" rx="1.25" fill="url(#giveup-pole)" />
                        <path d="M6.5 3 L19.5 5 L18.5 12.5 L6.5 10.5 Z" fill="url(#giveup-flag-fill)" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" filter="url(#giveup-shadow)" />
                        <path d="M6.5 3 L15 4.2 L14.2 8.5 L6.5 7.2 Z" fill="rgba(255,255,255,0.7)" />
                        <circle cx="5.25" cy="2.5" r="1.4" fill="currentColor"/>
                        <circle cx="4.9" cy="2" r="0.4" fill="rgba(255,255,255,0.85)"/>
                      </svg>
                    </button>
                  </div>
                </form>
                {wrongMsg&&<div role="status" className={`wrong-toast ${wrongToastSlide?"toast-enter":""}`}>{wrongMsg}</div>}
              </>):(
                <button className="btn btn-nxt" onClick={nextRound}>
                  {round<rounds.length-1?"Next Round →":"See Results →"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
