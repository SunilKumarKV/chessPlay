import React, { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import {
  setShowCoordinates,
  setPieceNotation,
  setWhiteAlwaysOnBottom,
  setShowMoveHistory,
  setPieceAnimations,
  setMoveMethod,
  setHighlightLegalMoves,
  setShowLegalMoves,
  setPlaySounds,
  setSoundTheme,
  setSoundVolume,
  setShowEvaluationBar,
  setEvaluationDepth,
  resetSettings,
} from "../store/slices/chessSettingsSlice";
import { soundManager } from "../utils/sounds/soundManager";
import { saveSettings } from "../utils/settingsPersistence";

const ChessSettingsModal = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.chessSettings);

  const [activeTab, setActiveTab] = useState("board");

  // Save settings while the modal is in active use. This avoids overwriting
  // stored settings from a closed modal during initial app mount.
  useEffect(() => {
    if (!isOpen) return;
    saveSettings(settings);
  }, [isOpen, settings]);

  // Initialize sound manager
  useEffect(() => {
    if (!isOpen) return;
    soundManager.init();
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs = [
    { id: "board", label: "Board", icon: "♟" },
    { id: "moves", label: "Moves", icon: "N" },
    { id: "animation", label: "Motion", icon: "↔" },
    { id: "interaction", label: "Input", icon: "•" },
    { id: "sound", label: "Sound", icon: "♪" },
    { id: "analysis", label: "Engine", icon: "∑" },
  ];

  const handleReset = () => {
    dispatch(resetSettings());
  };

  const playTestSound = () => {
    soundManager.playMove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[#c9a45c]/30 bg-[#25221f] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold text-[#f3e6c8]">Chess Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded bg-white/5 text-xl text-[#d9c8a5] hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="flex max-h-[78vh] flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="border-b border-white/10 bg-[#1d1b19] p-2 sm:w-44 sm:border-b-0 sm:border-r">
            <nav className="grid grid-cols-3 gap-1 sm:grid-cols-1">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#c9a45c] text-[#1d1b19]"
                      : "text-[#d9c8a5] hover:bg-white/10"
                  }`}
                >
                  <span className="grid h-5 w-5 place-items-center text-xs font-semibold">
                    {tab.icon}
                  </span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded px-3 py-2 text-sm text-[#ffb4a9] hover:bg-red-500/10"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 text-[#efe5cf]">
            {activeTab === "board" && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">
                  Board Display
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Show Coordinates</span>
                    <input
                      type="checkbox"
                      checked={settings.showCoordinates}
                      onChange={(e) =>
                        dispatch(setShowCoordinates(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>

                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">
                      Piece Notation
                    </label>
                    <select
                      value={settings.pieceNotation}
                      onChange={(e) =>
                        dispatch(setPieceNotation(e.target.value))
                      }
                      className="w-full rounded border border-white/10 bg-[#181614] px-3 py-2 text-sm text-[#efe5cf]"
                    >
                      <option value="algebraic">Algebraic (N, B, Q)</option>
                      <option value="figurine">Figurine (♞, ♗, ♛)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>White Always on Bottom</span>
                    <input
                      type="checkbox"
                      checked={settings.whiteAlwaysOnBottom}
                      onChange={(e) =>
                        dispatch(setWhiteAlwaysOnBottom(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "moves" && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">
                  Move Display
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Show Move History</span>
                    <input
                      type="checkbox"
                      checked={settings.showMoveHistory}
                      onChange={(e) =>
                        dispatch(setShowMoveHistory(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "animation" && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">
                  Animations
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">
                      Piece Animations
                    </label>
                    <select
                      value={settings.pieceAnimations}
                      onChange={(e) =>
                        dispatch(setPieceAnimations(e.target.value))
                      }
                      className="w-full rounded border border-white/10 bg-[#181614] px-3 py-2 text-sm text-[#efe5cf]"
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
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">
                  Interaction
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">
                      Move Method
                    </label>
                    <select
                      value={settings.moveMethod}
                      onChange={(e) => dispatch(setMoveMethod(e.target.value))}
                      className="w-full rounded border border-white/10 bg-[#181614] px-3 py-2 text-sm text-[#efe5cf]"
                    >
                      <option value="drag">Drag & Drop</option>
                      <option value="click">Click to Move</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Highlight Legal Moves</span>
                    <input
                      type="checkbox"
                      checked={settings.highlightLegalMoves}
                      onChange={(e) =>
                        dispatch(setHighlightLegalMoves(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Show Legal Moves</span>
                    <input
                      type="checkbox"
                      checked={settings.showLegalMoves}
                      onChange={(e) =>
                        dispatch(setShowLegalMoves(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "sound" && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">Sound</h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Play Sounds</span>
                    <input
                      type="checkbox"
                      checked={settings.playSounds}
                      onChange={(e) => {
                        dispatch(setPlaySounds(e.target.checked));
                        soundManager.setEnabled(e.target.checked);
                      }}
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>

                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">
                      Sound Theme
                    </label>
                    <select
                      value={settings.soundTheme}
                      onChange={(e) => {
                        dispatch(setSoundTheme(e.target.value));
                        soundManager.setTheme(e.target.value);
                      }}
                      className="w-full rounded border border-white/10 bg-[#181614] px-3 py-2 text-sm text-[#efe5cf]"
                    >
                      <option value="default">Default</option>
                      <option value="classic">Classic</option>
                      <option value="modern">Modern</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">Volume</label>
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
                      className="w-full accent-[#c9a45c]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={playTestSound}
                    className="rounded bg-[#c9a45c] px-4 py-2 text-sm font-semibold text-[#1d1b19] hover:bg-[#d9b66d]"
                  >
                    Test Sound
                  </button>
                </div>
              </div>
            )}

            {activeTab === "analysis" && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-[#f3e6c8]">
                  Analysis
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded bg-white/5 px-3 py-2">
                    <span>Show Evaluation Bar</span>
                    <input
                      type="checkbox"
                      checked={settings.showEvaluationBar}
                      onChange={(e) =>
                        dispatch(setShowEvaluationBar(e.target.checked))
                      }
                      className="h-4 w-4 accent-[#c9a45c]"
                    />
                  </label>

                  <div>
                    <label className="mb-1 block text-sm text-[#d9c8a5]">
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
                      className="w-full accent-[#c9a45c]"
                    />
                    <span className="text-sm text-[#d9c8a5]">
                      {settings.evaluationDepth}
                    </span>
                  </div>
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
