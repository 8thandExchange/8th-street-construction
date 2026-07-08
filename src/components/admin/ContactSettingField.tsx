"use client";

import { useState } from "react";

export type ContactValue = {
  city: string | null;
  email: string | null;
  phone: string | null;
  service_area: string[];
};

export function isContactValue(value: unknown): value is ContactValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const stringOrNull = (x: unknown) => typeof x === "string" || x === null;
  return (
    stringOrNull(v.city) &&
    stringOrNull(v.email) &&
    stringOrNull(v.phone) &&
    Array.isArray(v.service_area) &&
    v.service_area.every((s) => typeof s === "string")
  );
}

/**
 * Friendly editor for the structured "contact" site setting. Emits the same
 * hidden "value" JSON field the upsert action expects, so saving is unchanged.
 */
export function ContactSettingField({ value }: { value: ContactValue }) {
  const [city, setCity] = useState(value.city ?? "");
  const [email, setEmail] = useState(value.email ?? "");
  const [phone, setPhone] = useState(value.phone ?? "");
  const [areas, setAreas] = useState<string[]>(value.service_area);
  const [newArea, setNewArea] = useState("");

  const payload: ContactValue = {
    city: city.trim() || null,
    email: email.trim() || null,
    phone: phone.trim() || null,
    service_area: areas,
  };

  function addArea() {
    const name = newArea.trim();
    if (!name) return;
    setAreas((prev) =>
      prev.some((a) => a.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name]
    );
    setNewArea("");
  }

  return (
    <div className="space-y-5">
      <input type="hidden" name="value" value={JSON.stringify(payload)} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-400">City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Augusta, Georgia"
            className="field-input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hello@example.com"
            className="field-input mt-1"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-stone-400">Phone</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(706) 555-0100"
            className="field-input mt-1"
          />
        </label>
      </div>

      <div>
        <span className="text-xs uppercase tracking-wider text-stone-400">Service area</span>
        <ul className="mt-2 flex flex-wrap gap-2">
          {areas.map((area) => (
            <li
              key={area}
              className="flex items-center gap-2 border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink"
            >
              {area}
              <button
                type="button"
                onClick={() => setAreas((prev) => prev.filter((a) => a !== area))}
                aria-label={`Remove ${area}`}
                className="text-stone-400 hover:text-ink"
              >
                &times;
              </button>
            </li>
          ))}
          {areas.length === 0 && (
            <li className="text-sm text-stone-400">No service areas yet.</li>
          )}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addArea();
              }
            }}
            placeholder="Add a city or county"
            className="field-input max-w-xs"
          />
          <button type="button" onClick={addArea} className="app-btn app-btn-secondary">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
