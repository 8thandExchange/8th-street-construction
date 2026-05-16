"use client";
import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  dark?: boolean;
}

export function FieldShell({ label, htmlFor, error, required, children, className, dark }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "field-label",
          dark && "text-bone/60"
        )}
      >
        {label} {required && <span className="text-copper">*</span>}
      </label>
      {children}
      {error && (
        <span className="mt-2 text-xs text-copper-200 font-mono tracking-wider">{error}</span>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  dark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, required, dark, className, id, name, ...rest },
  ref
) {
  const fieldId = id || name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} required={required} dark={dark}>
      <input
        ref={ref}
        id={fieldId}
        name={name || fieldId}
        required={required}
        className={cn("field-input", dark && "field-input-dark", className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  dark?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, required, dark, className, id, name, rows = 5, ...rest },
  ref
) {
  const fieldId = id || name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} required={required} dark={dark}>
      <textarea
        ref={ref}
        id={fieldId}
        name={name || fieldId}
        rows={rows}
        required={required}
        className={cn("field-input resize-none py-3", dark && "field-input-dark", className)}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  dark?: boolean;
  options: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, required, dark, options, className, id, name, defaultValue, ...rest },
  ref
) {
  const fieldId = id || name || label.toLowerCase().replace(/\s+/g, "-");
  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} required={required} dark={dark}>
      <select
        ref={ref}
        id={fieldId}
        name={name || fieldId}
        required={required}
        defaultValue={defaultValue ?? ""}
        className={cn(
          "field-input appearance-none bg-no-repeat bg-[right_center] pr-6 cursor-pointer",
          dark && "field-input-dark",
          className
        )}
        style={{
          backgroundImage: dark
            ? "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23F5F1EA' stroke-opacity='0.6' stroke-width='1.5'/%3E%3C/svg%3E\")"
            : "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%230A0F14' stroke-opacity='0.6' stroke-width='1.5'/%3E%3C/svg%3E\")",
        }}
        {...rest}
      >
        <option value="" disabled>
          Select…
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
