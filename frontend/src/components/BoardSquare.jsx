import { PIECE_SYMBOLS } from "../constants/pieces";
import { colorOf } from "../utils/boardUtils";
import { SQUARE_COLORS } from "../constants/board";

export default function BoardSquare({
  row,
  col,
  piece,
  isLight,
  isSelected,
  isLegalDest,
  isLastMove,
  isInCheck,
  onClick,
}) {
  let bg;
  if (isInCheck) {
    bg = "rgba(220, 53, 69, 0.3)"; // Red background for check
  } else if (isSelected) {
    bg = "#81b64c"; // Green for selected
  } else if (isLastMove) {
    bg = "rgba(255, 193, 7, 0.3)"; // Yellow for last move
  } else {
    bg = isLight ? "#f0d9b5" : "#b58863"; // Standard board colors
  }

  return (
    <div
      role="button"
      aria-label={`Square ${col}-${row}${piece ? ` with ${piece}` : ""}`}
      onClick={onClick}
      className="board-square relative flex items-center justify-center cursor-pointer select-none transition-all duration-150 hover:brightness-110"
      style={{
        background: bg,
        aspectRatio: "1",
        boxShadow: isInCheck ? "0 0 20px rgba(220, 53, 69, 0.5)" : "none",
        animation: isInCheck ? "pulse 1s infinite" : "none"
      }}
    >
      {/* Legal-move indicator */}
      {isLegalDest &&
        (piece ? (
          // Green ring around enemy piece for capture
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              border: "3px solid #81b64c",
              boxShadow: "0 0 10px rgba(129, 182, 76, 0.5)"
            }}
          />
        ) : (
          // Green dot on empty square
          <div
            className="rounded-full pointer-events-none bg-[#81b64c] opacity-80"
            style={{
              width: "28%",
              height: "28%",
              boxShadow: "0 0 8px rgba(129, 182, 76, 0.6)"
            }}
          />
        ))}

      {/* Piece symbol */}
      {piece && (
        <span
          className="piece-enter relative z-10 leading-none select-none"
          style={{
            fontSize: "clamp(1.6rem, 5vw, 2.6rem)",
            textShadow:
              colorOf(piece) === "w"
                ? "0 1px 3px rgba(0,0,0,0.7)"
                : "0 1px 2px rgba(0,0,0,0.4)",
            filter: isSelected
              ? "drop-shadow(0 0 8px rgba(129, 182, 76, 0.8))"
              : "none",
            transition: "filter 0.2s",
          }}
        >
          {PIECE_SYMBOLS[piece]}
        </span>
      )}
    </div>
  );
}
