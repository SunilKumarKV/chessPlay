import { PIECE_SYMBOLS } from "../constants/pieces";

export default function CapturedPieces({ pieces, label }) {
  return (
    <div>
      <p
        className="text-xs uppercase tracking-widest opacity-50 mb-1"
        style={{ color: "#e8dcc8" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-0.5 min-h-7.5">
        {pieces.map((p, i) => (
          <span key={i} className="text-xl leading-none">
            {PIECE_SYMBOLS[p]}
          </span>
        ))}
      </div>
    </div>
  );
}
