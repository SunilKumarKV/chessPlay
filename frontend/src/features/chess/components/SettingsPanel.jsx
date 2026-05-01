import { TIME_CONTROLS } from "../hooks/useChessClock";

// SettingsPanel
// Collapsible sidebar for configuring AI, time control, sound.
// ─────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS = {
  0: "Beginner",
  5: "Casual",
  10: "Intermediate",
  15: "Advanced",
  20: "Master",
};
const difficultyLabel = (v) => {
  const keys = Object.keys(DIFFICULTY_LABELS)
    .map(Number)
    .sort((a, b) => a - b);
  const key = keys.reduce((prev, k) => (v >= k ? k : prev), 0);
  return DIFFICULTY_LABELS[key];
};

function Toggle({ on, onToggle, toggleStyle, thumbStyle }) {
  return (
    <button
      style={toggleStyle(on)}
      onClick={onToggle}
      aria-checked={on}
      role="switch"
    >
      <span style={thumbStyle(on)} />
    </button>
  );
}

function Row({ label, children, labelStyle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

export default function SettingsPanel({
  aiEnabled,
  setAiEnabled,
  aiColor,
  setAiColor,
  aiDifficulty,
  setAiDifficulty,
  soundEnabled,
  setSoundEnabled,
  timeControlIdx,
  setTimeControlIdx,
  onReset,
  onClose,
}) {
  const labelStyle = {
    fontSize: "0.7rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    opacity: 0.5,
    color: "#e8dcc8",
    marginBottom: 4,
    display: "block",
  };
  const selectStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(200,148,58,0.35)",
    borderRadius: 6,
    color: "#e8dcc8",
    fontSize: "0.8rem",
    padding: "5px 8px",
    fontFamily: "'Crimson Text', serif",
    cursor: "pointer",
    outline: "none",
  };
  const toggleStyle = (on) => ({
    width: 38,
    height: 20,
    borderRadius: 10,
    background: on ? "#c8943a" : "rgba(255,255,255,0.15)",
    border: "none",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s",
    flexShrink: 0,
  });
  const thumbStyle = (on) => ({
    position: "absolute",
    top: 2,
    left: on ? 18 : 2,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#fff",
    transition: "left 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  });

  return (
    <div
      className="flex flex-col gap-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(200,148,58,0.25)",
        borderRadius: 10,
        padding: "14px 14px",
        minWidth: 170,
        maxWidth: 190,
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "0.85rem",
            color: "#f5d78e",
            letterSpacing: "0.08em",
          }}
        >
          ⚙ Settings
        </p>
        <button
          onClick={onClose}
          style={{
            color: "#e8dcc8",
            fontSize: "1.2rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            opacity: 0.7,
          }}
        >
          ×
        </button>
      </div>

      {/* ── AI Toggle */}
      <Row label="AI Opponent" labelStyle={labelStyle}>
        <div className="flex items-center gap-2">
          <Toggle
            on={aiEnabled}
            onToggle={() => {
              setAiEnabled((v) => !v);
              onReset();
            }}
            toggleStyle={toggleStyle}
            thumbStyle={thumbStyle}
          />
          <span style={{ fontSize: "0.78rem", color: "#e8dcc8", opacity: 0.7 }}>
            {aiEnabled ? "On" : "Off"}
          </span>
        </div>
      </Row>

      {aiEnabled && (
        <>
          <Row label="AI plays as" labelStyle={labelStyle}>
            <select
              style={selectStyle}
              value={aiColor}
              onChange={(e) => {
                setAiColor(e.target.value);
                onReset();
              }}
            >
              <option value="b">Black</option>
              <option value="w">White</option>
            </select>
          </Row>

          <Row
            label={`Difficulty — ${difficultyLabel(aiDifficulty)}`}
            labelStyle={labelStyle}
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#c8943a", cursor: "pointer" }}
              />
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#f5d78e",
                  minWidth: 18,
                  textAlign: "right",
                }}
              >
                {aiDifficulty}
              </span>
            </div>
          </Row>
        </>
      )}

      {/* ── Clock */}
      <Row label="Time Control" labelStyle={labelStyle}>
        <select
          style={selectStyle}
          value={timeControlIdx}
          onChange={(e) => {
            setTimeControlIdx(Number(e.target.value));
            onReset();
          }}
        >
          {TIME_CONTROLS.map((tc, i) => (
            <option key={i} value={i}>
              {tc.label}
            </option>
          ))}
        </select>
      </Row>

      {/* ── Sound */}
      <Row label="Sound Effects" labelStyle={labelStyle}>
        <div className="flex items-center gap-2">
          <Toggle
            on={soundEnabled}
            onToggle={() => setSoundEnabled((v) => !v)}
            toggleStyle={toggleStyle}
            thumbStyle={thumbStyle}
          />
          <span style={{ fontSize: "0.78rem", color: "#e8dcc8", opacity: 0.7 }}>
            {soundEnabled ? "On" : "Off"}
          </span>
        </div>
      </Row>
    </div>
  );
}
