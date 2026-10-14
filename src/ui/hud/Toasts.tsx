import { useEffect } from "react";
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { useUI, type Toast } from "../store";

const ICON = {
  info: { icon: Info, color: "#60a5fa" },
  success: { icon: CircleCheck, color: "#4ade80" },
  warning: { icon: TriangleAlert, color: "#facc15" },
  error: { icon: OctagonAlert, color: "#f87171" },
};

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useUI((s) => s.dismissToast);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.kind === "error" ? 2600 : 3800);
    return () => clearTimeout(id);
  }, [t, dismiss]);
  const { icon: Icon, color } = ICON[t.kind];
  return (
    <div className="glass toast" onClick={() => dismiss(t.id)}>
      <Icon size={18} color={color} style={{ flex: "none", marginTop: 1 }} />
      <div>
        <b>{t.title}</b>
        {t.body && <span>{t.body}</span>}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
