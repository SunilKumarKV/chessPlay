import { PIECE_IMAGE_URLS } from "../constants/pieces";

export default function PlayerClockPlate({
  player,
  capturedPieces = [],
  materialBonus = 0,
  timeLabel,
  isClockActive,
}) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#2a2a2a] text-xl shadow-sm">
          {player.avatar}
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 leading-tight">
            <span className="text-sm font-bold text-[#e0e0e0]">
              {player.name}
            </span>
            {player.rating != null && (
              <span className="text-xs text-[#7a7a7a]">({player.rating})</span>
            )}
          </div>
          <div className="mt-0.5 flex h-4 items-center">
            {capturedPieces.map((capturedPiece, capturedIndex) => (
              <img
                key={`${capturedPiece}-${capturedIndex}`}
                src={PIECE_IMAGE_URLS[capturedPiece]}
                className="-ml-1.5 h-4 w-4 drop-shadow-sm first:ml-0"
                alt={capturedPiece}
              />
            ))}
            {materialBonus > 0 && (
              <span className="ml-1 text-xs font-semibold text-[#7a7a7a]">
                +{materialBonus}
              </span>
            )}
          </div>
        </div>
      </div>
      <div
        className={`rounded-sm px-3 py-1 font-mono text-2xl font-bold transition-colors ${
          isClockActive
            ? "bg-[#ffffff] text-[#212121]"
            : "bg-[#2a2a2a] text-[#7a7a7a]"
        }`}
      >
        {timeLabel}
      </div>
    </div>
  );
}
