import { Lightbulb, Target } from "lucide-react";
import { getGame } from "@/game/session";
import { fmtMoney } from "@/game/sim/game";
import { QUESTS } from "@/game/data/quests";
import { useUI } from "../store";

export function QuestCard() {
  useUI((s) => s.hudTick);
  const game = getGame();
  const q = game.quest;
  const { value, target } = game.questProgress();
  const pct = Math.min(1, value / Math.max(1, target));
  const idx = game.state.questIndex;
  const isMoney = q.goal.type === "sales";
  return (
    <div className="glass quest">
      <div className="eyebrow">
        <Target size={13} /> Missão {idx < QUESTS.length ? `${idx + 1} de ${QUESTS.length}` : "infinita"}
      </div>
      <div className="quest-title">{q.title}</div>
      <div className="quest-desc">{q.description}</div>
      <div className="progress">
        <div key={q.id} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="quest-foot">
        <span className="num">
          {isMoney ? `$${fmtMoney(Math.min(value, target))}` : Math.min(value, target).toLocaleString("pt-BR")} /{" "}
          {isMoney ? `$${fmtMoney(target)}` : target.toLocaleString("pt-BR")}
        </span>
        <span className="reward num">+${fmtMoney(q.reward.money)}</span>
      </div>
      <div className="quest-hint">
        <Lightbulb size={14} style={{ flex: "none", marginTop: 1, color: "#facc15" }} />
        <span>{q.hint}</span>
      </div>
    </div>
  );
}
