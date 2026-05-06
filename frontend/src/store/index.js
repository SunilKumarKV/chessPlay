import { configureStore } from "@reduxjs/toolkit";
import chessGameReducer from "./slices/chessGameSlice";
import chessSettingsReducer from "./slices/chessSettingsSlice";

export const store = configureStore({
  reducer: {
    chessGame: chessGameReducer,
    chessSettings: chessSettingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "chessSettings/loadSettings"],
        ignoredPaths: ["chessGame.game"],
      },
    }),
});
