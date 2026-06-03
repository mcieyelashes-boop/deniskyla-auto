export default function InstallBanner({ onInstall, onDismiss, swReady }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #F0C04018, #F0C04008)",
      border: "1px solid #F0C04033",
      borderRadius: 12,
      padding: "10px 16px",
      marginBottom: 16,
      display: "flex",
      alignItems: "center",
      gap: 12,
      animation: "fadeSlideIn 0.3s ease",
    }}>
      <span style={{ fontSize: 20 }}>📱</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13 }}>
          Install AgenticOS
        </div>
        <div style={{ color: "#ffffff66", fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
          Add to homescreen for offline access {swReady ? "· ✓ Offline ready" : ""}
        </div>
      </div>
      <button onClick={onInstall} style={{
        background: "linear-gradient(135deg, #F0C040, #F59E0B)",
        border: "none", borderRadius: 8, padding: "6px 14px",
        color: "#000", fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: 12, cursor: "pointer",
      }}>
        INSTALL
      </button>
      <button onClick={onDismiss} style={{
        background: "transparent", border: "none",
        color: "#ffffff44", cursor: "pointer", fontSize: 16,
      }}>✕</button>
    </div>
  );
}
