import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/client';

const LIVE_MS = 3 * 60 * 1000;
const STALE_MS = 6 * 60 * 60 * 1000;

function tierFromKiosk(k, now) {
  if (k.status === 'maintenance') return { key: 'maintenance', label: 'Maintenance', order: 2 };
  const t = k.lastHeartbeat ? new Date(k.lastHeartbeat).getTime() : null;
  if (t == null || Number.isNaN(t)) {
    return { key: 'dark', label: 'No signal', order: 3 };
  }
  const age = now - t;
  if (age <= LIVE_MS) return { key: 'live', label: 'Live', order: 0 };
  if (age <= STALE_MS) return { key: 'stale', label: 'Stale', order: 1 };
  return { key: 'dark', label: 'Offline', order: 3 };
}

function formatRelative(msAgo, rtf) {
  const sec = Math.round(msAgo / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return rtf.format(-sec, 'second');
  if (min < 60) return rtf.format(-min, 'minute');
  if (hr < 48) return rtf.format(-hr, 'hour');
  return rtf.format(-day, 'day');
}

export default function KioskFleetHealthPulse() {
  const [kiosks, setKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const [lastFetch, setLastFetch] = useState(null);

  const rtf = useMemo(() => new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }), []);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.get('/admin/kiosks');
      setKiosks(data.kiosks || []);
      setLastFetch(Date.now());
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not load kiosks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();

  const enriched = useMemo(() => {
    return kiosks.map((k) => {
      const tier = tierFromKiosk(k, now);
      const hb = k.lastHeartbeat ? new Date(k.lastHeartbeat).getTime() : null;
      const sync = k.lastSyncTime ? new Date(k.lastSyncTime).getTime() : null;
      const ageMs = hb != null && !Number.isNaN(hb) ? now - hb : null;
      return {
        ...k,
        tier,
        ageMs,
        relativeHb: ageMs != null ? formatRelative(ageMs, rtf) : null,
        relativeSync:
          sync != null && !Number.isNaN(sync) ? formatRelative(now - sync, rtf) : null,
      };
    });
  }, [kiosks, now, rtf, tick]);

  const counts = useMemo(() => {
    const c = { live: 0, stale: 0, maintenance: 0, dark: 0 };
    enriched.forEach((k) => {
      c[k.tier.key] += 1;
    });
    return c;
  }, [enriched]);

  const sorted = useMemo(
    () => [...enriched].sort((a, b) => a.tier.order - b.tier.order || a.kioskId.localeCompare(b.kioskId)),
    [enriched],
  );

  const tierStyles = {
    live: {
      ring: 'ring-emerald-500/40',
      dot: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]',
      badge: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
      bar: 'from-emerald-500 to-teal-400',
    },
    stale: {
      ring: 'ring-amber-500/35',
      dot: 'bg-amber-400',
      badge: 'bg-amber-500/15 text-amber-800 border-amber-500/30',
      bar: 'from-amber-500 to-orange-400',
    },
    maintenance: {
      ring: 'ring-violet-500/35',
      dot: 'bg-violet-400',
      badge: 'bg-violet-500/15 text-violet-800 border-violet-500/30',
      bar: 'from-violet-500 to-purple-400',
    },
    dark: {
      ring: 'ring-slate-400/30',
      dot: 'bg-slate-400',
      badge: 'bg-slate-500/15 text-slate-600 border-slate-500/25',
      bar: 'from-slate-500 to-slate-600',
    },
  };

  return (
    <section
      className="relative mb-8 rounded-2xl overflow-hidden border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl shadow-indigo-950/20"
      aria-labelledby="fleet-health-heading"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_20%_-20%,rgba(99,102,241,0.35),transparent)] pointer-events-none" />
      <div className="relative px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-300/90 mb-1">
            Operations
          </p>
          <h2 id="fleet-health-heading" className="text-xl font-bold tracking-tight">
            Kiosk fleet health
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Live signal from last heartbeat (≤3 min), stale window 6 h, then no signal. Sync shows last data
            timestamp when present.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastFetch && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Updated {formatRelative(now - lastFetch, rtf)}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2.5 text-sm font-medium transition disabled:opacity-50"
            aria-label="Refresh kiosk health"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="relative px-6 py-5 bg-slate-950/40">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => load()} className="text-red-300 underline text-xs font-medium">
              Retry
            </button>
          </div>
        )}

        {loading && kiosks.length === 0 && !error ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-slate-800/50 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No kiosks registered yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { k: 'live', label: 'Live', n: counts.live },
                { k: 'stale', label: 'Stale', n: counts.stale },
                { k: 'maintenance', label: 'Maint.', n: counts.maintenance },
                { k: 'dark', label: 'No signal', n: counts.dark },
              ].map(({ k, label, n }) => (
                <div
                  key={k}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border bg-slate-900/60 backdrop-blur-sm ${tierStyles[k].badge}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${tierStyles[k].dot}`} />
                  {label}
                  <span className="tabular-nums opacity-80">{n}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {sorted.map((k) => {
                const s = tierStyles[k.tier.key];
                const livePulse = k.tier.key === 'live';
                return (
                  <article
                    key={k._id}
                    className={`group relative rounded-xl border border-white/10 bg-slate-900/70 backdrop-blur-md p-4 ring-2 ring-offset-0 ${s.ring} transition hover:border-white/20`}
                  >
                    <div
                      className={`absolute top-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r opacity-90 ${s.bar}`}
                    />
                    <div className="flex items-start justify-between gap-3 pt-2">
                      <div>
                        <p className="font-mono text-sm font-semibold text-white tracking-wide">{k.kioskId}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{k.address || k.wifiSsid}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`inline-flex h-2.5 w-2.5 rounded-full ${s.dot} ${livePulse ? 'animate-pulse' : ''}`}
                          aria-hidden
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${s.badge} px-2 py-0.5 rounded-md border`}>
                          {k.tier.label}
                        </span>
                      </div>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-black/25 px-2.5 py-2 border border-white/5">
                        <dt className="text-slate-500">Heartbeat</dt>
                        <dd className="text-slate-200 font-medium mt-0.5">
                          {k.relativeHb ?? '—'}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-black/25 px-2.5 py-2 border border-white/5">
                        <dt className="text-slate-500">Last sync</dt>
                        <dd className="text-slate-200 font-medium mt-0.5">
                          {k.relativeSync ?? '—'}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-black/25 px-2.5 py-2 border border-white/5 col-span-2">
                        <dt className="text-slate-500">Firmware · DB status</dt>
                        <dd className="text-slate-200 font-medium mt-0.5">
                          <span className="font-mono">{k.firmwareVersion || '—'}</span>
                          <span className="text-slate-500 mx-2">·</span>
                          <span className="capitalize">{k.status}</span>
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
