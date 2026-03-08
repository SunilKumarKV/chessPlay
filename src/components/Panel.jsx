export default function Panel({ title, children }) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: "rgba(255,255,255,0.05",
        border: "1px solid rgba(200,148,58,0.3)",
      }}
    >
      <p
        className="text-xs uppercase tracking-widest opacity-50 mb-2"
        style={{ color: "#e8dcc8" }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}
