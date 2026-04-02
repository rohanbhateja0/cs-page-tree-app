import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use "/" for Vercel and other hosts at the domain root so asset URLs stay correct when the
// Full Page path is not "/" (e.g. Contentstack loads /page-tree → scripts must be /assets/...).
export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    port: 5173,
    strictPort: true,
    // Allow embedding in Contentstack iframe and tunnel hosts (ngrok, etc.)
    allowedHosts: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
