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
  onClick,
}) {
  let bg;
  if (isSelected) {
    bg = SQUARE_COLORS.selected;
  } else if (isLastMove) {
    bg = isLight ? SQUARE_COLORS.lightHighlight : SQUARE_COLORS.darkHighlight;
  } else {
    bg = isLight ? SQUARE_COLORS.light : SQUARE_COLORS.dark;
  }

  return (
    <div
      role="button"
      aria-label={`Square ${col}-${row}${piece ? ` with ${piece}` : ""}`}
      onClick={onClick}
      className="board-square relative flex items-center justify-center cursor-pointer select-none transition-all duration-150"
      style={{ background: bg, aspectRatio: "1" }}
    >
      {/* Legal-move indicator */}
      {isLegalDest &&
        (piece ? (
          // Capture ring around enemy piece
          <div
            className="absolute inset-0 pointer-events-none box-border"
            style={{ border: "4px solid rgba(0,0,0,0.35)" }}
          />
        ) : (
          // Dot on an empty square
          <div
            className="rounded-full pointer-events-none"
            style={{
              width: "32%",
              height: "32%",
              background: "rgba(0,0,0,0.22)",
            }}
          />
        ))}

      {/* Piece symbol */}
      {piece && (
        <span
          className="piece-enter relative z-10 leading-none"
          style={{
            fontSize: "clamp(1.4rem, 5vw, 2.4rem)",
            textShadow:
              colorOf(piece) === "w"
                ? "0 1px 3px rgba(0,0,0,0.6)"
                : "0 1px 2px rgba(0,0,0,0.3)",
            filter: isSelected
              ? "drop-shadow(0 0 6px rgba(80,200,80,0.8))"
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
