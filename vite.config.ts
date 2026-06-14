import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Google Drive (G:) faz o watcher do Vite crashar (EINVAL) ao observar a pasta public.
    // Ignorar public/ evita o crash quando os ícones/splashes mudam.
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ["**/public/**", "**/.git/**", "**/node_modules/**"],
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
