"use client";
import { Check, Monitor } from "lucide-react";
import { themeNames, themes } from "@/lib/themes";
import { useTheme } from "./theme-provider";
import { useWorkspace } from "./workspace-provider";
export function ThemePicker() {
  const { theme, setTheme, error } = useTheme();
  const { t } = useWorkspace();
  const descriptions = {
    obsidian: t.themeObsidian,
    ember: t.themeEmber,
    aurora: t.themeAurora,
    violet: t.themeViolet,
    paper: t.themePaper,
    system: t.themeSystem,
  };
  return (
    <section className="appearance-section">
      <div className="section-heading">
        <div>
          <h2>{t.appearance}</h2>
          <p>{t.themeHint}</p>
        </div>
      </div>
      <div className="theme-options" role="group" aria-label={t.appearance}>
        {themes.map((value) => (
          <button
            key={value}
            className={`theme-option ${theme === value ? "selected" : ""}`}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <span
              className="theme-preview"
              data-theme={value === "system" ? "obsidian" : value}
            >
              <span className="preview-sidebar" />
              <span className="preview-main">
                <i />
                <b />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              {value === "system" && (
                <Monitor className="system-icon" size={24} />
              )}
            </span>
            <span className="theme-option-title">
              {value === "system" ? t.systemTheme : themeNames[value]}
              {theme === value && <Check size={17} />}
            </span>
            <small>{descriptions[value]}</small>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="error">
          {t.themeStorageError}
        </p>
      )}
    </section>
  );
}
