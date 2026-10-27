import { useNavigate } from "react-router-dom";

const css = `
@keyframes vigia-look { 0%,100% { transform: translateX(-7px); } 50% { transform: translateX(7px); } }
@keyframes vigia-pulse { to { stroke-dashoffset: -200; } }
.vigia-look { animation: vigia-look 3s ease-in-out infinite; }
.vigia-pulse { stroke-dasharray: 140 60; animation: vigia-pulse 2s linear infinite; }
@media (prefers-reduced-motion: reduce) { .vigia-look, .vigia-pulse { animation: none; } }
`;

export function VigiaFab() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/vig-ia")}
      aria-label="Preguntar a Vig-IA"
      title="Preguntar a Vig-IA"
      className="group fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-card shadow-lg transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <style>{css}</style>
      <svg viewBox="0 0 100 80" className="h-11 w-11" aria-hidden="true">
        <path d="M6 32 Q50 -8 94 32 Q50 72 6 32 Z" fill="none" stroke="hsl(var(--sidebar-background, 210 70% 22%))" strokeWidth="6" strokeLinejoin="round" className="stroke-foreground" />
        <g className="vigia-look">
          <circle cx="50" cy="30" r="15" fill="hsl(var(--primary))" />
          <circle cx="50" cy="30" r="7" className="fill-foreground" />
          <circle cx="53" cy="27" r="2.5" className="fill-card" />
        </g>
        <polyline
          className="vigia-pulse"
          points="4,64 30,64 36,54 42,72 50,44 58,76 64,56 70,64 96,64"
          fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
        Preguntar a Vig-IA
      </span>
    </button>
  );
}
