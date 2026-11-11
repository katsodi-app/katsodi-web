"use client";
import type { ActionResult } from "@/lib/server/contracts";
import { useWorkspace } from "./workspace-provider";

export function ActionStatus({ result }: { result: ActionResult }) {
  const { t } = useWorkspace();
  const n = t.network;
  if (result.status === "idle") return null;
  const service = result.service || "";
  const imported = result.imported;
  const special: Partial<Record<string, string>> = {
    imported: imported
      ? n.musicImported
          .replace("{added}", String(imported.added))
          .replace("{found}", String(imported.found)) +
        (imported.capped || imported.added < imported.found
          ? ` (${n.musicImportCapped})`
          : "")
      : undefined,
    importUnsupported: n.importUnsupported,
    importUnconfigured: n.importUnconfigured.replace("{service}", service),
    importNotFound: n.importNotFound,
    importEmpty: n.importEmpty,
    musicOnly: n.musicOnly,
  };
  if (result.code && special[result.code])
    return (
      <p
        role={result.status === "error" ? "alert" : "status"}
        className={result.status === "error" ? "error" : "notice"}
      >
        {special[result.code]}
      </p>
    );
  const message =
    result.code === "mediaUnavailable"
      ? n.mediaUnavailable
      : result.code === "unconfigured"
        ? n.notConfigured
        : result.code === "sent"
          ? n.emailSent
          : result.code === "saved"
            ? n.saved
            : result.code === "terms"
              ? n.termsRequired
              : result.code === "invalid"
                ? n.invalid
                : result.code === "auth"
                  ? n.auth
                  : result.code === "rateLimit"
                    ? n.rateLimit
                    : result.code === "queueFull"
                      ? n.queueFull
                      : result.code === "demoBusy"
                        ? n.demoBusy
                        : result.code === "demoUnavailable"
                          ? n.demoUnavailable
                          : result.code === "requestSent"
                            ? n.requestSent
                            : result.code === "fandomExists"
                              ? n.fandomExists
                              : result.code === "requestExists"
                                ? n.requestExists
                                : result.code === "requestUnavailable"
                                  ? n.requestUnavailable
                                  : n.failed;
  return (
    <p
      role={result.status === "error" ? "alert" : "status"}
      className={result.status === "error" ? "error" : "notice"}
    >
      {message}
    </p>
  );
}
