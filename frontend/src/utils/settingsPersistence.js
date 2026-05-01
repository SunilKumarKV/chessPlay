import { store } from "../store";

// Settings persistence keys
const SETTINGS_KEY = "chessplay-settings";
const GAME_STATE_KEY = "chessplay-game-state";

// Default settings
const defaultSettings = {
  // Board settings
  showCoordinates: true,
  pieceNotation: "algebraic", // 'algebraic' | 'figurine'
  whiteAlwaysOnBottom: true,

  // Move settings
  moveClassification: "default", // 'default' | 'engine'
  showMoveHistory: true,

  // Animation settings
  pieceAnimations: "medium", // 'none' | 'fast' | 'medium' | 'slow'
  animationDuration: 300, // milliseconds

  // Interaction settings
  moveMethod: "drag", // 'drag' | 'click'
  highlightLegalMoves: true,
  showLegalMoves: true,

  // Sound settings
  playSounds: true,
  soundTheme: "default", // 'default' | 'classic' | 'modern'
  soundVolume: 0.7,

  // Analysis settings
  showEvaluationBar: true,
  showThreatArrows: false,
  showSuggestionArrows: false,
  evaluationDepth: 15,

  // AI settings
  aiPersonality: "default", // 'default' | 'aggressive' | 'defensive'
  botChat: false,

  // Game settings
  moveFeedback: true,
  showAccuracy: false,
  variant: "standard", // 'standard' | 'chess960'
  timeControlPreset: "rapid", // 'bullet' | 'blitz' | 'rapid' | 'classical'
};

// Animation duration mapping
const animationSpeedMap = {
  none: 0,
  fast: 150,
  medium: 300,
  slow: 500,
};

// Save settings to localStorage
export const saveSettings = () => {
  try {
    const settings = store.getState().chessSettings;

    // Remove computed properties before saving
    const { animationDuration, ...settingsToSave } = settings;

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsToSave));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

// Load settings from localStorage
export const loadSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsedSettings = JSON.parse(saved);

      // Merge with defaults to handle new settings
      const mergedSettings = { ...defaultSettings, ...parsedSettings };

      // Convert animation speed to duration
      if (mergedSettings.pieceAnimations) {
        mergedSettings.animationDuration =
          animationSpeedMap[mergedSettings.pieceAnimations] || 300;
      }

      // Dispatch to Redux store
      store.dispatch({
        type: "chessSettings/loadSettings",
        payload: mergedSettings,
      });

      return mergedSettings;
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }

  // Return defaults if nothing saved
  store.dispatch({
    type: "chessSettings/loadSettings",
    payload: defaultSettings,
  });
  return defaultSettings;
};

// Save game state (optional, for resuming games)
export const saveGameState = () => {
  try {
    const gameState = store.getState().chessGame;
    // Only save non-sensitive game state
    const stateToSave = {
      fen: gameState.fen,
      history: gameState.history,
      aiEnabled: gameState.aiEnabled,
      aiColor: gameState.aiColor,
      aiDifficulty: gameState.aiDifficulty,
      timeControl: gameState.timeControl,
      flipped: gameState.flipped,
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error("Failed to save game state:", error);
  }
};

// Load game state
export const loadGameState = () => {
  try {
    const saved = localStorage.getItem(GAME_STATE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load game state:", error);
  }
  return null;
};

// Clear saved data
export const clearSavedData = () => {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(GAME_STATE_KEY);
};

// Auto-save settings when they change
let saveTimeout;
export const autoSaveSettings = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveSettings, 1000); // Debounce saves
};
