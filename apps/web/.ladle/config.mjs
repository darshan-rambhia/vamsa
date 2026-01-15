/** @type {import('@ladle/react').UserConfig} */
export default {
  base: "/vamsa/components/",
  outDir: "../../docs/site/components",
  storyOrder: () => ["charts*", "ui*", "*"],
  viteConfig: "./.ladle/vite.config.ts",
};
