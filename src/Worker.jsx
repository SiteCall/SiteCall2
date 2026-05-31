import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabase";

const floors = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export default function Worker() {
  const { floor } = useParams();
  const preSelected = floor ? parseInt(floor) : null;
  const [selectedFloor, setSelectedFloor] = useState(preSelected);
  const [status, setStatus] = useState("idle");
  const [callId, setCallId] = useState(null);

  useEffect(() => {
    if (!callId) return;
    const subscription = supabase
      .channel("call-status-" + callId)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "calls",
        filter: "id=eq." + callId,
      }, (payload) => {
        if (payload.new.status === "onway") setStatus("onway");
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [callId]);

  async function handleCall() {
    if (!selectedFloor) return;
    setStatus("sending");
    const { data, error } = await supabase
      .from("calls")
      .insert([{ floor: selectedFloor, status: "pending" }])
      .select();
    if (error) { console.error(error); setStatus("idle"); }
    else { setCallId(data[0].id); setStatus("received"); }
  }

  async function handleCancel() {
    if (callId) await supabase.from("calls").update({ status: "cancelled" }).eq("id", callId);
    setStatus("idle");
    setSelectedFloor(preSelected);
    setCallId(null);
  }

  if (status === "sending") {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <div><span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span></div>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        <div style={styles.centerContent}>
          <div style={styles.spinner} />
          <p style={styles.statusTitle}>Sending call...</p>
          <p style={styles.statusSub}>Floor {selectedFloor}</p>
        </div>
      </div>
    );
  }

  if (status === "onway") {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <div><span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span></div>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        <div style={styles.centerContent}>
          <div style={styles.pulseWrap}>
            <div style={{ ...styles.band, ...styles.band4 }}></div>
            <div style={{ ...styles.band, ...styles.band3 }}></div>
            <div style={{ ...styles.band, ...styles.band2 }}></div>
            <div style={{ ...styles.band, ...styles.band1 }}></div>
            <div style={styles.centerCircle}>
              <span style={{ fontSize: 40 }}>🏗️</span>
            </div>
          </div>
          <p style={styles.onwayTitle}>Pickup Confirmed</p>
          <p style={styles.floorSub}>Floor {selectedFloor}</p>
          <button style={styles.doneBtn} onClick={() => { setStatus("idle"); setSelectedFloor(preSelected); setCallId(null); }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  if (status === "received") {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <div><span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span></div>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        <div style={styles.centerContent}>
          <div style={styles.checkCircle}>✓</div>
          <p style={styles.statusTitle}>Operator notified</p>
          <p style={styles.statusSub}>Floor {selectedFloor}</p>
          <div style={styles.waitingDots}>
            <div style={styles.dot} /><div style={styles.dot} /><div style={styles.dot} />
          </div>
          <p style={styles.wrongFloor}>Wrong floor?</p>
          <button style={styles.cancelBtn} onClick={handleCancel}>Cancel & retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div>
          <span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span>
          <p style={styles.siteName}>Tower A · Hoist 1</p>
        </div>
        <span style={styles.liveBadge}>LIVE</span>
      </div>
      <div style={styles.infoStrip}>
        <span style={styles.stripLabel}>AVG WAIT TIME</span>
        <span style={styles.stripVal}>~4 min</span>
      </div>
      <div style={styles.body}>
        <p style={styles.sectionLabel}>SELECT YOUR FLOOR</p>
        <div style={styles.floorGrid}>
          {floors.map((f) => (
            <button
              key={f}
              data-selected={selectedFloor === f ? "true" : "false"}
              style={{
                ...styles.floorBtn,
                ...(selectedFloor === f ? styles.floorBtnSelected : {}),
              }}
              onClick={() => setSelectedFloor(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.divider} />
      <div style={styles.callWrap}>
        <button
          style={{ ...styles.callBtn, opacity: selectedFloor ? 1 : 0.4 }}
          onClick={handleCall}
          disabled={!selectedFloor}
        >
          <span style={styles.callBtnTitle}>CALL HOIST</span>
          <span style={styles.callBtnSub}>
            {selectedFloor ? "Floor " + selectedFloor : "Select a floor first"}
          </span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  screen: { background: "#0d0d0d", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 480, margin: "0 auto" },
  header: { background: "#141414", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e1e" },
  logo: { fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.3px" },
  logoBlue: { color: "#3d8ef0" },
  siteName: { fontSize: 12, color: "#444", marginTop: 3 },
  liveBadge: { fontSize: 11, color: "#4ade80", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 5, padding: "3px 9px", fontWeight: 600, letterSpacing: "0.04em" },
  infoStrip: { background: "#0f0f0f", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #181818" },
  stripLabel: { fontSize: 11, color: "#333", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" },
  stripVal: { fontSize: 11, color: "#3d8ef0", fontWeight: 600 },
  body: { padding: "18px 18px 12px", flex: 1 },
  sectionLabel: { fontSize: 11, color: "#444", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 14, textTransform: "uppercase" },
  floorGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  floorBtn: { background: "#141414", border: "1px solid #1e1e1e", borderRadius: 12, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", cursor: "pointer", position: "relative", overflow: "hidden", transition: "all 0.15s" },
  floorBtnSelected: { border: "3px solid #2563eb", transform: "scale(1.08)", fontSize: 28, boxShadow: "0 0 0 2px rgba(37,99,235,0.15)", zIndex: 1 },
  divider: { height: 1, background: "#1a1a1a", margin: "10px 18px" },
  callWrap: { padding: "6px 18px 36px" },
  callBtn: { width: "100%", background: "#2563eb", border: "none", borderRadius: 14, padding: "22px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  callBtnTitle: { fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase" },
  callBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  centerContent: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 },
  spinner: { width: 64, height: 64, borderRadius: "50%", border: "3px solid #3d8ef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" },
  statusTitle: { fontSize: 20, fontWeight: 600, color: "#e8e8e8" },
  statusSub: { fontSize: 14, color: "#a0a0a0", fontWeight: 500 },
  checkCircle: { width: 64, height: 64, borderRadius: "50%", background: "#0d2247", border: "2px solid #3d8ef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#3d8ef0" },
  pulseWrap: { position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  band: { position: "absolute", borderRadius: "50%", border: "1.5px solid #22c55e" },
  band1: { width: 100, height: 100, background: "rgba(34,197,94,0.12)", animation: "bandPulse 3s ease 0s infinite" },
  band2: { width: 136, height: 136, background: "rgba(34,197,94,0.06)", animation: "bandPulse 3s ease 0.5s infinite" },
  band3: { width: 170, height: 170, background: "rgba(34,197,94,0.03)", animation: "bandPulse 3s ease 1s infinite" },
  band4: { width: 204, height: 204, background: "transparent", animation: "bandPulse 3s ease 1.5s infinite" },
  centerCircle: { width: 90, height: 90, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2, boxShadow: "0 0 20px rgba(34,197,94,0.2)" },
  onwayTitle: { fontSize: 22, fontWeight: 600, color: "#22c55e" },
  floorSub: { fontSize: 14, color: "#a0a0a0", fontWeight: 500 },
  doneBtn: { marginTop: 10, background: "#0f1a0f", border: "1px solid #1a3a1a", borderRadius: 12, padding: "14px 36px", fontSize: 14, color: "#555", cursor: "pointer" },
  wrongFloor: { fontSize: 13, color: "#444", marginTop: 4 },
  cancelBtn: { background: "transparent", border: "1px solid #222", borderRadius: 12, padding: "14px 32px", fontSize: 14, color: "#666", cursor: "pointer" },
  waitingDots: { display: "flex", gap: 8, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#333" },
};