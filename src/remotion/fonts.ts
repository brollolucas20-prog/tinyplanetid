import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";

export const { fontFamily: DISPLAY } = loadFredoka("normal", { weights: ["500", "600", "700"], subsets: ["latin"] });
export const { fontFamily: BODY } = loadNunito("normal", { weights: ["600", "800"], subsets: ["latin"] });
