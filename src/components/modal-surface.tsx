"use client";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/** Native modal keeps Tab inside, makes the page inert, and restores focus. */
export function ModalSurface({
  label,
  className,
  onClose,
  children,
  returnFocus,
}: {
  label: string;
  className: string;
  onClose: () => void;
  children: ReactNode;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const trigger =
      returnFocus?.current || (document.activeElement as HTMLElement | null);
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      });
    };
  }, [returnFocus]);
  return (
    <dialog
      ref={dialog}
      className={className}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
