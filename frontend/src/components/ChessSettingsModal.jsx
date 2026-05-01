import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
  setShowCoordinates,
  setPieceNotation,
  setWhiteAlwaysOnBottom,
  setMoveClassification,
  setShowMoveHistory,
  setPieceAnimations,
  setMoveMethod,
  setHighlightLegalMoves,
  setShowLegalMoves,
  setPlaySounds,
  setSoundTheme,
  setSoundVolume,
  setShowEvaluationBar,
  setShowThreatArrows,
  setShowSuggestionArrows,
  setEvaluationDepth,
  setAiPersonality,
  setBotChat,
  setMoveFeedback,
  setShowAccuracy,
  setVariant,
  setTimeControlPreset,
  resetSettings,
} from "../store/slices/chessSettingsSlice";
import { soundManager } from "../utils/sounds/soundManager";
import { saveSettings, loadSettings } from "../utils/settingsPersistence";

const ChessSettingsModal = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.chessSettings);

  const [activeTab, setActiveTab] = useState("board");

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    saveSettings();
  }, [settings]);

  // Initialize sound manager
  useEffect(() => {
    soundManager.init();
  }, []);

  if (!isOpen) return null;

  const tabs = [
    { id: "board", label: "Board", icon: "♟️" },
    { id: "moves", label: "Moves", icon: "📝" },
    { id: "animation", label: "Animation", icon: "✨" },
    { id: "interaction", label: "Interaction", icon: "👆" },
    { id: "sound", label: "Sound", icon: "🔊" },
    { id: "analysis", label: "Analysis", icon: "📊" },
    { id: "ai", label: "AI", icon: "🤖" },
    { id: "game", label: "Game", icon: "🎮" },
  ];

  const handleReset = () => {
    dispatch(resetSettings());
  };

  const playTestSound = () => {
    soundManager.playMove();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Chess Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-gray-200">
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "board" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Board Display
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Coordinates</span>
                    <input
                      type="checkbox"
                      checked={settings.showCoordinates}
                      onChange={(e) =>
                        dispatch(setShowCoordinates(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Piece Notation
                    </label>
                    <select
                      value={settings.pieceNotation}
                      onChange={(e) =>
                        dispatch(setPieceNotation(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="algebraic">Algebraic (N, B, Q)</option>
                      <option value="figurine">Figurine (♞, ♗, ♛)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">
                      White Always on Bottom
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.whiteAlwaysOnBottom}
                      onChange={(e) =>
                        dispatch(setWhiteAlwaysOnBottom(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "moves" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Move Display
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Move Classification
                    </label>
                    <select
                      value={settings.moveClassification}
                      onChange={(e) =>
                        dispatch(setMoveClassification(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="default">Default</option>
                      <option value="engine">
                        Engine-based (Best/Good/Mistake/Blunder)
                      </option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Move History</span>
                    <input
                      type="checkbox"
                      checked={settings.showMoveHistory}
                      onChange={(e) =>
                        dispatch(setShowMoveHistory(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "animation" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Animations
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Piece Animations
                    </label>
                    <select
                      value={settings.pieceAnimations}
                      onChange={(e) =>
                        dispatch(setPieceAnimations(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="none">None</option>
                      <option value="fast">Fast</option>
                      <option value="medium">Medium</option>
                      <option value="slow">Slow</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "interaction" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Interaction
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      Move Method
                    </label>
                    <select
                      value={settings.moveMethod}
                      onChange={(e) => dispatch(setMoveMethod(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="drag">Drag & Drop</option>
                      <option value="click">Click to Move</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Highlight Legal Moves</span>
                    <input
                      type="checkbox"
                      checked={settings.highlightLegalMoves}
                      onChange={(e) =>
                        dispatch(setHighlightLegalMoves(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Legal Moves</span>
                    <input
                      type="checkbox"
                      checked={settings.showLegalMoves}
                      onChange={(e) =>
                        dispatch(setShowLegalMoves(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "sound" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Sound</h3>

                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Play Sounds</span>
                    <input
                      type="checkbox"
                      checked={settings.playSounds}
                      onChange={(e) => {
                        dispatch(setPlaySounds(e.target.checked));
                        soundManager.setEnabled(e.target.checked);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Sound Theme
                    </label>
                    <select
                      value={settings.soundTheme}
                      onChange={(e) => {
                        dispatch(setSoundTheme(e.target.value));
                        soundManager.setTheme(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="default">Default</option>
                      <option value="classic">Classic</option>
                      <option value="modern">Modern</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Volume</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.soundVolume}
                      onChange={(e) => {
                        dispatch(setSoundVolume(parseFloat(e.target.value)));
                        soundManager.setVolume(parseFloat(e.target.value));
                      }}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={playTestSound}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Test Sound
                  </button>
                </div>
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Analysis
                </h3>

                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Evaluation Bar</span>
                    <input
                      type="checkbox"
                      checked={settings.showEvaluationBar}
                      onChange={(e) =>
                        dispatch(setShowEvaluationBar(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Threat Arrows</span>
                    <input
                      type="checkbox"
                      checked={settings.showThreatArrows}
                      onChange={(e) =>
                        dispatch(setShowThreatArrows(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">
                      Show Suggestion Arrows
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.showSuggestionArrows}
                      onChange={(e) =>
                        dispatch(setShowSuggestionArrows(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Evaluation Depth
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={settings.evaluationDepth}
                      onChange={(e) =>
                        dispatch(setEvaluationDepth(parseInt(e.target.value)))
                      }
                      className="w-full"
                    />
                    <span className="text-sm text-gray-500">
                      {settings.evaluationDepth}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  AI Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">
                      AI Personality
                    </label>
                    <select
                      value={settings.aiPersonality}
                      onChange={(e) =>
                        dispatch(setAiPersonality(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="default">Default</option>
                      <option value="aggressive">Aggressive</option>
                      <option value="defensive">Defensive</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Bot Chat</span>
                    <input
                      type="checkbox"
                      checked={settings.botChat}
                      onChange={(e) => dispatch(setBotChat(e.target.checked))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "game" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Game Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Variant</label>
                    <select
                      value={settings.variant}
                      onChange={(e) => dispatch(setVariant(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="standard">Standard</option>
                      <option value="chess960">Chess960</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">
                      Time Control Preset
                    </label>
                    <select
                      value={settings.timeControlPreset}
                      onChange={(e) =>
                        dispatch(setTimeControlPreset(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="bullet">Bullet</option>
                      <option value="blitz">Blitz</option>
                      <option value="rapid">Rapid</option>
                      <option value="classical">Classical</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Move Feedback</span>
                    <input
                      type="checkbox"
                      checked={settings.moveFeedback}
                      onChange={(e) =>
                        dispatch(setMoveFeedback(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <span className="text-gray-700">Show Accuracy</span>
                    <input
                      type="checkbox"
                      checked={settings.showAccuracy}
                      onChange={(e) =>
                        dispatch(setShowAccuracy(e.target.checked))
                      }
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessSettingsModal;
