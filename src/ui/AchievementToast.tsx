// ---------------------------------------------------------------------------
// Toast dourado que aparece quando uma conquista é desbloqueada.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import type { AchievementToast as AchievementToastType } from "../app/achievements";

export function AchievementToastPopup({
  toasts,
  onDismiss,
}: {
  toasts: AchievementToastType[];
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts, onDismiss]);

  if (toasts.length === 0 || !visible) return null;

  const latest = toasts[toasts.length - 1];

  return (
    <div
      style={{
        position: "fixed",
        top: 60,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 12000,
        background: "linear-gradient(135deg, rgba(212,175,55,0.95), rgba(180,150,40,0.95))",
        color: "#0d0f0d",
        borderRadius: 12,
        padding: "14px 20px",
        textAlign: "center",
        boxShadow: "0 4px 20px rgba(212,175,55,0.4)",
        animation: "slideIn 0.3s ease-out",
        maxWidth: "90vw",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 4 }}>{latest.icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>🏆 {latest.name}</div>
      <div style={{ fontSize: 12, marginTop: 2, opacity: 0.8 }}>Conquista desbloqueada!</div>
    </div>
  );
}
