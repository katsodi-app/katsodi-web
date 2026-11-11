// Browser-only test harness. Never imported by app routes or used for authorization.
import { createRoot } from "react-dom/client";
import {
  WorkspaceProvider,
  useWorkspace,
} from "../../src/components/workspace-provider";
import { SharedRoom } from "../../src/components/network-rooms";
import { Shell } from "../../src/components/shell";
import type { RoomSnapshot } from "../../src/lib/server/network-data";
declare global {
  interface Window {
    __chatFixture: RoomSnapshot;
    __creationImportFailed?: boolean;
    __chatShell?: boolean;
  }
}
function Preview() {
  const { setLocale } = useWorkspace();
  if (window.__chatShell)
    return (
      <Shell>
        <SharedRoom initial={window.__chatFixture} />
      </Shell>
    );
  return (
    <>
      <div
        className="language-switch"
        style={{ margin: "20px auto", width: "fit-content" }}
      >
        <button onClick={() => setLocale("ru")}>RU</button>
        <button onClick={() => setLocale("en")}>EN</button>
      </div>
      <main style={{ maxWidth: 1300, padding: "12px 24px 40px" }}>
        <SharedRoom
          initial={window.__chatFixture}
          creationImportFailed={window.__creationImportFailed}
        />
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <WorkspaceProvider>
    <Preview />
  </WorkspaceProvider>,
);
