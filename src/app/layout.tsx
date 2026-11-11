import type { Metadata } from "next";
import { preload } from "react-dom";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { MusicPlayerProvider } from "@/components/music-player-provider";
import { Shell } from "@/components/shell";
import { ThemeProvider } from "@/components/theme-provider";
import { themeBootstrap } from "@/lib/themes";
import { supabaseConfig } from "@/lib/supabase/config";
import { consentBootstrap } from "@/lib/consent-bootstrap";
import "./fonts.css";
import "./globals.css";
import "./brand.css";
import "./components.css";
import "./room.css";
import "./signal.css";
import "./profile-settings.css";
import "./music-library.css";
import "./platform-ux.css";
import "./room-studio.css";
import "./overview.css";
export const metadata: Metadata = {
  title: "Katsodi — Better together",
  description:
    "Собирайтесь с друзьями, чтобы вместе смотреть и слушать. Watch, listen, and spend time together.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Both interface languages need these two Manrope subsets (fonts.css) on
  // every page; preloading them lets the font arrive with the stylesheet.
  for (const subset of ["latin", "cyrillic"])
    preload(`/fonts/manrope/manrope-${subset}.woff2`, {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    });
  return (
    <html lang="ru" data-theme="obsidian" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <script dangerouslySetInnerHTML={{ __html: consentBootstrap }} />
      </head>
      <body>
        <ThemeProvider>
          <WorkspaceProvider>
            <MusicPlayerProvider>
              <Shell backendConfigured={!!supabaseConfig()}>{children}</Shell>
            </MusicPlayerProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
