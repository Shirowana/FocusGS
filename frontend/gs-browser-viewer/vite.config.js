import { defineConfig } from "vite";

import { createLocalApiMiddleware } from "../../backend/local-api/index.js";

export default defineConfig({
  plugins: [
    {
      name: "focusgs-local-api",
      configureServer(server) {
        server.middlewares.use(createLocalApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(createLocalApiMiddleware());
      },
    },
  ],
});
