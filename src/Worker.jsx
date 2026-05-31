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
        if (payload.new.status === "onway") {
          setStatus("onway");
        }
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
    if (error) {
      console.error(error);
      setStatus("idle");
    } else {
      setCallId(data[0].id);
      setStatus("received");
    }
  }

  async function handleCancel() {
    if (callId) {
      await supabase.from("calls").update({ status: "cancelled" }).eq("id", callId);
    }
    setStatus("idle");
    setSelectedFloor(preSelected);
    setCallId(null);
  }

  if (status === "sending") {
    return (
      <div style={styles.screen}>
        <div style={styles.header}>
          <span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span>
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
          <span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        <div style={styles.centerContent}>
          <div style={styles.pulseRing}>
            <span style={{ fontSize: 36 }}>🏗️</span>
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
          <span style={styles.logo}>Site<span style={styles.logoBlue}>Call</span></span>
          <span style={styles.liveBadge}>LIVE</span>
        </div>
        <div style={styles.centerContent}>
          <div style={styles.checkCircle}>✓</div>
          <p style={styles.statusTitle}>Operator notified</p>
          <p style={styles.statusSub}>Floor {selectedFloor}</p>
          <div style={styles.waitingDots}>
            <div style={styles.dot} />
            <div style={styles.dot} />
            <div style={styles.dot} />
          </div>
          <p style={styles.wrongFloor}>Wrong floor?</p>
          <button style={styles.cancelBtn} onClick={handleCancel}>
            Cancel & retry
          </button>
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
      <div style={styles.body}>
        <p style={styles.sectionLabel}>SELECT FLOOR</p>
        <div style={styles.floorGrid}>
          {floors.map((f) => (
            <button
              key={f}
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
      <div style={styles.callWrap}>
        <button
          style={{ ...styles.callBtn, opacity: selectedFloor ? 1 : 0.4 }}
          onClick={handleCall}
          disabled={!selectedFloor}
        >
          <span style={styles.callBtnTitle}>Call Hoist</span>
          <span style={styles.callBtnSub}>
            {selectedFloor ? "Floor " + selectedFloor : "Select a floor first"}
          </span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  screen: { background: "#0d0d0d", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", maxWidth: 402, margin: "0 auto" },
  header: { background: "#1c2b1c", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #222" },
  logo: { fontSize: 16, fontWeight: 600, color: "#fff" },
  logoBlue: { color: "#3d8ef0" },
  siteName: { fontSize: 10, color: "#555", marginTop: 2 },
  liveBadge: { fontSize: 9, color: "#6fbb6f", background: "#2a3d2a", border: "1px solid #3a5a3a", borderRadius: 5, padding: "3px 8px", fontWeight: 600 },
  body: { padding: "18px 16px 12px", flex: 1 },
  sectionLabel: { fontSize: 10, color: "#888", letterSpacing: "0.06em", marginBottom: 12 },
  floorGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  floorBtn: { background: "#1e1e1e", border: "1px solid #333", borderRadius: 12, padding: "22px 0", fontSize: 26, fontWeight: 500, color: "#aaa", cursor: "pointer" },
  floorBtnSelected: { background: "#0d2247", border: "1.5px solid #3d8ef0", color: "#3d8ef0", boxShadow: "0 0 0 3px rgba(61,142,240,0.15)" },
  callWrap: { padding: "0 16px 32px" },
  callBtn: { width: "100%", background: "#3d8ef0", border: "none", borderRadius: 16, padding: "22px 16px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 },
  callBtnTitle: { fontSize: 20, fontWeight: 600, color: "#fff" },
  callBtnSub: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  centerContent: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  spinner: { width: 52, height: 52, borderRadius: "50%", border: "2.5px solid #3d8ef0", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" },
  statusTitle: { fontSize: 16, fontWeight: 600, color: "#e8e8e8" },
  statusSub: { fontSize: 12, color: "#a0a0a0", fontWeight: 500 },
  checkCircle: { width: 52, height: 52, borderRadius: "50%", background: "#0d2247", border: "2px solid #3d8ef0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#3d8ef0" },
  pulseRing: { width: 100, height: 100, borderRadius: "50%", background: "rgba(34,197,94,0.08)", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulseRing 1.8s ease infinite" },
  onwayTitle: { fontSize: 17, fontWeight: 600, color: "#22c55e" },
  floorSub: { fontSize: 12, color: "#a0a0a0", fontWeight: 500 },
  doneBtn: { marginTop: 8, background: "#0f1a0f", border: "1px solid #1a3a1a", borderRadius: 10, padding: "10px 28px", fontSize: 12, color: "#555", cursor: "pointer" },
  wrongFloor: { fontSize: 11, color: "#444", marginTop: 4 },
  cancelBtn: { background: "transparent", border: "1px solid #333", borderRadius: 10, padding: "10px 24px", fontSize: 12, color: "#888", cursor: "pointer" },
  waitingDots: { display: "flex", gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#333" },
};