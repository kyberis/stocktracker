"use client";

interface Props {
  size?: number;
  className?: string;
  thinking?: boolean;
}

export default function WarrentAvatar({ size = 44, className = "", thinking = false }: Props) {
  return (
    <span
      className={`inline-block rounded-full overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="warrent-bg" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#f1d2a3" />
            <stop offset="55%" stopColor="#b58457" />
            <stop offset="100%" stopColor="#5e3a20" />
          </radialGradient>
          <linearGradient id="warrent-suit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2718" />
            <stop offset="100%" stopColor="#1a0f08" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="32" fill="url(#warrent-bg)" />
        <path d="M6 64 C 10 48, 20 44, 32 44 C 44 44, 54 48, 58 64 Z" fill="url(#warrent-suit)" />
        <path d="M27 46 L32 54 L37 46 Z" fill="#e9dcc4" opacity="0.85" />
        <rect x="28" y="38" width="8" height="8" fill="#d4a574" opacity="0.6" />
        <ellipse cx="32" cy="28" rx="13" ry="14" fill="#e6c39a" />
        <path
          d="M19 22 C 22 14, 42 14, 45 22 C 45 22, 41 18, 32 18 C 23 18, 19 22, 19 22 Z"
          fill="#e8e2d6"
        />
        <path
          d="M19 22 C 21 19, 28 17, 32 17 C 36 17, 43 19, 45 22 L 45 25 C 43 22, 36 21, 32 21 C 28 21, 21 22, 19 25 Z"
          fill="#cfc7b6"
          opacity="0.6"
        />
        <circle
          cx="26"
          cy="29"
          r="3.6"
          fill="none"
          stroke="#d4a056"
          strokeWidth="1.2"
          className={thinking ? "animate-pulse" : ""}
        />
        <circle
          cx="38"
          cy="29"
          r="3.6"
          fill="none"
          stroke="#d4a056"
          strokeWidth="1.2"
          className={thinking ? "animate-pulse" : ""}
        />
        <line x1="29.6" y1="29" x2="34.4" y2="29" stroke="#d4a056" strokeWidth="1.2" />
        <line x1="22.4" y1="29" x2="20" y2="28.5" stroke="#d4a056" strokeWidth="1.2" />
        <line x1="41.6" y1="29" x2="44" y2="28.5" stroke="#d4a056" strokeWidth="1.2" />
        <circle cx="26" cy="29" r="1" fill="#2a1a0c" />
        <circle cx="38" cy="29" r="1" fill="#2a1a0c" />
        <path
          d="M27 36 Q 32 39 37 36"
          stroke="#7a4a28"
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="22" cy="34" r="1.6" fill="#e29572" opacity="0.25" />
        <circle cx="42" cy="34" r="1.6" fill="#e29572" opacity="0.25" />
        <path d="M30 46 L34 46 L33 56 L31 56 Z" fill="#8a3b2e" opacity="0.75" />
      </svg>
    </span>
  );
}
