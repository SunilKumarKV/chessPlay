import { PIECE_SYMBOLS, PROMOTION_PIECES } from "../constants/pieces";

export default function PromotionModel({ turn, onSelect }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: "linear-gradient(135deg,#1e1b4b,#2d2a5e)",
          border: "2px solid #c8943a",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <p
          className="mb-6 text-xl tracking-wide"
          style={{ fontFamily: "'Playfair Display', serif", color: "#f5d78e" }}
        >
          Promote Your Pawn
        </p>
        <div className="flex gap-4">
          {PROMOTION_PIECES.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex items-center justify-center rounded-lg transition-all duration-200"
              style={{
                width: 64,
                height: 64,
                background: "rgba(255,255,255,0.08)",
                border: "2px solid rgba(200,148,58,0.5)",
                cursor: "pointer",
                fontSize: "2.2rem",
                color: "inherit",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(200,148,58,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.08)")
              }
              aria-label={`Promote to ${type}`}
            >
              {PIECE_SYMBOLS[turn + type]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
