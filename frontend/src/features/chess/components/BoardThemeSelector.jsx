import { useId } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setBoardTheme } from "../../../store/slices/chessSettingsSlice";
import {
  BOARD_THEME_OPTIONS,
  BOARD_THEME_STORAGE_KEY,
  normalizeBoardThemeId,
} from "../constants/boardThemes";
import { saveSettings } from "../../../utils/settingsPersistence";

function syncUserSettingsBoardTheme(themeId) {
  try {
    const stored = JSON.parse(localStorage.getItem("userSettings") || "{}");
    localStorage.setItem(
      "userSettings",
      JSON.stringify({
        ...stored,
        appearance: {
          ...(stored.appearance || {}),
          boardTheme: themeId,
        },
      }),
    );
  } catch {
    // The Redux chess settings remain the source of truth if userSettings is malformed.
  }
}

export default function BoardThemeSelector({
  compact = false,
  className = "",
  label = "Board theme",
}) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.chessSettings);
  const currentThemeId = normalizeBoardThemeId(settings.boardTheme);
  const selectId = useId();

  const handleChange = (event) => {
    const themeId = normalizeBoardThemeId(event.target.value);
    dispatch(setBoardTheme(themeId));
    localStorage.setItem(BOARD_THEME_STORAGE_KEY, themeId);
    syncUserSettingsBoardTheme(themeId);
    saveSettings({ ...settings, boardTheme: themeId });
  };

  if (compact) {
    return (
      <label
        className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 shadow-lg shadow-black/20 backdrop-blur-xl ${className}`}
        htmlFor={selectId}
      >
        <span className="text-slate-400">{label}</span>
        <select
          id={selectId}
          value={currentThemeId}
          onChange={handleChange}
          className="max-w-[150px] bg-transparent text-slate-50 outline-none"
        >
          {BOARD_THEME_OPTIONS.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className={`rounded-lg border border-white/10 bg-white/10 p-3 backdrop-blur-xl ${className}`}>
      <label
        htmlFor={selectId}
        className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>
      <select
        id={selectId}
        value={currentThemeId}
        onChange={handleChange}
        className="w-full rounded-md border border-white/10 bg-[#111827] px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition-colors focus:border-[#81b64c]"
      >
        {BOARD_THEME_OPTIONS.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
      <div className="mt-3 grid grid-cols-9 gap-1">
        {BOARD_THEME_OPTIONS.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() =>
              handleChange({ target: { value: theme.id } })
            }
            className={`h-6 overflow-hidden rounded border transition-transform hover:-translate-y-0.5 ${
              currentThemeId === theme.id
                ? "border-[#81b64c]"
                : "border-white/10"
            }`}
            title={theme.label}
            aria-label={`Use ${theme.label} board theme`}
          >
            <span className="grid h-full grid-cols-2">
              <span style={{ background: theme.light }} />
              <span style={{ background: theme.dark }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
