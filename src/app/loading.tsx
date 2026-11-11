"use client";
import { useWorkspace } from "@/components/workspace-provider";
export default function Loading() {
  const { t } = useWorkspace();
  return (
    <div className="brand-loading" role="status" aria-busy="true">
      <div className="brand-loading-title" aria-hidden="true" />
      <div className="brand-loading-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{t.loading}</p>
    </div>
  );
}
