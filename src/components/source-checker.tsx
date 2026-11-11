"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Link2 } from "lucide-react";
import { knownPlayer } from "@/lib/player";
import { inspectSource } from "@/lib/providers";
import { useWorkspace } from "./workspace-provider";
export function SourceChecker() {
  const { t } = useWorkspace();
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const result = inspectSource(input);
  const discoverable = knownPlayer(input).kind === "discover";
  function submit(e: FormEvent) {
    e.preventDefault();
    setChecked(true);
  }
  return (
    <section className="source-panel">
      <div className="source-icon">
        <Link2 size={23} />
      </div>
      <div className="source-copy">
        <h2>{t.sourceTitle}</h2>
        <p>{t.sourceBody}</p>
      </div>
      <form onSubmit={submit} className="source-form">
        <label className="sr-only" htmlFor="source-link">
          {t.linkLabel}
        </label>
        <input
          id="source-link"
          placeholder={t.sourcePlaceholder}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setChecked(false);
          }}
          aria-invalid={checked && !result}
          aria-describedby={checked ? "source-result" : undefined}
        />
        <button className="button button-secondary" type="submit">
          {t.check}
          <ArrowUpRight size={16} />
        </button>
      </form>
      {checked && (
        <div
          id="source-result"
          className={`source-result ${!result ? "error" : ""}`}
          role="status"
        >
          {result ? (
            <>
              <strong>
                {result.provider.name} ·{" "}
                {result.provider.capabilities.embed
                  ? t.player.inRoom
                  : discoverable
                    ? t.player.discoveryAvailable
                    : t.companion}
              </strong>
              <p>
                {result.provider.capabilities.embed
                  ? t.player.checkerHint
                  : discoverable
                    ? t.player.discoveryHint
                    : t.companionHint}
              </p>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                {t.external}
                <ArrowUpRight size={16} />
              </a>
            </>
          ) : (
            t.invalidUrl
          )}
        </div>
      )}
    </section>
  );
}
