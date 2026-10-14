import { ITEMS, type ItemId } from "@/game/data/items";

/** Ícones vetoriais low-poly para cada item (combinam com a estética do jogo). */
export function ItemIcon({ id, size = 22 }: { id: ItemId; size?: number }) {
  const it = ITEMS[id];
  const c = it.color;
  const a = it.accent;
  const dark = "rgba(0,0,0,0.28)";
  let body: React.ReactNode;
  switch (it.shape) {
    case "log":
      body = (
        <>
          <rect x="4" y="11" width="20" height="10" rx="5" fill={c} />
          <rect x="4" y="11" width="20" height="4" rx="2" fill={a} opacity="0.35" />
          <ellipse cx="24" cy="16" rx="4" ry="5" fill={a} />
          <ellipse cx="24" cy="16" rx="1.8" ry="2.4" fill={c} />
        </>
      );
      break;
    case "rock":
      body = (
        <>
          <polygon points="6,22 9,11 17,7 25,11 27,21 18,26" fill={c} />
          <polygon points="9,11 17,7 25,11 16,15" fill={a} />
          <polygon points="16,15 25,11 27,21 18,26" fill={dark} />
        </>
      );
      break;
    case "ore":
      body = (
        <>
          <polygon points="5,22 8,11 16,7 25,10 27,21 17,26" fill={c} />
          <polygon points="8,11 16,7 25,10 15,15" fill="rgba(255,255,255,0.18)" />
          <polygon points="15,15 25,10 27,21 17,26" fill={dark} />
          <polygon points="11,15 14,13 15,17 12,18" fill={a} />
          <polygon points="19,18 22,16 23,20 20,21" fill={a} />
        </>
      );
      break;
    case "crystal":
      body = (
        <>
          <polygon points="16,3 21,10 19,27 13,27 11,10" fill={c} />
          <polygon points="16,3 21,10 16,12 11,10" fill={a} />
          <polygon points="16,12 21,10 19,27 16,27" fill="rgba(0,0,0,0.15)" />
          <polygon points="7,14 10,17 9,27 5,27 4,18" fill={c} opacity="0.8" />
          <polygon points="25,13 28,17 27,27 23,27 22,17" fill={a} opacity="0.85" />
        </>
      );
      break;
    case "plank":
      body = (
        <>
          <rect x="4" y="9" width="24" height="6" rx="1.5" fill={c} />
          <rect x="4" y="17" width="24" height="6" rx="1.5" fill={a} />
          <line x1="8" y1="12" x2="14" y2="12" stroke={dark} strokeWidth="1" />
          <line x1="16" y1="20" x2="24" y2="20" stroke={dark} strokeWidth="1" />
        </>
      );
      break;
    case "brick":
      body = (
        <>
          <polygon points="4,14 18,9 28,13 14,18" fill={a} />
          <polygon points="4,14 14,18 14,25 4,21" fill={c} />
          <polygon points="14,18 28,13 28,20 14,25" fill={dark} />
          <polygon points="14,18 28,13 28,20 14,25" fill={c} opacity="0.7" />
        </>
      );
      break;
    case "plate":
      body = (
        <>
          <polygon points="3,16 16,10 29,16 16,22" fill={a} />
          <polygon points="3,16 16,22 16,25 3,19" fill={c} />
          <polygon points="16,22 29,16 29,19 16,25" fill={dark} />
          <polygon points="16,22 29,16 29,19 16,25" fill={c} opacity="0.6" />
          <line x1="9" y1="15" x2="17" y2="12" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
        </>
      );
      break;
    case "gear": {
      const teeth = Array.from({ length: 8 }, (_, i) => {
        const ang = (i / 8) * Math.PI * 2;
        const x = 16 + Math.cos(ang) * 11;
        const y = 16 + Math.sin(ang) * 11;
        return <rect key={i} x={x - 2.5} y={y - 2.5} width="5" height="5" rx="1" fill={c} transform={`rotate(${(ang * 180) / Math.PI} ${x} ${y})`} />;
      });
      body = (
        <>
          {teeth}
          <circle cx="16" cy="16" r="9.5" fill={c} />
          <circle cx="16" cy="16" r="9.5" fill={a} opacity="0.3" />
          <circle cx="16" cy="16" r="3.5" fill="#1b2238" />
        </>
      );
      break;
    }
    case "coil":
      body = (
        <>
          <rect x="8" y="6" width="16" height="3" rx="1" fill="#6b7280" />
          <rect x="8" y="23" width="16" height="3" rx="1" fill="#6b7280" />
          <rect x="10" y="9" width="12" height="14" fill={c} />
          {[11, 14, 17, 20].map((y) => (
            <line key={y} x1="10" y1={y} x2="22" y2={y + 1} stroke={a} strokeWidth="1.4" />
          ))}
        </>
      );
      break;
    case "chip":
      body = (
        <>
          {[9, 14, 19, 24].map((x) => (
            <g key={x}>
              <rect x={x - 1} y="3" width="2" height="5" fill="#cbd5e1" />
              <rect x={x - 1} y="24" width="2" height="5" fill="#cbd5e1" />
            </g>
          ))}
          <rect x="5" y="7" width="22" height="18" rx="3" fill={c} />
          <rect x="11" y="11" width="10" height="10" rx="1.5" fill="#1f2937" />
          <rect x="13" y="13" width="6" height="6" rx="1" fill={a} />
        </>
      );
      break;
    case "ingot":
      body = (
        <>
          <polygon points="5,20 9,12 23,12 27,20" fill={a} />
          <polygon points="5,20 27,20 27,24 5,24" fill={c} />
          <polygon points="9,12 23,12 21,14 11,14" fill="rgba(255,255,255,0.35)" />
        </>
      );
      break;
    case "motor":
      body = (
        <>
          <rect x="5" y="9" width="17" height="14" rx="3" fill={c} />
          {[8, 11, 14, 17].map((x) => (
            <rect key={x} x={x} y="9" width="1.6" height="14" fill="rgba(0,0,0,0.25)" />
          ))}
          <rect x="22" y="13" width="4" height="6" fill="#9ca3af" />
          <rect x="26" y="15" width="3" height="2" fill="#e5e7eb" />
          <rect x="8" y="23" width="11" height="3" rx="1" fill="#374151" />
          <circle cx="13" cy="9" r="2" fill={a} />
        </>
      );
      break;
    case "computer":
      body = (
        <>
          <rect x="4" y="6" width="24" height="16" rx="2.5" fill={c} />
          <rect x="6.5" y="8.5" width="19" height="11" rx="1" fill={a} opacity="0.9" />
          <polyline points="8,16 12,12 15,15 19,10 24,14" fill="none" stroke="#0f172a" strokeWidth="1.4" />
          <rect x="13" y="22" width="6" height="3" fill="#64748b" />
          <rect x="9" y="25" width="14" height="2" rx="1" fill="#94a3b8" />
        </>
      );
      break;
    case "flask":
      body = (
        <>
          <path d="M13 5 h6 v7 l7 12 a2 2 0 0 1 -2 3 h-16 a2 2 0 0 1 -2 -3 l7 -12z" fill="rgba(255,255,255,0.22)" />
          <path d="M10 19 h12 l3.4 5.4 a1.6 1.6 0 0 1 -1.4 2.6 h-16 a1.6 1.6 0 0 1 -1.4 -2.6z" fill={c} />
          <circle cx="14" cy="22" r="1.4" fill={a} />
          <circle cx="18" cy="24" r="1" fill={a} />
          <rect x="12" y="4" width="8" height="2.4" rx="1" fill="#e5e7eb" />
        </>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label={it.name} role="img" style={{ flex: "none" }}>
      {body}
    </svg>
  );
}
