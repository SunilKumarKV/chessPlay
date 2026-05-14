import React, { useCallback, useEffect, useMemo, useState } from "react";
import { I18nContext } from "./I18nContextObject";
import { getLanguageMeta, LANGUAGE_IDS } from "./languages";

const DICTIONARY = {
  en: {
    settings: "Settings",
    profile: "Profile",
    account: "Account",
    language: "Language",
    theme: "Theme",
    save: "Save",
    reset: "Reset",
    loading: "Loading...",
    community: "Community",
    messages: "Messages",
  },
  kn: { settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", profile: "ಪ್ರೊಫೈಲ್", account: "ಖಾತೆ", language: "ಭಾಷೆ", theme: "ಥೀಮ್", save: "ಉಳಿಸಿ", reset: "ಮರುಹೊಂದಿಸಿ", loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...", community: "ಸಮುದಾಯ", messages: "ಸಂದೇಶಗಳು" },
  hi: { settings: "सेटिंग्स", profile: "प्रोफ़ाइल", account: "खाता", language: "भाषा", theme: "थीम", save: "सेव करें", reset: "रीसेट", loading: "लोड हो रहा है...", community: "समुदाय", messages: "संदेश" },
  ta: { settings: "அமைப்புகள்", profile: "சுயவிவரம்", account: "கணக்கு", language: "மொழி", theme: "தீம்", save: "சேமி", reset: "மீட்டமை", loading: "ஏற்றுகிறது...", community: "சமூகம்", messages: "செய்திகள்" },
  te: { settings: "సెట్టింగ్‌లు", profile: "ప్రొఫైల్", account: "ఖాతా", language: "భాష", theme: "థీమ్", save: "సేవ్", reset: "రీసెట్", loading: "లోడ్ అవుతోంది...", community: "కమ్యూనిటీ", messages: "సందేశాలు" },
  ml: { settings: "ക്രമീകരണങ്ങൾ", profile: "പ്രൊഫൈൽ", account: "അക്കൗണ്ട്", language: "ഭാഷ", theme: "തീം", save: "സേവ്", reset: "റീസെറ്റ്", loading: "ലോഡ് ചെയ്യുന്നു...", community: "കമ്മ്യൂണിറ്റി", messages: "സന്ദേശങ്ങൾ" },
  es: { settings: "Configuración", profile: "Perfil", account: "Cuenta", language: "Idioma", theme: "Tema", save: "Guardar", reset: "Restablecer", loading: "Cargando...", community: "Comunidad", messages: "Mensajes" },
  fr: { settings: "Paramètres", profile: "Profil", account: "Compte", language: "Langue", theme: "Thème", save: "Enregistrer", reset: "Réinitialiser", loading: "Chargement...", community: "Communauté", messages: "Messages" },
  de: { settings: "Einstellungen", profile: "Profil", account: "Konto", language: "Sprache", theme: "Design", save: "Speichern", reset: "Zurücksetzen", loading: "Laden...", community: "Community", messages: "Nachrichten" },
  ja: { settings: "設定", profile: "プロフィール", account: "アカウント", language: "言語", theme: "テーマ", save: "保存", reset: "リセット", loading: "読み込み中...", community: "コミュニティ", messages: "メッセージ" },
  zh: { settings: "设置", profile: "个人资料", account: "账户", language: "语言", theme: "主题", save: "保存", reset: "重置", loading: "加载中...", community: "社区", messages: "消息" },
  ar: { settings: "الإعدادات", profile: "الملف الشخصي", account: "الحساب", language: "اللغة", theme: "المظهر", save: "حفظ", reset: "إعادة ضبط", loading: "جارٍ التحميل...", community: "المجتمع", messages: "الرسائل" },
  ru: { settings: "Настройки", profile: "Профиль", account: "Аккаунт", language: "Язык", theme: "Тема", save: "Сохранить", reset: "Сброс", loading: "Загрузка...", community: "Сообщество", messages: "Сообщения" },
  pt: { settings: "Configurações", profile: "Perfil", account: "Conta", language: "Idioma", theme: "Tema", save: "Salvar", reset: "Redefinir", loading: "Carregando...", community: "Comunidade", messages: "Mensagens" },
};


function readStoredLanguage() {
  try {
    const settings = JSON.parse(localStorage.getItem("userSettings") || "{}");
    const language = settings?.appearance?.language || "en";
    return LANGUAGE_IDS.has(language) ? language : "en";
  } catch {
    return "en";
  }
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = LANGUAGE_IDS.has(nextLanguage) ? nextLanguage : "en";
    setLanguageState(normalized);
    const meta = getLanguageMeta(normalized);
    document.documentElement.lang = normalized;
    document.documentElement.dir = meta.dir;
  }, []);

  useEffect(() => {
    const onAppearanceChange = (event) => {
      if (event.detail?.language) setLanguage(event.detail.language);
    };
    window.addEventListener("appearanceSettingsChanged", onAppearanceChange);
    return () => window.removeEventListener("appearanceSettingsChanged", onAppearanceChange);
  }, [setLanguage]);

  useEffect(() => {
    const meta = getLanguageMeta(language);
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language]);

  const t = useCallback(
    (key) => DICTIONARY[language]?.[key] || DICTIONARY.en[key] || key,
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
