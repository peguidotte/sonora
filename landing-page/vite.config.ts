import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        docs: "api-docs.html",
        architecture: "arquitetura.html",
      },
    },
  },
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
});
