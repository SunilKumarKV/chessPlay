import React from "react";
import { useAppSelector } from "../store/hooks";

const EvaluationBar = ({ evaluation, isThinking }) => {
  const settings = useAppSelector((state) => state.chessSettings);

  if (!settings.showEvaluationBar) return null;

  // Convert evaluation to a percentage (0-100)
  // Clamp between -5 and +5 pawns for display
  const clampedEval = Math.max(-5, Math.min(5, evaluation));
  const percentage = ((clampedEval + 5) / 10) * 100;

  // Determine color based on evaluation
  const getBarColor = (evaluation) => {
    if (evaluation > 1) return "#22c55e"; // Green for advantage
    if (evaluation > 0.3) return "#84cc16"; // Light green
    if (evaluation > -0.3) return "#f59e0b"; // Orange for equal
    if (evaluation > -1) return "#f97316"; // Orange-red
    return "#ef4444"; // Red for disadvantage
  };

  const formatEvaluation = (evaluation) => {
    if (Math.abs(evaluation) < 0.01) return "0.00";
    return evaluation > 0 ? `+${evaluation.toFixed(2)}` : evaluation.toFixed(2);
  };

  return (
    <div className="w-8 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Black advantage (top) */}
      <div
        className="h-1/2 bg-gray-600 transition-all duration-300"
        style={{ height: `${100 - percentage}%` }}
      />

      {/* White advantage (bottom) */}
      <div
        className="h-1/2 transition-all duration-300"
        style={{
          height: `${percentage}%`,
          backgroundColor: getBarColor(evaluation),
        }}
      />

      {/* Evaluation text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs font-bold text-white drop-shadow-lg">
          {isThinking ? "..." : formatEvaluation(evaluation)}
        </div>
      </div>

      {/* Center line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white opacity-50" />
    </div>
  );
};

export default EvaluationBar;
