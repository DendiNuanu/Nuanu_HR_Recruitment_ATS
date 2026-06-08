"use client";

import { useFormStatus } from "react-dom";
import { Save, Loader2 } from "lucide-react";

export default function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn-primary py-3 justify-center text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
        </>
      ) : (
        <>
          <Save className="w-4 h-4" /> Create &amp; Submit for Approval
        </>
      )}
    </button>
  );
}
