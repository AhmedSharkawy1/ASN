/**
 * Shown instantly while the menu page's server component is rendering.
 *
 * Without this file, Next.js shows nothing (a blank white page) until the
 * full server response is ready. This skeleton appears on the very first
 * frame, so even on slow connections the customer knows the page is loading.
 */
export default function MenuLoading() {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-[#0a0a0a]"
    >
      {/* Spinning logo placeholder */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-[3px] border-zinc-200 dark:border-zinc-800 border-t-amber-500 animate-spin"
        />
        <svg
          className="w-10 h-10 text-zinc-300 dark:text-zinc-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse">
        جاري تحميل المنيو...
      </p>
    </div>
  );
}
