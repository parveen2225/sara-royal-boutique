export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "boutique-theme";
export const LEGACY_THEME_STORAGE_KEY = "notes-app-theme";
export const DEFAULT_THEME: ThemeMode = "dark";

export const getThemeInitScript = () => {
  return `(function(){try{var k=${JSON.stringify(
    THEME_STORAGE_KEY
  )};var lk=${JSON.stringify(
    LEGACY_THEME_STORAGE_KEY
  )};var t=localStorage.getItem(k)||localStorage.getItem(lk);t=(t==="dark"||t==="light")?t:${JSON.stringify(
    DEFAULT_THEME
  )};var r=document.documentElement;r.classList.remove("theme-light","theme-dark");r.classList.add("theme-"+t);r.style.colorScheme=t;}catch(e){}})();`;
};
