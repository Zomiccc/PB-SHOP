"use client";

import { useState } from "react";

/**
 * Category dropdown with "+ Create new category" at the end (Nov 2026). Choosing it shows a name box; the new
 * category is saved with the form and appears in the list from then on.
 */
export function CategorySelect({ name, options, defaultValue, className = "field" }: { name: string; options: { key: string; label: string }[]; defaultValue?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.key ?? "");
  return (
    <>
      <select name={name} value={value} onChange={(e) => setValue(e.target.value)} className={className}>
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        <option value="__new__">+ Create new category</option>
      </select>
      {value === "__new__" && <input name="newCategory" required autoFocus maxLength={40} placeholder="New category name" aria-label="New category name" className={`${className} mt-2`} />}
    </>
  );
}
