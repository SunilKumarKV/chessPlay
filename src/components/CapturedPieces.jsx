export default function CapturedPieces({ pieces, label }) {
  return (
    <div>
      <p
        className="text-xs uppercase tracking-widest opacity-50 mb-1"
        style={{ color: "#e8dcc8" }}
      >
        {label}
      </p>
    </div>
  );
}
