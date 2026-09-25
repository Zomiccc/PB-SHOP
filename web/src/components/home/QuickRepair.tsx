"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REPAIR_CATEGORIES } from "@/lib/constants";
import { Icon } from "../ui/Icon";

/** "Something not working right?" quick-start card from the reference, feeding the full repair form. */
export function QuickRepair() {
  const router = useRouter();
  const [device, setDevice] = useState("");
  const [issue, setIssue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = new URLSearchParams();
        if (device) q.set("device", device);
        if (issue) q.set("issue", issue);
        router.push(`/repair?${q}#form`);
      }}
      className="mt-8 space-y-4"
    >
      <div>
        <label htmlFor="qr-device" className="label">Your phone</label>
        <input id="qr-device" value={device} onChange={(e) => setDevice(e.target.value)} placeholder="e.g. iPhone 13, Samsung A54" className="field" />
      </div>
      <div>
        <label htmlFor="qr-issue" className="label">What&apos;s going on?</label>
        <select id="qr-issue" value={issue} onChange={(e) => setIssue(e.target.value)} className="field">
          <option value="">Choose the issue</option>
          {Object.entries(REPAIR_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <button className="btn btn-gold w-full justify-between">
        Create my visit note <Icon name="arrow-up-right" className="h-4 w-4" />
      </button>
    </form>
  );
}
