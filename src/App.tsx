import { useState } from "react";
import { continueGame, getGame, hasGame, startNewGame } from "@/game/session";
import { GameScreen } from "@/ui/screens/GameScreen";
import { TitleScreen } from "@/ui/screens/TitleScreen";
import { useUI } from "@/ui/store";

export function App() {
  const screen = useUI((s) => s.screen);
  const setScreen = useUI((s) => s.setScreen);
  const [session, setSession] = useState(0);

  if (screen === "game" && hasGame()) {
    return (
      <GameScreen
        key={session}
        onQuit={() => {
          getGame().save();
          useUI.setState({ panel: null, selected: null, tool: { kind: "none" }, category: null, celebrations: [], toasts: [] });
          setScreen("title");
        }}
      />
    );
  }
  return (
    <TitleScreen
      onStart={(fresh) => {
        if (fresh) startNewGame();
        else continueGame();
        setSession((s) => s + 1);
        setScreen("game");
        if (fresh) {
          useUI.getState().toast({
            title: "Bem-vindo a Verdália!",
            body: "Siga as missões no canto esquerdo. Use WASD para andar e E para coletar.",
            kind: "success",
          });
        }
      }}
    />
  );
}
