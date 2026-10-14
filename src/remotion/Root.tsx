import { Composition, Folder } from "remotion";
import { Celebration } from "./compositions/Celebration";
import { LogoReveal } from "./compositions/LogoReveal";
import { TitleBackground } from "./compositions/TitleBackground";
import { Trailer } from "./compositions/Trailer";
import { TUTORIAL_FRAMES, Tutorial } from "./tutorial/Tutorial";

/**
 * Composições do Remotion usadas pelo jogo:
 * - TitleBackground / LogoReveal: tela de título (via <Player>)
 * - Celebration: banners comemorativos durante a partida (via <Player>)
 * - Trailer: vídeo promocional renderizável (npm run render:trailer)
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Jogo">
        <Composition id="TitleBackground" component={TitleBackground} durationInFrames={720} fps={30} width={1920} height={1080} />
        <Composition
          id="LogoReveal"
          component={LogoReveal}
          durationInFrames={90}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ tagline: "Um simulador de indústria planetária", align: "left" as const }}
        />
        <Composition
          id="Celebration"
          component={Celebration}
          durationInFrames={96}
          fps={30}
          width={1280}
          height={480}
          defaultProps={{
            kind: "tech" as const,
            title: "Automação",
            subtitle: "Desbloqueado: Montadora · Engrenagem · Fio de Cobre",
            color: "#a78bfa",
          }}
        />
      </Folder>
      <Folder name="Marketing">
        <Composition id="Trailer" component={Trailer} durationInFrames={690} fps={30} width={1920} height={1080} />
        <Composition id="Tutorial" component={Tutorial} durationInFrames={TUTORIAL_FRAMES} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
