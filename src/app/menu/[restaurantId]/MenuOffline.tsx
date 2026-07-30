/**
 * Shown when a super admin has switched a restaurant's menu off.
 *
 * A server component with no data of its own: the menu is paused, so nothing
 * about the menu should load. It keeps the restaurant's name and logo so a
 * visitor who followed a printed QR code can see they reached the right place,
 * and says nothing about why — the reason is between the operator and their
 * client, not something to publish on the restaurant's own page.
 */
export default function MenuOffline({
  name,
  logoUrl,
}: {
  name?: string;
  logoUrl?: string;
}) {
  return (
    <main
      dir="rtl"
      className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name || ''}
          className="w-24 h-24 rounded-2xl object-cover shadow-lg opacity-90"
        />
      ) : null}

      {name ? <h1 className="text-2xl font-black tracking-tight">{name}</h1> : null}

      <div className="max-w-sm space-y-2">
        <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
          المنيو غير متاح حالياً
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          هذه الصفحة متوقفة مؤقتاً. برجاء التواصل مع المطعم مباشرة للطلب أو
          الاستفسار.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 pt-1" dir="ltr">
          This menu is temporarily unavailable.
        </p>
      </div>
    </main>
  );
}
