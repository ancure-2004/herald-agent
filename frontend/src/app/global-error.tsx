"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="h-screen w-screen flex items-center justify-center bg-[#FAF9F6] text-slate-900 font-sans p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Application Error</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            A critical error halted application initialization.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
