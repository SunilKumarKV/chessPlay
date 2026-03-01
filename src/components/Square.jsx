const Square = ({ piece, isDark, onClick, isHighlighted }) => {
  const pieceIcons = {
    wp: "♙",
    wr: "♖",
    wn: "♘",
    wb: "♗",
    wq: "♕",
    wk: "♔",
    bp: "♟",
    br: "♜",
    bn: "♞",
    bb: "♝",
    bq: "♛",
    bk: "♚",
  };

  return (
    <div
      onClick={onClick}
      className={`w-16 h-16 flex items-center justify-center text-3xl cursor-pointer
      ${
        isHighlighted
          ? "bg-yellow-400"
          : isDark
            ? "bg-green-700"
            : "bg-green-300"
      }`}
    >
      {pieceIcons[piece] || ""}
    </div>
  );
};

export default Square;
