import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#0B0C10] text-slate-900 dark:text-zinc-100 p-6">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-white/[0.08] shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">404 - Page Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            The requested route does not exist in the Herald workspace.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
