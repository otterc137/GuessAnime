import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';

const SPARKLE_COLORS = { first: '#DEFF0A', second: '#FF6B35' };

function Sparkle({ id, x, y, color, delay, scale }) {
  return (
    <motion.svg
      key={id}
      className="mega-footer-sparkle"
      initial={{ opacity: 0, left: x, top: y }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, scale, 0],
        rotate: [75, 120, 150],
      }}
      transition={{ duration: 1.0, repeat: Infinity, delay }}
      width="21"
      height="21"
      viewBox="0 0 21 21"
    >
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        fill={color}
      />
    </motion.svg>
  );
}

// Add your 5-6 images here (paths under /public)
const TILE_IMAGES = [
  '/footer-tiles/1.png', '/footer-tiles/2.png', '/footer-tiles/3.png',
  '/footer-tiles/4.png', '/footer-tiles/5.png', '/footer-tiles/6.png',
  '/footer-tiles/7.png', '/footer-tiles/8.png', '/footer-tiles/9.png',
  '/footer-tiles/10.png', '/footer-tiles/11.png', '/footer-tiles/12.png',
  '/footer-tiles/13.png', '/footer-tiles/14.png', '/footer-tiles/15.png',
];

const TAGLINES = [
  "Pochita-approved tile reveals",
  "Panda's third core says: guess it",
  "Would Pochita approve? Probably.",
  "I'm a panda. So what? You: I'm guessing.",
  "Bread for correct answers. (Pochita rules.)",
  "Panda's other cores are judging",
  "Pochita dreamt of this moment",
  "Even Panda's surprised you got that one",
  "Your inner Pochita knows the answer",
];

function pickRandomImage() {
  return TILE_IMAGES[Math.floor(Math.random() * TILE_IMAGES.length)];
}

function GridTile() {
  const [flipped, setFlipped] = useState(false);
  const [backImage, setBackImage] = useState(() => pickRandomImage());

  const handleFlip = () => {
    setBackImage(pickRandomImage());
    setFlipped(true);
  };

  const handleUnflip = () => {
    setFlipped(false);
  };

  return (
    <div
      className="mega-footer-tile"
      onMouseEnter={handleFlip}
      onMouseLeave={handleUnflip}
      onClick={handleFlip}
    >
      <div className={`mega-footer-tile-inner ${flipped ? 'mega-footer-tile-inner--flipped' : ''}`}>
        <div className="mega-footer-tile-front">?</div>
        <div className="mega-footer-tile-back">
          <img src={backImage} alt="" className="mega-footer-tile-img" />
        </div>
      </div>
    </div>
  );
}

function useTypewriter(text, speed = 40) {
  const [displayed, setDisplayed] = useState(text);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTyping(true);
    setDisplayed('');
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      i++;
      setDisplayed(text.slice(0, i));
      if (i < text.length) {
        setTimeout(tick, speed);
      } else {
        setTyping(false);
      }
    };
    setTimeout(tick, speed);
    return () => { cancelled = true; };
  }, [text, speed]);

  return { displayed, typing };
}

export function MegaFooter() {
  const [tagline, setTagline] = useState(TAGLINES[0]);
  const { displayed: typedTagline, typing } = useTypewriter(tagline, 35);
  const [sparkles, setSparkles] = useState([]);

  useEffect(() => {
    const generateSparkle = () => {
      const x = `${Math.random() * 100}%`;
      const y = `${Math.random() * 100}%`;
      const color = Math.random() > 0.5 ? SPARKLE_COLORS.first : SPARKLE_COLORS.second;
      const delay = Math.random() * 2;
      const scale = Math.random() * 0.8 + 0.4;
      const lifespan = Math.random() * 10 + 5;
      return { id: `${x}-${y}-${Date.now()}`, x, y, color, delay, scale, lifespan };
    };
    const init = () => setSparkles(Array.from({ length: 12 }, generateSparkle));
    const update = () => {
      setSparkles((prev) =>
        prev.map((s) => (s.lifespan <= 0 ? generateSparkle() : { ...s, lifespan: s.lifespan - 0.1 }))
      );
    };
    init();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pickRandom = () => setTagline(TAGLINES[Math.floor(Math.random() * TAGLINES.length)]);
    const id = setInterval(pickRandom, 15000);
    return () => clearInterval(id);
  }, []);

  const logoRef = useRef(null);
  const isLogoInView = useInView(logoRef, { once: true });

  return (
    <footer className="mega-footer">
      <div ref={logoRef} className="mega-footer-logo">
        <Link to="/" aria-label="ANIGUESS Home" className="mega-footer-logo-link">
          {sparkles.map((s) => (
            <Sparkle key={s.id} {...s} />
          ))}
          <motion.span
            className="mega-footer-logo-wrap"
            initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
            animate={isLogoInView ? { opacity: 1, clipPath: 'inset(0 0% 0 0)' } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src="/footerlogo-aniguess.svg" alt="ANIGUESS°" className="mega-footer-logo-img" />
          </motion.span>
        </Link>
      </div>
      <div className="mega-footer-tagline-row">
        <p className="mega-footer-tagline">
          {typedTagline}
          <span className={`mega-footer-cursor ${typing ? '' : 'mega-footer-cursor--hidden'}`}>|</span>
        </p>
        <GridTile />
      </div>
      <style>{`
        .mega-footer {
          padding: 32px 12px 32px;
          margin-top: auto;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(
            165deg,
            #2a2a2d 0%,
            #313136 18%,
            #28282c 38%,
            #232327 55%,
            #2e2e33 75%,
            #262629 100%
          );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.07),
            inset 0 -1px 0 rgba(0,0,0,0.3),
            0 -1px 3px rgba(0,0,0,0.1);
        }
        .mega-footer::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.04) 0%,
              transparent 40%,
              rgba(255,255,255,0.02) 60%,
              transparent 100%
            ),
            radial-gradient(
              ellipse 80% 50% at 30% 20%,
              rgba(255,255,255,0.03) 0%,
              transparent 100%
            );
          pointer-events: none;
        }
        .mega-footer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.08) 20%,
            rgba(255,255,255,0.12) 50%,
            rgba(255,255,255,0.08) 80%,
            transparent 100%
          );
          pointer-events: none;
        }
        .mega-footer-logo {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 1;
          margin-bottom: 8px;
          width: 100%;
          max-width: 100%;
          padding: 0 12px;
          overflow: visible;
          box-sizing: border-box;
        }
        .mega-footer-logo a,
        .mega-footer-logo-link {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 100%;
          text-decoration: none;
          padding: 20px 0;
          box-sizing: border-box;
        }
        .mega-footer-sparkle {
          position: absolute;
          pointer-events: none;
          z-index: 10;
        }
        .mega-footer-logo-wrap {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow: visible;
        }
        .mega-footer-logo-img {
          width: 100%;
          max-width: 100%;
          height: auto;
          min-height: 36px;
          display: block;
          object-fit: contain;
          object-position: center;
          opacity: 1;
        }
        @media (max-width: 374px) {
          .mega-footer-logo { padding: 0 8px; }
          .mega-footer-logo a { padding: 16px 0; }
          .mega-footer-logo-img { min-height: 32px; }
        }
        .mega-footer-tagline-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
          position: relative;
          z-index: 1;
        }
        .mega-footer-tagline {
          font-family: 'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 12px;
          color: rgba(239, 236, 232, 0.65);
          margin: 0;
          letter-spacing: 0.02em;
          width: fit-content;
          min-height: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .mega-footer-cursor {
          display: inline-block;
          margin-left: 1px;
          font-weight: 300;
          animation: mega-footer-blink 0.6s step-end infinite;
        }
        .mega-footer-cursor--hidden {
          opacity: 0;
          animation: none;
        }
        @keyframes mega-footer-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .mega-footer-tile {
          position: relative;
          z-index: 1;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 8px;
          cursor: pointer;
          perspective: 400px;
        }
        .mega-footer-tile-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.5s ease;
        }
        .mega-footer-tile-inner--flipped {
          transform: rotateY(180deg);
        }
        .mega-footer-tile-front,
        .mega-footer-tile-back {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mega-footer-tile-front {
          background: linear-gradient(135deg, #1a1a1c 0%, #252527 50%, #1e1e20 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2);
          font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
        }
        .mega-footer-tile-back {
          transform: rotateY(180deg);
          background: #111;
        }
        .mega-footer-tile-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        @media (min-width: 480px) {
          .mega-footer-logo { padding: 0 16px; }
          .mega-footer-logo a { padding: 24px 0; }
          .mega-footer-logo-img { min-height: 56px; }
        }
        @media (min-width: 641px) {
          .mega-footer-tagline { font-size: 14px; }
        }
        @media (min-width: 768px) {
          .mega-footer { padding: 16px 24px 32px; }
          .mega-footer-logo { padding: 0 24px; margin-bottom: 12px; }
          .mega-footer-logo a { padding: 28px 0; }
          .mega-footer-logo-img { min-height: 72px; }
        }
        @media (min-width: 1024px) {
          .mega-footer-logo { max-width: 900px; margin-left: auto; margin-right: auto; padding: 0 32px; }
          .mega-footer-logo a { padding: 32px 0; }
          .mega-footer-logo-img { min-height: 80px; }
        }
        @media (min-width: 1280px) {
          .mega-footer-logo { max-width: 1000px; padding: 0 48px; }
          .mega-footer-logo-img { min-height: 90px; }
        }
      `}</style>
    </footer>
  );
}
