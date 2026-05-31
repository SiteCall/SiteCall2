import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function Operator() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    fetchCalls();

    const subscription = supabase
      .channel("realtime:calls")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "calls" }, () => {
        fetchCalls();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  async function fetchCalls() {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (data) setQueue(data);
  }

  async function handleOnMyWay(id) {
    await supabase.from("calls").update({ status: "onway" }).eq("id", id);
    fetchCalls();
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

      <div style={styles.body}>
        <div style={styles.queueHeader}>
          <span style={styles.sectionLabel}>PENDING PICKUPS ({queue.length})</span>
        </div>

        {queue.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No pending calls</p>
            <p style={styles.emptySub}>Waiting for workers to call...</p>
          </div>
        )}

        {queue.map((item, index) => (
          <div key={item.id} style={{ ...styles.card, ...(index === 0 ? styles.cardTop : styles.cardWaiting) }}>
            <div style={{ ...styles.floorTag, ...(index === 0 ? styles.floorTagTop : styles.floorTagWaiting) }}>
              <span style={{ ...styles.floorNum, ...(index === 0 ? styles.floorNumTop : styles.floorNumWaiting) }}>
                {item.floor}
              </span>
            </div>
            <div style={styles.cardInfo}>
              <p style={{ ...styles.cardFloor, ...(index === 0 ? { color: "#e8e8e8" } : { color: "#555" }) }}>
                Floor {item.floor}
              </p>
              <p style={styles.cardTime}>{new Date(item.created_at).toLocaleTimeString()}</p>
            </div>
            {index === 0 && (
              <button style={styles.actionBtnTop} onClick={() => handleOnMyWay(item.id)}>
                On my way
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#3d8ef0" }}>24</span>
          <span style={styles.statLabel}>trips</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#e8e8e8" }}>4.2m</span>
          <span style={styles.statLabel}>avg wait</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statVal, color: "#4caf50" }}>97%</span>
          <span style={styles.statLabel}>on-time</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  screen: { background: "#0f1117", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", maxWidth: 480, margin: "0 auto" },
  header: { background: "#161b22", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #2a2a2a" },
  logo: { fontSize: 15, fontWeight: 600, color: "#fff" },
  logoBlue: { color: "#3d8ef0" },
  meta: { fontSize: 11, color: "#555", marginTop: 2 },
  onlineRow: { display: "flex", alignItems: "center", gap: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%", background: "#4caf50" },
  onlineText: { fontSize: 11, color: "#4caf50" },
  body: { flex: 1, padding: 14 },
  queueHeader: { marginBottom: 10 },
  sectionLabel: { fontSize: 10, color: "#555", letterSpacing: "0.06em" },
  card: { borderRadius: 10, padding: 12, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 },
  cardTop: { background: "#1e2a1e", border: "1px solid #2e4a2e" },
  cardWaiting: { background: "#161616", border: "1px solid #222" },
  floorTag: { width: 42, height: 42, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  floorTagTop: { background: "#3d8ef0" },
  floorTagWaiting: { background: "#252525" },
  floorNum: { fontSize: 20, fontWeight: 700 },
  floorNumTop: { color: "#fff" },
  floorNumWaiting: { color: "#888" },
  cardInfo: { flex: 1 },
  cardFloor: { fontSize: 13, fontWeight: 500 },
  cardTime: { fontSize: 11, color: "#555", marginTop: 2 },
  actionBtnTop: { borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 500, background: "#2a3d2a", border: "1px solid #3a5a3a", color: "#6fbb6f", cursor: "pointer" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48, gap: 8 },
  emptyText: { fontSize: 14, color: "#555", fontWeight: 500 },
  emptySub: { fontSize: 12, color: "#333" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: 14, borderTop: "1px solid #1a1a1a" },
  stat: { background: "#111", borderRadius: 8, padding: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  statVal: { fontSize: 20, fontWeight: 500 },
  statLabel: { fontSize: 10, color: "#444" },
};