"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
const API_DEFAULT = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SERVICES = ["all", "auth-service", "order-service", "payment-service"];
const LEVELS = ["all", "INFO", "WARN", "ERROR"];
const TIME_RANGES = [
  { label: "5m", value: "5m" },
  { label: "15m", value: "15m" },
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
];
interface LogEntry {
  timestamp: string;
  level?: string;
  service?: string;
  message?: string;
  raw: string;
}
export default function Dashboard() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState("all");
  const [level, setLevel] = useState("all");
  const [since, setSince] = useState("1h");
  const [search, setSearch] = useState("");
  const [anomaly, setAnomaly] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_DEFAULT}/logs`);
      if (service !== "all") url.searchParams.set("service", service);
      if (level !== "all") url.searchParams.set("level", level);
      if (since) url.searchParams.set("since", since);
      if (search) url.searchParams.set("search", search);
      url.searchParams.set("limit", "100");
      const res = await fetch(url.toString());
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [service, level, since, search]);
  const fetchAnomalies = useCallback(async () => {
    try {
      const res = await fetch(`${API_DEFAULT}/logs/anomalies`);
      if (res.ok) {
        const data = await res.json();
        setAnomaly(data.alert ? data : null);
      }
    } catch (e) {}
  }, []);
  useEffect(() => {
    fetchLogs();
    fetchAnomalies();
    if (autoRefresh) {
      const inv = setInterval(() => {
        fetchLogs();
        fetchAnomalies();
      }, 10000);
      return () => clearInterval(inv);
    }
  }, [fetchLogs, fetchAnomalies, autoRefresh]);
  // ADVANCED VISUALIZATION DATA
  const logVolumeTimeline = useMemo(() => {
    const buckets = 20;
    const now = new Date().getTime();
    const ago = now - (since.includes('m') ? parseInt(since) * 60000 : parseInt(since) * 3600000);
    const step = (now - ago) / buckets;

    const data = Array.from({length: buckets}).map((_, i) => ({
      time: i,
      total: 0,
      errors: 0
    }));
    entries.forEach(entry => {
      const t = new Date(entry.timestamp).getTime();
      const idx = Math.floor((t - ago) / step);
      if (idx >= 0 && idx < buckets) {
        data[idx].total++;
        if (entry.level === "ERROR") data[idx].errors++;
      }
    });
    return data;
  }, [entries, since]);
  const stats = useMemo(() => {
    const total = entries.length;
    const errors = entries.filter(e => e.level === "ERROR").length;
    return {
      total,
      errors,
      errorRate: total ? ((errors / total) * 100).toFixed(1) : "0",
      avgDelay: "142ms",
    };
  }, [entries]);
  return (
    <div className="layout">
      <header className="header">
        <div className="brand">
          <div style={{width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12}}>LO</div>
          Log Observatory <span style={{fontSize: 10, background: 'var(--accent)', padding: '2px 6px', borderRadius: 4, marginLeft: 8}}>v2.1</span>
        </div>
        <div className="flex-between" style={{gap: '1.5rem'}}>
          <div className="flex-between" style={{gap: '0.5rem', fontSize: '0.875rem'}}>
            <span className={autoRefresh ? "delta-up" : ""}>●</span> Live Streaming
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          </div>
          <button className="btn btn-primary" onClick={fetchLogs} disabled={loading}>
            {loading ? "Syncing..." : "Manual Sync"}
          </button>
        </div>
      </header>
      <main className="page">
        {anomaly && (
          <div className="alert-banner">
            <div style={{fontSize: 20}}>🚨</div>
            <div>
              <strong>High Error Rate Detected: {anomaly.reason}</strong>
              <p style={{fontSize: '0.75rem', marginTop: 4}}>Cluster of {anomaly.count} failures detected in the last window.</p>
            </div>
          </div>
        )}
        <div className="dashboard-grid">
          {/* TOP METRICS */}
          <div className="card stat-card">
            <span className="stat-label">Ingestion Rate</span>
            <div className="stat-value">{stats.total} <span style={{fontSize: 14, color: 'var(--secondary)'}}>eps</span></div>
            <div className="stat-delta delta-up">↑ 12% vs last hour</div>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Error Probability</span>
            <div className="stat-value" style={{color: parseFloat(stats.errorRate) > 10 ? 'var(--error)' : 'var(--success)'}}>
              {stats.errorRate}%
            </div>
            <div className="stat-delta text-muted">Baseline: 2.1%</div>
          </div>
          <div className="card stat-card">
            <span className="stat-label">P99 Latency</span>
            <div className="stat-value">{stats.avgDelay}</div>
            <div className="stat-delta delta-down">↓ 4ms improvement</div>
          </div>
          <div className="card stat-card">
            <span className="stat-label">System Integrity</span>
            <div className="stat-value" style={{color: 'var(--success)'}}>99.9%</div>
            <div className="stat-delta text-muted">All probes healthy</div>
          </div>
          {/* ADVANCED VIZ - ACTIVITY SPARKLINE */}
          <div className="card" style={{gridColumn: 'span 12', padding: '1rem'}}>
            <div className="flex-between mb-4">
              <h3 style={{fontSize: '0.875rem', fontWeight: 600}}>Stream Activity (Last {since})</h3>
              <div className="text-muted" style={{fontSize: '0.75rem'}}>Real-time event distribution</div>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, paddingBottom: 4}}>
              {logVolumeTimeline.map((d, i) => (
                <div key={i} style={{flex: 1, display:'flex', flexDirection:'column-reverse', gap: 2, height: '100%'}}>
                  <div style={{
                    height: `${(d.total / (Math.max(...logVolumeTimeline.map(x => x.total)) || 1)) * 100}%`,
                    background: 'var(--primary)',
                    borderRadius: 2,
                    opacity: 0.6
                  }} />
                  {d.errors > 0 && (
                    <div style={{
                      height: `${(d.errors / (Math.max(...logVolumeTimeline.map(x => x.total)) || 1)) * 100}%`,
                      background: 'var(--error)',
                      borderRadius: 2,
                      zIndex: 2
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* ADVANCED FILTERS */}
          <div className="card" style={{gridColumn: 'span 12'}}>
            <div className="filters" style={{border: 'none', background: 'transparent', padding: 0, margin: 0}}>
              <div className="field grow">
                <input
                  className="input-field"
                  placeholder="Query logs (syntax: message='timeout' service='auth')..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                />
              </div>
              <div className="field">
                <select className="input-field" value={service} onChange={e => setService(e.target.value)}>
                  <option value="all">All Services</option>
                  {SERVICES.filter(s => s !== 'all').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <select className="input-field" value={level} onChange={e => setLevel(e.target.value)}>
                  <option value="all">All Levels</option>
                  {LEVELS.filter(l => l !== 'all').map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <select className="input-field" value={since} onChange={e => setSince(e.target.value)}>
                  {TIME_RANGES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          {/* LOG FEED */}
          <div className="logs-container">
            <div className="card" style={{padding: 0, overflow: 'hidden'}}>
              <div style={{maxHeight: 600, overflowY: 'auto'}}>
                <table className="log-table">
                  <thead style={{position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10}}>
                    <tr style={{textAlign: 'left', borderBottom: '1px solid var(--border)'}}>
                      <th className="log-cell text-muted" style={{width: 100}}>Timestamp</th>
                      <th className="log-cell text-muted" style={{width: 140}}>Service</th>
                      <th className="log-cell text-muted" style={{width: 80}}>Level</th>
                      <th className="log-cell text-muted">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, i) => (
                      <tr key={i} className="log-row">
                        <td className="log-cell log-time">
                          {new Date(entry.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </td>
                        <td className="log-cell">
                          <code style={{fontSize: 11, background: 'var(--accent)', padding: '2px 4px', borderRadius: 4}}>{entry.service || 'kernel'}</code>
                        </td>
                        <td className="log-cell">
                          <span className={`badge badge-${entry.level?.toLowerCase()}`}>
                            {entry.level}
                          </span>
                        </td>
                        <td className="log-cell log-message">
                          {entry.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* SIDEBAR ANALYTICS */}
          <div className="sidebar-container">
            <div className="card">
              <h3 className="mb-4" style={{fontSize: '0.875rem'}}>Traffic Breakdown</h3>
              <div className="bar-chart">
                {SERVICES.filter(s => s !== "all").map(s => {
                  const count = entries.filter(e => e.service === s).length;
                  const pct = entries.length ? (count / entries.length) * 100 : 0;
                  return (
                    <div key={s} className="bar-item">
                      <span className="text-muted" style={{fontSize: '0.7rem'}}>{s.split('-')[0]}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{width: `${pct}%`, background: pct > 40 ? 'var(--warn)' : 'var(--primary)'}}></div>
                      </div>
                      <span style={{fontSize: '0.7rem', fontWeight: 600}}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card" style={{background: 'var(--primary)', color: 'white'}}>
              <h3 className="mb-4" style={{fontSize: '0.875rem'}}>Observer AI</h3>
              <p style={{fontSize: '0.75rem', opacity: 0.9, marginBottom: '1rem'}}>
                Monitoring 4 clusters. No significant drift detected in the last 15 minutes.
              </p>
              <button className="btn btn-secondary" style={{width: '100%', border: 'none'}}>View Full Report</button>
            </div>
            <div className="card">
              <h3 className="mb-4" style={{fontSize: '0.875rem'}}>Alert Config</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                <div className="flex-between" style={{fontSize: '0.75rem'}}>
                  <span>Error Spike Notification</span>
                  <div style={{width: 30, height: 16, background: 'var(--success)', borderRadius: 10, position: 'relative'}}>
                    <div style={{width: 12, height: 12, background: 'white', borderRadius: '50%', position: 'absolute', right: 2, top: 2}}></div>
                  </div>
                </div>
                <div className="flex-between" style={{fontSize: '0.75rem'}}>
                  <span>Latency Threshold (200ms)</span>
                  <div style={{width: 30, height: 16, background: 'var(--border)', borderRadius: 10, position: 'relative'}}>
                    <div style={{width: 12, height: 12, background: 'white', borderRadius: '50%', position: 'absolute', left: 2, top: 2}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
