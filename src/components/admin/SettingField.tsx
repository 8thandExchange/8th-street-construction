"use client";

import { useState } from "react";

type Kind = "string" | "number" | "boolean" | "json";

function detectKind(value: unknown): Kind {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "json";
}

/**
 * Renders a friendly control for a site setting and emits a valid-JSON
 * hidden "value" field for the existing upsert action. Falls back to a raw
 * JSON editor for objects/arrays.
 */
export function SettingField({ value }: { value: unknown }) {
  const kind = detectKind(value);

  const [text, setText] = useState(() =>
    kind === "string" ? (value as string) : ""
  );
  const [num, setNum] = useState(() =>
    kind === "number" ? String(value as number) : ""
  );
  const [bool, setBool] = useState(() => (kind === "boolean" ? (value as boolean) : false));
  const [json, setJson] = useState(() =>
    kind === "json" ? JSON.stringify(value, null, 2) : ""
  );

  if (kind === "boolean") {
    return (
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="hidden" name="value" value={String(bool)} />
        <input
          type="checkbox"
          checked={bool}
          onChange={(e) => setBool(e.target.checked)}
          className="accent-copper h-4 w-4"
        />
        {bool ? "Enabled" : "Disabled"}
      </label>
    );
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        name="value"
        value={num}
        onChange={(e) => setNum(e.target.value)}
        className="field-input max-w-xs"
      />
    );
  }

  if (kind === "string") {
    const multiline = text.includes("\n") || text.length > 60;
    return (
      <>
        <input type="hidden" name="value" value={JSON.stringify(text)} />
        {multiline ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={Math.min(12, Math.max(3, text.split("\n").length + 1))}
            className="field-input py-3 resize-y"
          />
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field-input"
          />
        )}
      </>
    );
  }

  return (
    <>
      <p className="text-[11px] font-mono uppercase tracking-wider text-stone-400 mb-2">
        Advanced (JSON)
      </p>
      <textarea
        name="value"
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={Math.min(20, Math.max(4, json.split("\n").length + 1))}
        className="field-input py-3 font-mono text-xs leading-relaxed resize-y"
      />
    </>
  );
}
