import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  // Board display
  boardTheme: "green",
  pieceSet: "classic",
  showCoordinates: true,
  pieceNotation: "algebraic", // 'algebraic' | 'figurine'
  whiteAlwaysOnBottom: false,

  // Move display
  moveClassification: "default", // 'default' | 'engine'
  showMoveHistory: true,

  // Animation
  pieceAnimations: "medium", // 'none' | 'fast' | 'medium' | 'slow'
  animationDuration: 300, // milliseconds

  // Interaction
  moveMethod: "drag", // 'drag' | 'click'
  highlightLegalMoves: true,
  showLegalMoves: true,
  autoQueen: true,
  confirmMove: false,

  // Sound
  playSounds: true,
  soundTheme: "default", // 'default' | 'classic' | 'modern'
  soundVolume: 0.7,

  // Analysis
  showEvaluationBar: true,
  showThreatArrows: false,
  showSuggestionArrows: true,
  evaluationDepth: 15,

  // AI
  aiPersonality: "default", // 'default' | 'aggressive' | 'defensive'
  botChat: true,

  // Feedback
  moveFeedback: true,
  showAccuracy: false,

  // Game modes
  variant: "standard", // 'standard' | 'chess960'
  timeControlPreset: "blitz", // 'bullet' | 'blitz' | 'rapid' | 'classical'

  // Persistence
  autoSave: true,
};

const chessSettingsSlice = createSlice({
  name: "chessSettings",
  initialState,
  reducers: {
    // Board display
    setShowCoordinates: (state, action) => {
      state.showCoordinates = action.payload;
    },

    setPieceNotation: (state, action) => {
      state.pieceNotation = action.payload;
    },

    setWhiteAlwaysOnBottom: (state, action) => {
      state.whiteAlwaysOnBottom = action.payload;
    },

    // Move display
    setMoveClassification: (state, action) => {
      state.moveClassification = action.payload;
    },

    setShowMoveHistory: (state, action) => {
      state.showMoveHistory = action.payload;
    },

    // Animation
    setPieceAnimations: (state, action) => {
      state.pieceAnimations = action.payload;
      // Update duration based on animation speed
      switch (action.payload) {
        case "none":
          state.animationDuration = 0;
          break;
        case "fast":
          state.animationDuration = 150;
          break;
        case "medium":
          state.animationDuration = 300;
          break;
        case "slow":
          state.animationDuration = 500;
          break;
        default:
          state.animationDuration = 300;
      }
    },

    // Interaction
    setMoveMethod: (state, action) => {
      state.moveMethod = action.payload;
    },

    setHighlightLegalMoves: (state, action) => {
      state.highlightLegalMoves = action.payload;
    },

    setShowLegalMoves: (state, action) => {
      state.showLegalMoves = action.payload;
    },

    // Sound
    setPlaySounds: (state, action) => {
      state.playSounds = action.payload;
    },

    setSoundTheme: (state, action) => {
      state.soundTheme = action.payload;
    },

    setSoundVolume: (state, action) => {
      state.soundVolume = action.payload;
    },

    // Analysis
    setShowEvaluationBar: (state, action) => {
      state.showEvaluationBar = action.payload;
    },

    setShowThreatArrows: (state, action) => {
      state.showThreatArrows = action.payload;
    },

    setShowSuggestionArrows: (state, action) => {
      state.showSuggestionArrows = action.payload;
    },

    setEvaluationDepth: (state, action) => {
      state.evaluationDepth = action.payload;
    },

    // AI
    setAiPersonality: (state, action) => {
      state.aiPersonality = action.payload;
    },

    setBotChat: (state, action) => {
      state.botChat = action.payload;
    },

    // Feedback
    setMoveFeedback: (state, action) => {
      state.moveFeedback = action.payload;
    },

    setShowAccuracy: (state, action) => {
      state.showAccuracy = action.payload;
    },

    // Game modes
    setVariant: (state, action) => {
      state.variant = action.payload;
    },

    setTimeControlPreset: (state, action) => {
      state.timeControlPreset = action.payload;
    },

    // Persistence
    setAutoSave: (state, action) => {
      state.autoSave = action.payload;
    },

    // Bulk settings update
    updateSettings: (state, action) => {
      return { ...state, ...action.payload };
    },

    // Load settings from storage
    loadSettings: (state, action) => {
      return { ...state, ...action.payload };
    },

    // Reset to defaults
    resetSettings: () => {
      return { ...initialState };
    },
  },
});

export const {
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
  setAutoSave,
  updateSettings,
  loadSettings,
  resetSettings,
} = chessSettingsSlice.actions;

export default chessSettingsSlice.reducer;
