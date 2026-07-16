import { useCallback, useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "failed";

const COPY_FEEDBACK_DURATION_MS = 2_200;

export const useClipboardCopy = () => {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  const clearResetTimer = useCallback(() => {
    if (resetTimer.current !== undefined) {
      window.clearTimeout(resetTimer.current);
      resetTimer.current = undefined;
    }
  }, []);

  const resetCopyState = useCallback(() => {
    clearResetTimer();
    setCopyState("idle");
  }, [clearResetTimer]);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  const copyText = useCallback(
    async (value: string) => {
      clearResetTimer();

      try {
        await navigator.clipboard.writeText(value);
        setCopyState("copied");
      } catch {
        setCopyState("failed");
      }

      resetTimer.current = window.setTimeout(() => {
        setCopyState("idle");
        resetTimer.current = undefined;
      }, COPY_FEEDBACK_DURATION_MS);
    },
    [clearResetTimer],
  );

  return { copyState, copyText, resetCopyState };
};
