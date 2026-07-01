"use client";

type PortalAccessToggleProps = {
  name: string;
  defaultChecked: boolean;
  label: string;
  description?: string;
  disabled?: boolean;
};

/** Controlled-looking toggle that submits with parent form via hidden input */
export function PortalAccessToggle({
  name,
  defaultChecked,
  label,
  description,
  disabled,
}: PortalAccessToggleProps) {
  return (
    <label
      className={`portal-toggle-row ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input type="hidden" name={name} value="false" />
      <div className="portal-toggle-copy">
        <span className="portal-toggle-label">{label}</span>
        {description && <span className="portal-toggle-desc">{description}</span>}
      </div>
      <span className="portal-toggle-switch">
        <input
          type="checkbox"
          name={name}
          value="true"
          defaultChecked={defaultChecked}
          disabled={disabled}
          className="portal-toggle-input sr-only"
        />
        <span className="portal-toggle-track" aria-hidden />
      </span>
    </label>
  );
}
