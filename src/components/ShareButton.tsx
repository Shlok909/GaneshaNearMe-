"use client";

import { useId, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { pandalUrl, sharePandal } from "@/lib/share";
import { useFeedback } from "./ui/Feedback";
import { Modal } from "./ui/Modal";
import { cn } from "@/lib/utils";

export function ShareButton({
  id,
  name,
  short = false,
}: {
  id: string;
  name: string;
  short?: boolean;
}) {
  const notify = useFeedback();
  const buttonId = useId();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  return (
    <>
      <button
        id={buttonId}
        type="button"
        className={cn("button button-secondary", short && "button-small")}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await sharePandal(id, name);
            if (result !== "cancelled") {
              setCopied(result === "copied");
              notify(result === "copied" ? "Link copied" : "Location shared");
            }
          } catch {
            setManualUrl(pandalUrl(id));
          } finally {
            setBusy(false);
          }
        }}
      >
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {busy
          ? "Sharing…"
          : copied
            ? "Link copied"
            : short
              ? "Share"
              : "Share Location"}
      </button>
      <Modal
        open={manualUrl !== null}
        onClose={() => setManualUrl(null)}
        title="Share this Ganapati"
        description="Copy this link to share the location."
        className="simple-modal"
        returnFocusId={buttonId}
      >
        <h2>Share this Ganapati</h2>
        <p>
          Your browser could not copy automatically. Select and copy the link
          below.
        </p>
        <label className="field-label" htmlFor={`share-${id}`}>
          Location link
        </label>
        <input
          id={`share-${id}`}
          className="input"
          readOnly
          value={manualUrl ?? ""}
          onFocus={(event) => event.target.select()}
        />
      </Modal>
    </>
  );
}
