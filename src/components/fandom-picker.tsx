"use client";
import { matchesSearch } from "@/lib/search";
import { useState } from "react";
import { fandoms } from "@/lib/fandoms";
import { useWorkspace } from "./workspace-provider";
export function FandomPicker({
  value,
  onChange,
  required = false,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
}) {
  const { t } = useWorkspace();
  const [query, setQuery] = useState("");
  const matches = fandoms.filter(
    (f) => matchesSearch(query, f.name, t[f.category]) || f.id === value,
  );
  return (
    <fieldset className="fandom-picker">
      <legend>
        {t.fandomPage.choose}
        {required ? " *" : ` (${t.optional})`}
      </legend>
      <label htmlFor="fandom-filter" className="sr-only">
        {t.fandomPage.filter}
      </label>
      <input
        id="fandom-filter"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.fandomPage.filter}
      />
      <label htmlFor="room-fandom" className="sr-only">
        {t.fandomPage.choose}
      </label>
      <select
        id="room-fandom"
        name="fandomId"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        aria-invalid={invalid}
        aria-describedby="fandom-help"
      >
        <option value="">{t.roomStudio.other}</option>
        {matches.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name} · {t[f.category]}
          </option>
        ))}
      </select>
      <small id="fandom-help">{t.roomStudio.optionalFandom}</small>
      {invalid && (
        <p className="error" role="alert">
          {t.fandomPage.required}
        </p>
      )}
    </fieldset>
  );
}
