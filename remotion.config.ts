import path from "node:path";
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Recursos do tutorial ficam fora de public/ para não inflar o site do Netlify.
Config.setPublicDir("remotion-assets");
// WebGL (Three.js) precisa de um backend de GPU no Chrome headless.
Config.setChromiumOpenGlRenderer("angle");
// Mesmo alias "@/..." usado pelo Vite.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@": path.join(process.cwd(), "src"),
    },
  },
}));
