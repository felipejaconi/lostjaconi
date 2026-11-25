import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    build: {
      rollupOptions: {
        // use default chunking
      },
    },
    optimizeDeps: {
      entries: ["index.html"],
      holdUntilCrawlEnd: false,
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "axios",
        "clsx",
        "tailwind-merge",
        "decimal.js",
        "lucide-react",
        "sweetalert2",
      ],
    },
    server: {
      hmr: false,
      ws: false,
    },
  };
});
