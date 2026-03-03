import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/chat": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/chats": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/quiz": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/debate": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/debates": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/exams": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/exam": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/flashcards": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/tasks": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/planner": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/podcast": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/smartnotes": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/transcriber": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
      "/health": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
