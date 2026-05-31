import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

export default function Operator() {
  const [queue, setQueue] = useState([]);
  const [cancelled, setCancelled] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const prevQueueLength = useRef(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
    fetchCalls();
    const subscription = supabase
      .channel("realtime:calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, () => { fetchCalls(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls" }, (payload) => {
        if (payload.new.status === "cancelled") showCancelled(payload.new.floor);
        if (payload.new.status === "onway") setActiveTrip({ ...payload.new, confirmed_at: new Date().toISOString() });
        fetchCalls();
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  useEffect(() => {
    if (queue.length > prevQueueLength.current) {
      playAlert();
      sendPushNotification(queue[queue.length - 1]);
    }
    prevQueueLength.current = queue.length;
  }, [queue]);

  function showCancelled(floor) {
    setCancelled(floor);
    setTimeout(() => setCancelled(null), 3000);
  }

  async function requestNotificationPermission() {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === "granted");
    }
  }

  function playAlert() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.15, 0.3].forEach((delay) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, ctx.currentTime + delay);
        gainNode.gain.setValueAtTime(0.4, ctx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + 0.3);
      });
    } catch (e) { console.log("Audio error:", e); }
  }

  function sendPushNotification(call) {
    if (permissionGranted && "Notification" in window) {
      new Notification("SiteCall — New Pickup Request", {
        body: "Floor " + call.floor + " is waiting for the hoist",
        icon: "/favicon.svg",
      });
    }
  }

  async function fetchCalls() {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (data) setQueue(data);
  }

  async function handleOnMyWay(id, floor) {
    await supabase.from("calls").update({ status: "onway" }).eq("id", id);
    setActiveTrip({ id, floor, confirmed_at: new Date().toISOString() });
    fetchCalls();
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 60) setActiveTrip(null);
    touchStartX.current = null;
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div>
          <span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span>
          <p style={styles.meta}>Tower A · Hoist 1 · Mike R.</p>
        </div>
        <div style={styles.onlineRow}>
          <div style={styles.onlineDot} />
          <span style={styles.onlineText}>Online</span>
        </div>
      </div>

      <div style={styles.infoStrip}>
        <span style={styles.stripLabel}>PENDING PICKUPS</span>
        <span style={styles.stripVal}>{queue.length} waiting</span>
      </div>

      {!permissionGranted && (
        <div style={styles.permissionBanner}>
          <span style={styles.permissionText}>⚠️ Enable notifications for call alerts</span>
          <button style={styles.permissionBtn} onClick={requestNotificationPermission}>Enable</button>
        </div>
      )}

      {cancelled !== null && (
        <div style={styles.cancelledBanner}>
          <span style={styles.cancelledIcon}>✕</span>
          <span style={styles.cancelledText}>Floor {cancelled} — worker cancelled the request</span>
        </div>
      )}

      <div style={styles.body}>
        <p style={styles.sectionLabel}>QUEUE</p>

        {queue.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No pending calls</p>
            <p style={styles.emptySub}>Waiting for workers to call...</p>
          </div>
        )}

        {queue.map((item, index) => (
          <div key={item.id} style={{ ...styles.card, ...(index === 0 ? styles.cardTop : styles.cardWaiting) }}>
            <div style={{ ...styles.floorTag, ...(index === 0 ? styles.floorTagActive : styles.floorTagWaiting) }}>
              <span style={{ ...styles.floorNum, ...(index === 0 ? styles.floorNumActive : styles.floorNumWaiting) }}>
                {item.floor}
              </span>
            </div>
            <div style={styles.cardInfo}>
              <p style={{ ...styles.cardFloor, ...(index === 0 ? { color: "#ccc" } : { color: "#2a2a2a" }) }}>
                Floor {item.floor}
              </p>
              <p style={styles.cardTime}>{new Date(item.created_at).toLocaleTimeString()}</p>
            </div>
            {index === 0 && (
              <button style={styles.onwayBtn} onClick={() => handleOnMyWay(item.id, item.floor)}>
                ON MY WAY
              </button>
            )}
            {index !== 0 && <div style={styles.queueBtn}>QUEUE</div>}
          </div>
        ))}
      </div>

      {activeTrip && (
        <div style={styles.activeTripWrap}>
          <p style={styles.sectionLabel}>TRIPS</p>
          <div
            style={styles.tripCard}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div style={styles.tripFloorTag}>
              <span style={styles.tripNum}>{activeTrip.floor}</span>
            </div>
            <div style={styles.tripInfo}>
              <p style={styles.tripFloor}>Floor {activeTrip.floor}</p>
              <p style={styles.tripSub}>En route · {new Date(activeTrip.confirmed_at).toLocaleTimeString()}</p>
            </div>
            <div style={styles.tripBadge}>Confirmed</div>
          </div>
          <p style={styles.swipeHint}>← SWIPE TO DISMISS</p>
        </div>
      )}

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#3d8ef0" }}>24</span>
          <span style={styles.statLabel}>TRIPS</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#ccc" }}>4.2m</span>
          <span style={styles.statLabel}>AVG WAIT</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#4ade80" }}>97%</span>
          <span style={styles.statLabel}>ON-TIME</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: { background: "#0d0d0d", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 480, margin: "0 auto" },
  header: { background: "#141414", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e" },
  logo: { fontSize: 15, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" },
  logoBlue: { color: "#3d8ef0" },
  meta: { fontSize: 9, color: "#444", marginTop: 2 },
  onlineRow: { display: "flex", alignItems: "center", gap: 5 },
  onlineDot: { width: 5, height: 5, borderRadius: "50%", background: "#4ade80" },
  onlineText: { fontSize: 9, color: "#4ade80", fontWeight: 600 },
  infoStrip: { background: "#0f0f0f", padding: "7px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #181818" },
  stripLabel: { fontSize: 9, color: "#333", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" },
  stripVal: { fontSize: 9, color: "#3d8ef0", fontWeight: 600 },
  permissionBanner: { background: "#1a1500", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  permissionText: { fontSize: 12, color: "#aaa800" },
  permissionBtn: { background: "#3a3000", border: "1px solid #5a5000", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "#ffeb3b", cursor: "pointer" },
  cancelledBanner: { background: "#1a0a0a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, animation: "fadeIn 0.3s ease" },
  cancelledIcon: { width: 24, height: 24, borderRadius: "50%", background: "#3a1a1a", border: "1px solid #f87171", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#f87171", flexShrink: 0, textAlign: "center", lineHeight: "24px" },
  cancelledText: { fontSize: 12, color: "#f87171", fontWeight: 500 },
  body: { flex: 1, padding: "12px 14px" },
  sectionLabel: { fontSize: 9, color: "#444", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 8, textTransform: "uppercase" },
  card: { borderRadius: 10, padding: 12, marginBottom: 7, display: "flex", alignItems: "center", gap: 12 },
  cardTop: { background: "#0a1218", border: "1px solid #1e1e1e", borderLeft: "2px solid #2563eb" },
  cardWaiting: { background: "#141414", border: "1px solid #1e1e1e" },
  floorTag: { width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  floorTagActive: { background: "#2563eb" },
  floorTagWaiting: { background: "#1a1a1a", border: "1px solid #1e1e1e" },
  floorNum: { fontSize: 17, fontWeight: 700 },
  floorNumActive: { color: "#fff" },
  floorNumWaiting: { color: "#2a2a2a" },
  cardInfo: { flex: 1 },
  cardFloor: { fontSize: 12, fontWeight: 600 },
  cardTime: { fontSize: 9, color: "#333", marginTop: 2 },
  onwayBtn: { background: "#0d1a0d", border: "1px solid #1e4a1e", borderRadius: 7, padding: "6px 11px", fontSize: 10, color: "#4ade80", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.03em", textTransform: "uppercase" },
  queueBtn: { background: "#141414", border: "1px solid #1e1e1e", borderRadius: 7, padding: "6px 11px", fontSize: 10, color: "#2a2a2a", textTransform: "uppercase", letterSpacing: "0.03em" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 8 },
  emptyText: { fontSize: 14, color: "#444", fontWeight: 500 },
  emptySub: { fontSize: 12, color: "#2a2a2a" },
  activeTripWrap: { padding: "10px 14px 4px", borderTop: "1px solid #1a1a1a" },
  tripCard: { background: "#141414", border: "1px solid #252525", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  tripFloorTag: { width: 38, height: 38, borderRadius: 8, background: "#1e1e1e", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tripNum: { fontSize: 17, fontWeight: 700, color: "#666" },
  tripInfo: { flex: 1 },
  tripFloor: { fontSize: 12, fontWeight: 600, color: "#555" },
  tripSub: { fontSize: 9, color: "#333", marginTop: 2, letterSpacing: "0.03em", textTransform: "uppercase" },
  tripBadge: { background: "#1a1a1a", border: "1px solid #252525", borderRadius: 7, padding: "6px 11px", fontSize: 10, color: "#444", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap" },
  swipeHint: { fontSize: 8, color: "#252525", textAlign: "center", letterSpacing: "0.05em", marginBottom: 8 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, padding: "10px 14px 14px", borderTop: "1px solid #1a1a1a" },
  stat: { background: "#141414", border: "1px solid #1a1a1a", borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  statVal: { fontSize: 17, fontWeight: 700 },
  statLabel: { fontSize: 8, color: "#333", letterSpacing: "0.06em", fontWeight: 600 },
};