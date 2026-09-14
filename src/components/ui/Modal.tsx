"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  returnFocusId,
  closeLabel = "Close details",
  focusContentOnOpen = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  returnFocusId?: string;
  closeLabel?: string;
  focusContentOnOpen?: boolean;
}) {
  const content = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          ref={content}
          className={cn("modal-content", className)}
          onOpenAutoFocus={focusContentOnOpen ? event => {
            // A marker's Enter key can still be held when this opens. Focusing
            // the container avoids that key activating the close button.
            event.preventDefault();
            content.current?.focus({ preventScroll: true });
          } : undefined}
          onCloseAutoFocus={(event) => {
            if (returnFocusId) {
              event.preventDefault();
              document.getElementById(returnFocusId)?.focus();
            }
          }}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {description}
          </Dialog.Description>
          <Dialog.Close
            className="modal-close icon-button"
            aria-label={closeLabel}
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
