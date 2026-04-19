"use client";

// NOVA — StarApp official logo
// 4-arm asymmetric star. Imperfection is intentional — see README for rationale.
// Path from design spec: M 4,-66 C 16,-10 16,-8 55,5 C 7,13 5,15 -3,46 C -14,6 -16,4 -60,-4 C -9,-14 -7,-16 4,-66 Z

function starPath(s: number): string {
  return [
    `M ${4 * s},${-66 * s}`,
    `C ${16 * s},${-10 * s} ${16 * s},${-8 * s} ${55 * s},${5 * s}`,
    `C ${7 * s},${13 * s} ${5 * s},${15 * s} ${-3 * s},${46 * s}`,
    `C ${-14 * s},${6 * s} ${-16 * s},${4 * s} ${-60 * s},${-4 * s}`,
    `C ${-9 * s},${-14 * s} ${-7 * s},${-16 * s} ${4 * s},${-66 * s} Z`,
  ].join(" ");
}

interface NovaIconProps {
  size?: number;
  bg?: string | "transparent";
  rounded?: boolean;
}

export function NovaIcon({ size = 200, bg = "#07071A", rounded = true }: NovaIconProps) {
  const rx = rounded ? size * 0.225 : 0;
  const uid = `nova_${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}_fill`} x1="50" y1="20" x2="150" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DEC4FF" />
          <stop offset="40%" stopColor="#7F47DD" />
          <stop offset="100%" stopColor="#3A0E9E" />
        </linearGradient>
        <linearGradient id={`${uid}_fillw`} x1="50" y1="20" x2="150" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7F47DD" />
          <stop offset="100%" stopColor="#3A0E9E" />
        </linearGradient>
        <radialGradient id={`${uid}_light`} cx="38%" cy="30%" r="52%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}_shd`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b" />
          <feOffset dx="2" dy="3" in="b" result="o" />
          <feFlood floodColor="#1A0050" floodOpacity="0.5" result="c" />
          <feComposite in="c" in2="o" operator="in" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {bg !== "transparent" && (
        <rect width="200" height="200" rx={rx} fill={bg} />
      )}

      <g transform="translate(100,102)" filter={`url(#${uid}_shd)`}>
        <path
          d={starPath(1)}
          fill={
            bg === "white" || bg === "#FAFAFA" || bg === "#F5F5F5"
              ? `url(#${uid}_fillw)`
              : `url(#${uid}_fill)`
          }
        />
        <path d={starPath(1)} fill={`url(#${uid}_light)`} />
      </g>
    </svg>
  );
}

interface NovaWordmarkProps {
  dark?: boolean;
  showTag?: boolean;
  height?: number;
}

export function NovaWordmark({ dark = true, showTag = true, height = 48 }: NovaWordmarkProps) {
  const W = showTag ? 250 : 185;
  const H = height;
  const scale = H / 48;

  const bg = dark ? "#07071A" : "#FAFAFA";
  const textMain = dark ? "#FFFFFF" : "#0E0E2C";
  const textAccent = dark ? "#DEC4FF" : "#7F47DD";
  const tagColor = dark ? "rgba(180,144,245,0.50)" : "rgba(127,71,221,0.45)";
  const uid = `wm_${dark ? "d" : "l"}`;
  // Star at scale 0.40: top arm = 66*0.40 = 26.4px, bottom = 46*0.40 = 18.4px, total 44.8 → fits in 48px
  // Center at cy=29 so top reaches 29-26.4=2.6 (safe), bottom 29+18.4=47.4 (safe)
  // Left arm = 60*0.40=24px, cx=26 so left edge=2 (safe)
  const iconScale = 0.40 * scale;
  const fontSize = 17 * scale;
  const tagSize = 5.5 * scale;
  const cx = 26 * scale;
  const cy = 29 * scale;
  const textX = 58 * scale;   // star right arm ends at ~48, gap of ~10px before text
  const textY = 22 * scale;
  const tagY = 35 * scale;
  const accentX = 114 * scale;

  // Extra left padding so the star doesn't sit flush at the SVG edge,
  // making the whole wordmark feel visually centered when placed in a flex container
  const lp = 10 * scale;

  return (
    <svg
      width={W * scale + lp}
      height={H}
      viewBox={`-${lp} 0 ${W * scale + lp} ${H}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${uid}_ig`} x1="14" y1="9" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DEC4FF" />
          <stop offset="100%" stopColor="#3A0E9E" />
        </linearGradient>
        <linearGradient id={`${uid}_igw`} x1="14" y1="9" x2="36" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7F47DD" />
          <stop offset="100%" stopColor="#3A0E9E" />
        </linearGradient>
        <radialGradient id={`${uid}_il`} cx="38%" cy="30%" r="52%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}_shd`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b" />
          <feOffset dx="1" dy="1.5" in="b" result="o" />
          <feFlood floodColor="#1A0050" floodOpacity="0.4" result="c" />
          <feComposite in="c" in2="o" operator="in" result="s" />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Nova star icon */}
      <g transform={`translate(${cx},${cy})`} filter={`url(#${uid}_shd)`}>
        <path
          d={starPath(iconScale)}
          fill={dark ? `url(#${uid}_ig)` : `url(#${uid}_igw)`}
        />
        <path d={starPath(iconScale)} fill={`url(#${uid}_il)`} />
      </g>

      {/* STAR */}
      <text
        x={textX}
        y={textY}
        fontFamily="'Geist', 'Poppins', sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing={3 * scale}
        fill={textMain}
      >
        STAR
      </text>

      {/* APP */}
      <text
        x={accentX}
        y={textY}
        fontFamily="'Geist', 'Poppins', sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing={3 * scale}
        fill={textAccent}
      >
        APP
      </text>

      {/* Tagline */}
      {showTag && (
        <text
          x={textX}
          y={tagY}
          fontFamily="'Geist', 'Poppins', sans-serif"
          fontWeight="300"
          fontSize={tagSize}
          letterSpacing={3.5 * scale}
          fill={tagColor}
        >
          PLATAFORMA DEPORTIVA
        </text>
      )}
    </svg>
  );
}
