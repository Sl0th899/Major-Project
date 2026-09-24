import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend's default CORS list allows http://localhost:5173 (not 127.0.0.1),
// so the dev server is pinned to that host and port.
export default defineConfig({
  plugins: [react()],
  server: { host: "localhost", port: 5173, strictPort: true },
  preview: { host: "localhost", port: 5173, strictPort: true },
});
