import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * « Nouvelle version prête » toast (Sprint 1b).
 *
 * The offline copy (service worker) can keep serving an older build after a deploy. For a teaching
 * tool whose content gets clinical corrections, the user is told as soon as a newer version is
 * downloaded, and one tap installs it and reloads. The app also checks for a new version every hour
 * while it stays open, so a tab left open on a ward PC does not stay on an old build for days.
 */
const CHECK_EVERY_MS = 60 * 60 * 1000;

export function UpdateToast({ fr }: { fr: boolean }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      window.setInterval(() => {
        if (navigator.onLine) void reg.update();
      }, CHECK_EVERY_MS);
    },
  });

  if (!needRefresh) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[100] bottom-3 inset-x-3 sm:inset-x-auto sm:end-4 sm:bottom-4 flex items-center gap-3 rounded border border-oa-border-strong bg-oa-raised px-3 py-2 shadow-lg text-sm text-slate-100"
    >
      <RefreshCw className="w-4 h-4 shrink-0 text-slate-300" aria-hidden />
      <span className="flex-1">{fr ? 'Nouvelle version clinique prête' : 'Clinical update ready'}</span>
      <button
        type="button"
        onClick={() => void updateServiceWorker(true)}
        className="h-8 px-3 rounded bg-slate-100 text-oa-canvas font-semibold hover:bg-white cursor-pointer"
      >
        {fr ? 'Actualiser' : 'Reload'}
      </button>
      <button
        type="button"
        onClick={() => setNeedRefresh(false)}
        aria-label={fr ? 'Plus tard' : 'Later'}
        title={fr ? 'Plus tard' : 'Later'}
        className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-white cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
