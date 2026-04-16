import GameScreen from "./GameScreen";

export default function Chess({ onBack, initialAiEnabled = false, timeControl = "3+0" }) {
  return (
    <GameScreen
      onBack={onBack}
      initialAiEnabled={initialAiEnabled}
      timeControl={timeControl}
    />
  );
}
