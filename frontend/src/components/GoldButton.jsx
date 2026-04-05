export default function GoldButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md text-sm font-semibold tracking-wide transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
      style={{
        background: "linear-gradient(135deg,#c8943a,#e8b84b",
        border: "none",
        color: "#1a120b",
        fontFamily: "'Crimson Text', serif",
        cursor: "pointer",
        boxShadow: "0 4px 12px rgba(200,148,58,0.3)",
      }}
    >
      {children}
    </button>
  );
}
