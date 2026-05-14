export const LANGUAGES = [
  { id: "en", label: "English", nativeName: "English", dir: "ltr" },
  { id: "kn", label: "Kannada", nativeName: "ಕನ್ನಡ", dir: "ltr" },
  { id: "hi", label: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { id: "ta", label: "Tamil", nativeName: "தமிழ்", dir: "ltr" },
  { id: "te", label: "Telugu", nativeName: "తెలుగు", dir: "ltr" },
  { id: "ml", label: "Malayalam", nativeName: "മലയാളം", dir: "ltr" },
  { id: "mr", label: "Marathi", nativeName: "मराठी", dir: "ltr" },
  { id: "gu", label: "Gujarati", nativeName: "ગુજરાતી", dir: "ltr" },
  { id: "pa", label: "Punjabi", nativeName: "ਪੰਜਾਬੀ", dir: "ltr" },
  { id: "ur", label: "Urdu", nativeName: "اردو", dir: "rtl" },
  { id: "es", label: "Spanish", nativeName: "Español", dir: "ltr" },
  { id: "fr", label: "French", nativeName: "Français", dir: "ltr" },
  { id: "de", label: "German", nativeName: "Deutsch", dir: "ltr" },
  { id: "ja", label: "Japanese", nativeName: "日本語", dir: "ltr" },
  { id: "zh", label: "Chinese", nativeName: "中文", dir: "ltr" },
  { id: "ar", label: "Arabic", nativeName: "العربية", dir: "rtl" },
  { id: "ru", label: "Russian", nativeName: "Русский", dir: "ltr" },
  { id: "pt", label: "Portuguese", nativeName: "Português", dir: "ltr" },
];

export const LANGUAGE_IDS = new Set(LANGUAGES.map((language) => language.id));

export function getLanguageMeta(languageId = "en") {
  return LANGUAGES.find((language) => language.id === languageId) || LANGUAGES[0];
}
