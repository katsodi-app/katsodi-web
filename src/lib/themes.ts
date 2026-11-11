export const themes = [
  "obsidian",
  "ember",
  "aurora",
  "violet",
  "paper",
  "system",
] as const;
export type Theme = (typeof themes)[number];
export const themeNames: Record<Theme, string> = {
  obsidian: "Obsidian",
  ember: "Ember",
  aurora: "Aurora",
  violet: "Violet",
  paper: "Paper",
  system: "System",
};
export const isTheme = (value: unknown): value is Theme =>
  themes.includes(value as Theme);
// Static, allowlisted bootstrap runs before paint. No user text is interpolated.
export const themeBootstrap = `(function(){try{var t=localStorage.getItem('katsodi.theme');if(!['obsidian','ember','aurora','violet','paper','system'].includes(t))t='obsidian';document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'paper':'obsidian'):t;}catch(e){document.documentElement.dataset.theme='obsidian';}})();`;
