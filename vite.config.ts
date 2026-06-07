import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base must match the GitHub Pages subpath: etm-code.github.io/refract/
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/refract/" : "/",
  plugins: [react()],
  server: { port: 5179 },
}));
