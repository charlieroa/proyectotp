// Drawer de IA agéntica del mockup, cableado al endpoint real /ai-admin-chat.
import React, { useState, useRef, useEffect } from "react";
import { api } from "../../../services/api";
import { T, R, FONT } from "../theme";

interface Msg { role: "user" | "assistant"; text: string }

const CHIPS = [
  "¿Cuánto vendí hoy?",
  "Agenda una cita",
  "Ventas de la semana",
  "Crear un servicio",
];

const AIDrawer: React.FC<{ open: boolean; onClose: () => void; userName: string }> = ({ open, onClose, userName }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const { data } = await api.post("/ai-admin-chat", { message: q });
      const reply = data?.reply || data?.message || data?.response || data?.text || "Listo.";
      setMsgs((m) => [...m, { role: "assistant", text: String(reply) }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", text: "No pude procesar eso ahora. Intenta de nuevo." }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  const firstName = (userName || "").split(" ")[0] || "";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,22,26,.4)", zIndex: 80, display: "flex", justifyContent: "flex-end", fontFamily: FONT }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 430, maxWidth: "92vw", height: "100vh", background: T.surface, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,.12)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "18px 20px", borderBottom: `1px solid ${T.border2}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#6d5ce7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z" /></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Asistente Tupelukeria</div>
            <div style={{ fontSize: 11.5, color: T.green, fontWeight: 600 }}>● Agéntico · puede hacer acciones por ti</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border}`, background: T.surface, cursor: "pointer", fontSize: 16, color: T.muted }}>✕</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: 20 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 10px 14px" }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg,#6d5ce7,#a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z" /></svg>
              </div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Hola {firstName} 👋</div>
              <div style={{ fontSize: 13.5, color: T.muted, marginTop: 6, lineHeight: 1.5 }}>
                Pídeme cosas en lenguaje normal: agendar, cobrar, consultar ventas o crear un servicio. Yo lo hago.
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
              <div
                style={{
                  maxWidth: 300,
                  padding: "10px 13px",
                  borderRadius: 13,
                  fontSize: 13.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  background: m.role === "user" ? T.ink : T.bg,
                  color: m.role === "user" ? T.onInk : T.text,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && <div style={{ fontSize: 13, color: T.muted, padding: "0 4px" }}>Pensando…</div>}
        </div>

        <div style={{ padding: "14px 18px 18px", borderTop: `1px solid ${T.border2}` }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
            {CHIPS.map((c) => (
              <button key={c} onClick={() => send(c)} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, padding: "7px 12px", fontWeight: 600, fontSize: 12, fontFamily: FONT, cursor: "pointer", color: T.text }}>
                {c}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1px solid ${T.border}`, borderRadius: R.lg, padding: "8px 8px 8px 14px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Escribe lo que necesitas…"
              style={{ flex: 1, border: 0, outline: "none", fontSize: 13.5, fontFamily: FONT, background: "transparent", color: T.text }}
            />
            <button onClick={() => send(input)} disabled={busy} style={{ width: 36, height: 36, borderRadius: 10, border: 0, background: T.ink, color: T.onInk, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDrawer;
