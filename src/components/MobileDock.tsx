import { useEffect, useState } from 'react';

/**
 * Bottom tab dock for narrow screens (< 768 px, DESIGN.md §5).
 * Each tab scrolls to one section of the page; the tab of the section in view is highlighted.
 * Nothing is hidden: the dock is a jump bar, so content stays reachable by normal scrolling too.
 * The page must reserve space at the bottom (pb-14 md:pb-0) so the dock never covers content.
 */
export function MobileDock({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  // The parent may re-render at 50 Hz with a new array: observe by ids, not by array identity.
  const idKey = items.map((i) => i.id).join('|');

  useEffect(() => {
    const ids = idKey.split('|');
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [idKey]);

  return (
    <nav
      aria-label="Sections"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-12 bg-oa-surface border-t border-oa-border-strong flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          aria-current={active === it.id ? 'true' : undefined}
          onClick={() => {
            setActive(it.id);
            document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={`flex-1 text-xs font-medium cursor-pointer border-t-2 ${
            active === it.id ? 'border-slate-200 text-white bg-oa-raised' : 'border-transparent text-slate-400'
          }`}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}
