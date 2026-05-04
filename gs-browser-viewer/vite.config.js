import { defineConfig } from "vite";

import { createLocalApiMiddleware } from "./server/localApi.js";

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
