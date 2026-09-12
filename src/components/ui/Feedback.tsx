"use client";

import { Check, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Feedback = { text: string; kind: "success" | "info" };
const FeedbackContext = createContext<
  (text: string, kind?: Feedback["kind"]) => void
>(() => {});

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<Feedback | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback(
    (text: string, kind: Feedback["kind"] = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setMessage({ text, kind });
      timer.current = setTimeout(() => setMessage(null), 4500);
    },
    [],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <FeedbackContext.Provider value={notify}>
      {children}
      <div
        className="feedback-container"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {message && (
          <div className="feedback">
            {message.kind === "success" ? (
              <Check size={19} />
            ) : (
              <Info size={19} />
            )}
            <span>{message.text}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss notification"
              onClick={() => setMessage(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => useContext(FeedbackContext);
