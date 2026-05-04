import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { defineConfig } from "vite";

const execFileAsync = promisify(execFile);

async function queryLocalGpuMetrics() {
  const args = [
    "--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu",
    "--format=csv,noheader,nounits",
  ];

  const { stdout } = await execFileAsync("nvidia-smi", args);
  const firstLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    throw new Error("No GPU metrics returned by nvidia-smi");
  }

  const [name, memoryUsed, memoryTotal, utilizationGpu, temperatureGpu] = firstLine
    .split(",")
    .map((part) => part.trim());

  return {
    ok: true,
    name,
    memoryUsedMB: Number(memoryUsed),
    memoryTotalMB: Number(memoryTotal),
    utilizationGPU: Number(utilizationGpu),
    temperatureC: Number(temperatureGpu),
    timestamp: new Date().toISOString(),
  };
}

function gpuMetricsMiddleware() {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/local-gpu")) {
      next();
      return;
    }

    try {
      const payload = await queryLocalGpuMetrics();
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          ok: false,
          message: error instanceof Error ? error.message : "Failed to query local GPU metrics",
        }),
      );
    }
  };
}

export default defineConfig({
  plugins: [
    {
      name: "focusgs-local-gpu-api",
      configureServer(server) {
        server.middlewares.use(gpuMetricsMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(gpuMetricsMiddleware());
      },
    },
  ],
});
