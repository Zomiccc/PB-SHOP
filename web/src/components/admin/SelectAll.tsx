"use client";

/** "Select all" for a list of checkboxes named `name` inside the same form. */
export function SelectAll({ name, label = "Select all shown" }: { name: string; label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      <input
        type="checkbox"
        className="h-5 w-5"
        onChange={(e) => e.currentTarget.form?.querySelectorAll<HTMLInputElement>(`input[type=checkbox][name="${name}"]`).forEach((c) => (c.checked = e.currentTarget.checked))}
      />
      {label}
    </label>
  );
}
