"use client";

import { ErrorState } from "@/components/ui/ErrorStates";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center p-6">
      <ErrorState
        title="Unexpected application error"
        message={error.message || "Something went wrong while rendering SakayNa."}
        onRetry={reset}
      />
    </div>
  );
}
