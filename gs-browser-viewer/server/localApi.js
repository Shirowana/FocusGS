import { spawn, execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUNTIME_ROOT = path.resolve(PROJECT_ROOT, ".runtime");
const JOBS_ROOT = path.resolve(RUNTIME_ROOT, "jobs");
const MEGS2_ROOT = path.resolve(PROJECT_ROOT, "../MEGS-2");
const MEGS2_TRAIN_SCRIPT = path.resolve(MEGS2_ROOT, "train.py");
const CONDA_SH = process.env.FOCUSGS_CONDA_SH || "/home/shirowana/miniconda3/etc/profile.d/conda.sh";
const LOCAL_DATASET_ROOTS = [
  process.env.FOCUSGS_LOCAL_DATASET_ROOT,
  path.resolve(PROJECT_ROOT, "../extracted/mipnerf360"),
].filter(Boolean);
const LOCAL_VIDEO_ROOTS = [
  process.env.FOCUSGS_LOCAL_VIDEO_ROOT,
  path.resolve(PROJECT_ROOT, "figures"),
].filter(Boolean);
const CONDA_BIN = process.env.FOCUSGS_CONDA_BIN || process.env.CONDA_EXE || "conda";
const CONDA_ENV_NAME = process.env.FOCUSGS_CONDA_ENV || "focus";
const PYTHON_BIN = process.env.FOCUSGS_PYTHON || null;
const MAX_HISTORY_JOBS = 30;

const jobStore = new Map();

async function getLatestPreviewInfo(job) {
  const pointCloudRoot = path.join(job.modelPath, "point_cloud");

  let entries = [];
  try {
    entries = await fs.readdir(pointCloudRoot, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^iteration_(\d+)$/);
    if (!match) continue;

    const iteration = Number(match[1]);
    const filePath = path.join(pointCloudRoot, entry.name, "point_cloud.ply");
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;
      candidates.push({
        iteration,
        filePath,
        updatedAt: stats.mtime.toISOString(),
      });
    } catch {
      // ignore incomplete checkpoints
    }
  }

  if (!candidates.length) return null;
  candidates.sort((left, right) => right.iteration - left.iteration);
  const latest = candidates[0];
  return {
    iteration: latest.iteration,
    updatedAt: latest.updatedAt,
    filePath: latest.filePath,
    url: `/api/train/${job.id}/preview/point-cloud?iteration=${latest.iteration}&ts=${encodeURIComponent(latest.updatedAt)}`,
  };
}

async function getCheckpointInfo(modelPath) {
  let entries = [];
  try {
    entries = await fs.readdir(modelPath, { withFileTypes: true });
  } catch {
    return {
      hasCheckpoint: false,
      latestCheckpointIteration: null,
      latestCheckpointPath: null,
      checkpointIterations: [],
    };
  }

  const checkpoints = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(/^chkpnt(\d+)\.pth$/i);
    if (!match) continue;
    checkpoints.push({
      iteration: Number(match[1]),
      filePath: path.join(modelPath, entry.name),
    });
  }

  checkpoints.sort((left, right) => left.iteration - right.iteration);
  const latest = checkpoints[checkpoints.length - 1] || null;

  return {
    hasCheckpoint: Boolean(latest),
    latestCheckpointIteration: latest?.iteration || null,
    latestCheckpointPath: latest?.filePath || null,
    checkpointIterations: checkpoints.map((item) => item.iteration),
  };
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sanitizePathSegments(relativePath = "") {
  return relativePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..");
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isImageDirName(name = "") {
  return /^images(?:[_-]?\d+)?$/i.test(name);
}

function shouldPreserveTopLevelDir(name = "") {
  const normalized = String(name).toLowerCase();
  return normalized === "sparse" || isImageDirName(normalized);
}

function getUploadCommonRoot(manifest = []) {
  const firstSegments = manifest
    .map((entry) => sanitizePathSegments(entry.relativePath || entry.name || "")[0])
    .filter(Boolean);

  if (!firstSegments.length) {
    return null;
  }

  const uniqueSegments = Array.from(new Set(firstSegments));
  if (uniqueSegments.length !== 1) {
    return null;
  }

  return uniqueSegments[0];
}

function normalizeUploadRelativePath(relativePath = "", commonRoot = null) {
  const segments = sanitizePathSegments(relativePath);
  if (!segments.length) {
    return "";
  }

  if (commonRoot && segments[0] === commonRoot && !shouldPreserveTopLevelDir(commonRoot)) {
    return segments.slice(1).join("/");
  }

  return segments.join("/");
}

function getSceneImpMetric(sceneTags = []) {
  return Array.isArray(sceneTags) && sceneTags.includes("outdoor") ? "outdoor" : "indoor";
}

function normalizeSceneFolderHint(value = "") {
  return String(value)
    .trim()
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .pop()
    ?.toLowerCase() || "";
}

function shouldIgnoreFolderHint(value = "") {
  const normalized = normalizeSceneFolderHint(value);
  return !normalized || normalized === "sparse" || isImageDirName(normalized);
}

function getCandidateHints(payload = {}, manifest = []) {
  const hints = new Set();
  const explicitPath = String(payload.localSourcePath || "").trim();
  const sourceHint = String(payload.sourceHint || "").trim();
  const sceneNameHint = String(payload.sceneName || payload.sceneId || "").trim();

  for (const entry of manifest) {
    const rootSegment = sanitizePathSegments(entry.relativePath || entry.name || "")[0];
    if (rootSegment && !shouldIgnoreFolderHint(rootSegment)) {
      hints.add(rootSegment);
    }
  }

  if (explicitPath) hints.add(explicitPath);
  if (sourceHint && !shouldIgnoreFolderHint(sourceHint)) hints.add(sourceHint);
  if (sceneNameHint && !shouldIgnoreFolderHint(sceneNameHint)) hints.add(sceneNameHint);

  return Array.from(hints);
}

async function resolveLocalColmapSource(payload = {}, manifest = []) {
  const hints = getCandidateHints(payload, manifest);

  const candidates = [];
  for (const hint of hints) {
    if (path.isAbsolute(hint)) {
      candidates.push(path.resolve(hint));
      continue;
    }
    for (const datasetRoot of LOCAL_DATASET_ROOTS) {
      candidates.push(path.join(datasetRoot, normalizeSceneFolderHint(hint)));
    }
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`无法根据当前场景定位本地数据目录。已尝试：${hints.join(" / ") || "无有效线索"}`);
}

function inferResolvedSceneName(targetPath = "", fallback = "") {
  const basename = path.basename(String(targetPath || "").trim());
  const normalized = normalizeSceneFolderHint(basename);
  return normalized || String(fallback || "").trim() || "unnamed-scene";
}

async function resolveLocalImageSource(payload = {}, manifest = []) {
  return resolveLocalColmapSource(payload, manifest);
}

async function resolveLocalVideoSource(payload = {}, manifest = []) {
  const hints = getCandidateHints(payload, manifest);
  const candidates = [];

  for (const hint of hints) {
    if (path.isAbsolute(hint)) {
      candidates.push(path.resolve(hint));
      continue;
    }

    const normalized = normalizeSceneFolderHint(hint);
    for (const videoRoot of LOCAL_VIDEO_ROOTS) {
      candidates.push(path.join(videoRoot, `${normalized}.mp4`));
      candidates.push(path.join(videoRoot, `${normalized}.mov`));
      candidates.push(path.join(videoRoot, `${normalized}.webm`));
      candidates.push(path.join(videoRoot, `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}.mp4`));
      candidates.push(path.join(videoRoot, `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}.mov`));
      candidates.push(path.join(videoRoot, `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}.webm`));
    }
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(`无法根据当前场景定位本地视频文件。已尝试：${hints.join(" / ") || "无有效线索"}`);
}

function getTimelineByMode(mode = "colmap") {
  if (mode === "images") {
    return ["上传图片", "COLMAP", "MEGS² 训练", "结果导出"];
  }
  if (mode === "video") {
    return ["上传视频", "抽帧", "COLMAP", "MEGS² 训练", "结果导出"];
  }
  return ["已检查到COLMAP数据", "MEGS² 训练", "结果导出"];
}

function toPublicJob(job) {
  return {
    id: job.id,
    mode: job.mode,
    sceneName: job.sceneName,
    state: job.state,
    stage: job.stage,
    message: job.message,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    workspacePath: job.workspacePath,
    modelPath: job.modelPath,
    logPath: job.logPath,
    launcher: job.launcher,
    selectionSummary: job.selectionSummary,
    parameterValues: job.parameterValues,
    inputImageDir: job.inputImageDir,
    sparseRoot: job.sparseRoot,
    sourcePath: job.sourcePath || job.workspacePath,
    sourceStrategy: job.sourceStrategy || "upload-copy",
    timeline: job.timeline,
    exitCode: job.exitCode,
    error: job.error,
    logTail: job.logTail || [],
    trainingProgress: job.trainingProgress || null,
    preview: job.preview || null,
    hasCheckpoint: Boolean(job.hasCheckpoint),
    latestCheckpointIteration: job.latestCheckpointIteration || null,
    latestCheckpointPath: job.latestCheckpointPath || null,
    checkpointIterations: Array.isArray(job.checkpointIterations) ? job.checkpointIterations : [],
    parentJobId: job.parentJobId || null,
    resumeFromCheckpoint: job.resumeFromCheckpoint || null,
    resumeFromIteration: job.resumeFromIteration || null,
    resumeOutputMode: job.resumeOutputMode || null,
  };
}

function stripAnsiCodes(text = "") {
  return String(text).replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function createInitialTrainingProgress(job) {
  const totalIterations = Number(job?.parameterValues?.iterations) || 30000;
  return {
    phase: "等待训练启动",
    percent: 0,
    currentIteration: 0,
    totalIterations,
    loss: null,
    eta: null,
    speed: null,
    detail: "任务已创建，等待训练启动",
    updatedAt: new Date().toISOString(),
  };
}

function pushLogTail(job, line, limit = 20) {
  if (!job.logTail) {
    job.logTail = [];
  }

  const compactLine = String(line).replace(/\s+/g, " ").trim();
  if (!compactLine) return;

  job.logTail.push(compactLine);
  if (job.logTail.length > limit) {
    job.logTail.splice(0, job.logTail.length - limit);
  }
}

function inferTrainingPhase(line = "") {
  if (/Saving Gaussians/i.test(line) || /Saving Checkpoint/i.test(line)) {
    return "结果导出";
  }
  if (/Evaluating/i.test(line)) {
    return "评估中";
  }
  if (/sharpness-based axis culling/i.test(line) || /densify|prune/i.test(line)) {
    return "剪枝优化";
  }
  if (/Final gaussians number/i.test(line)) {
    return "结果整理";
  }
  if (/Training progress/i.test(line) || /%.*\|/.test(line)) {
    return "MEGS² 训练";
  }
  return null;
}

function parseTrainingProgressFromLine(job, rawLine = "") {
  const line = stripAnsiCodes(rawLine).trim();
  if (!line) return null;

  const totalIterations = Number(job?.parameterValues?.iterations) || job?.trainingProgress?.totalIterations || 30000;
  let currentIteration = null;
  let percent = null;

  const tqdmMatch = line.match(/(\d{1,3})%\s*\|.*?(\d+)\s*\/\s*(\d+)/);
  const iterMatch = line.match(/\[ITER\s+(\d+)\]/i);
  const lossMatch = line.match(/Loss=([0-9]*\.?[0-9]+)/i);
  const speedMatch = line.match(/([0-9]*\.?[0-9]+)\s*it\/s/i);
  const etaMatch = line.match(/<([^,\]]+)/);

  if (tqdmMatch) {
    percent = Number(tqdmMatch[1]);
    currentIteration = Number(tqdmMatch[2]);
  }

  if (iterMatch) {
    currentIteration = Number(iterMatch[1]);
  }

  if (!Number.isFinite(percent) && Number.isFinite(currentIteration) && totalIterations > 0) {
    percent = Math.round((currentIteration / totalIterations) * 100);
  }

  const phase = inferTrainingPhase(line);
  if (!phase && !Number.isFinite(percent) && !Number.isFinite(currentIteration)) {
    return null;
  }

  const patch = {
    totalIterations,
    detail: line,
    updatedAt: new Date().toISOString(),
  };

  if (phase) patch.phase = phase;
  if (Number.isFinite(currentIteration)) patch.currentIteration = currentIteration;
  if (Number.isFinite(percent)) patch.percent = Math.max(0, Math.min(100, percent));
  if (lossMatch) patch.loss = Number(lossMatch[1]);
  if (speedMatch) patch.speed = `${speedMatch[1]} it/s`;
  if (etaMatch) patch.eta = etaMatch[1].trim();

  if (/Final gaussians number/i.test(line)) {
    patch.phase = "结果整理";
    patch.percent = 100;
    patch.currentIteration = totalIterations;
  }

  return patch;
}

async function updateTrainingProgress(job, patch = {}) {
  const current = job.trainingProgress || createInitialTrainingProgress(job);
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const same = [
    "phase",
    "percent",
    "currentIteration",
    "totalIterations",
    "loss",
    "eta",
    "speed",
    "detail",
  ].every((key) => current[key] === next[key]);

  if (same) {
    return false;
  }

  job.trainingProgress = next;
  await persistJobArtifacts(job);
  return true;
}

async function appendTrainingOutput(job, chunk, logStream) {
  const text = chunk.toString();
  logStream.write(text);

  job.outputBuffer = `${job.outputBuffer || ""}${text}`;
  const normalized = stripAnsiCodes(job.outputBuffer);
  const lines = normalized.split(/\r|\n/);
  job.outputBuffer = lines.pop() || "";

  for (const rawLine of lines) {
    const line = String(rawLine).trim();
    if (!line) continue;
    pushLogTail(job, line);
    const patch = parseTrainingProgressFromLine(job, line);
    if (patch) {
      await updateTrainingProgress(job, patch);
    }
  }
}

async function flushTrainingOutputBuffer(job) {
  const finalLine = stripAnsiCodes(job.outputBuffer || "").trim();
  job.outputBuffer = "";
  if (!finalLine) return;
  pushLogTail(job, finalLine);
  const patch = parseTrainingProgressFromLine(job, finalLine);
  if (patch) {
    await updateTrainingProgress(job, patch);
  }
}

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

async function ensureJobScaffold(jobRoot) {
  await fs.mkdir(path.join(jobRoot, "workspace"), { recursive: true });
  await fs.mkdir(path.join(jobRoot, "logs"), { recursive: true });
  await fs.mkdir(path.join(jobRoot, "output"), { recursive: true });
}

async function parseMultipartFormData(req) {
  const request = new Request(`http://127.0.0.1${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: "half",
  });
  return request.formData();
}

async function writeUploadedFiles(formData, manifest = [], workspacePath) {
  const commonRoot = getUploadCommonRoot(manifest);

  for (const entry of manifest) {
    const file = formData.get(entry.key);
    if (!file || typeof file.arrayBuffer !== "function") {
      throw new Error(`Missing upload payload for ${entry.key}`);
    }

    const relativePath = normalizeUploadRelativePath(entry.relativePath || entry.name || file.name, commonRoot);
    if (!relativePath) {
      continue;
    }

    const destination = path.join(workspacePath, relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(destination, buffer);
  }
}

function buildTrainArgs(job) {
  const params = job.parameterValues || {};
  const iterations = Number(params.iterations) || 30000;
  const saveInterval = iterations;
  const checkpointIterations = [iterations];
  const args = [
    MEGS2_TRAIN_SCRIPT,
    "-s",
    job.workspacePath,
    "-m",
    job.modelPath,
    "-i",
    job.inputImageDir || "images",
    "--iterations",
    String(iterations),
    "--save_iterations",
    String(saveInterval),
    "--feature_lr",
    String(Number(params.feature_lr) || 0.0025),
    "--scaling_lr",
    String(Number(params.scaling_lr) || 0.005),
    "--rotation_lr",
    String(Number(params.rotation_lr) || 0.001),
    "--opacity_lr",
    String(Number(params.opacity_lr) || 0.05),
    "--lambda_dssim",
    String(Number(params.lambda_dssim) || 0.2),
    "--position_lr_init",
    String(Number(params.position_lr_init) || 0.00016),
    "--densify_grad_threshold",
    String(Number(params.densify_grad_threshold) || 0.0002),
    "--densify_from_iter",
    String(Number(params.densify_from_iter) || 500),
    "--sharpness_ratio",
    String(Number(params.sharpness_ratio) || 0.7),
    "--rho_lr",
    String(Number(params.rho_lr) || 0.0005),
    "--lambda_sh_sparsity",
    String(Number(params.lambda_sh_sparsity) || 0.01),
    "--prune_ratio1",
    String(Number(params.prune_ratio1) || 0.5),
    "--prune_ratio2",
    String(Number(params.prune_ratio2) || 0.8),
    "--optimizing_spa_interval",
    String(Number(params.optimizing_spa_interval) || 50),
    "--optimizing_spa_stop_iter",
    String(Number(params.optimizing_spa_stop_iter) || 35200),
    "--imp_metric",
    job.impMetric,
  ];

  if (checkpointIterations.length) {
    args.push("--checkpoint_iterations", ...checkpointIterations.map((value) => String(value)));
  }

  if (job.resumeFromCheckpoint) {
    args.push("--start_checkpoint", job.resumeFromCheckpoint);
  }

  return args;
}

function resolveTrainingLaunchCommand(job) {
  const trainArgs = buildTrainArgs(job);

  if (PYTHON_BIN) {
    return {
      command: PYTHON_BIN,
      args: ["-u", ...trainArgs],
      descriptor: `python:${PYTHON_BIN}`,
    };
  }

  return {
    command: "bash",
    args: [
      "-lc",
      `source ${shellQuote(CONDA_SH)} && conda activate ${shellQuote(CONDA_ENV_NAME)} && exec python -u ${trainArgs.map(shellQuote).join(" ")}`,
    ],
    descriptor: `conda-activate:${CONDA_ENV_NAME}`,
  };
}

async function persistJobArtifacts(job) {
  job.preview = await getLatestPreviewInfo(job);
  const checkpointInfo = await getCheckpointInfo(job.modelPath);
  job.hasCheckpoint = checkpointInfo.hasCheckpoint;
  job.latestCheckpointIteration = checkpointInfo.latestCheckpointIteration;
  job.latestCheckpointPath = checkpointInfo.latestCheckpointPath;
  job.checkpointIterations = checkpointInfo.checkpointIterations;
  await fs.writeFile(path.join(job.rootPath, "job.json"), JSON.stringify({
    id: job.id,
    mode: job.mode,
    sceneName: job.sceneName,
    selectionSummary: job.selectionSummary,
    launcher: job.launcher,
    parameterValues: job.parameterValues,
    inputImageDir: job.inputImageDir,
    sparseRoot: job.sparseRoot,
    impMetric: job.impMetric,
    sourcePath: job.sourcePath || job.workspacePath,
    sourceStrategy: job.sourceStrategy || "upload-copy",
    hasCheckpoint: job.hasCheckpoint,
    latestCheckpointIteration: job.latestCheckpointIteration || null,
    latestCheckpointPath: job.latestCheckpointPath || null,
    checkpointIterations: job.checkpointIterations || [],
    parentJobId: job.parentJobId || null,
    resumeFromCheckpoint: job.resumeFromCheckpoint || null,
    resumeFromIteration: job.resumeFromIteration || null,
    resumeOutputMode: job.resumeOutputMode || null,
  }, null, 2));

  await fs.writeFile(path.join(job.rootPath, "status.json"), JSON.stringify(toPublicJob(job), null, 2));
}

async function updateJob(job, patch) {
  Object.assign(job, patch, {
    updatedAt: new Date().toISOString(),
  });
  await persistJobArtifacts(job);
}

async function readLogs(job) {
  try {
    return await fs.readFile(job.logPath, "utf8");
  } catch {
    return "";
  }
}

function formatJobDuration(startAt, endAt) {
  const start = startAt ? new Date(startAt).getTime() : Number.NaN;
  const end = endAt ? new Date(endAt).getTime() : Number.NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const totalSeconds = Math.max(1, Math.round((end - start) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainMinutes}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

async function loadStoredJob(jobId) {
  const liveJob = jobStore.get(jobId);
  if (liveJob) return liveJob;

  const rootPath = path.join(JOBS_ROOT, jobId);
  const statusPath = path.join(rootPath, "status.json");
  const jobPath = path.join(rootPath, "job.json");

  try {
    const [statusRaw, jobRaw] = await Promise.all([
      fs.readFile(statusPath, "utf8"),
      fs.readFile(jobPath, "utf8"),
    ]);
    const status = JSON.parse(statusRaw);
    const persisted = JSON.parse(jobRaw);
    return {
      id: persisted.id || status.id || jobId,
      mode: persisted.mode || status.mode || "colmap",
      sceneName: persisted.sceneName || status.sceneName || "unnamed-scene",
      selectionSummary: persisted.selectionSummary || status.selectionSummary || "",
      launcher: persisted.launcher || status.launcher || "",
      parameterValues: persisted.parameterValues || status.parameterValues || {},
      inputImageDir: persisted.inputImageDir || status.inputImageDir || "images",
      sparseRoot: persisted.sparseRoot || status.sparseRoot || "sparse/0",
      impMetric: persisted.impMetric || "indoor",
      sourcePath: persisted.sourcePath || status.sourcePath || status.workspacePath,
      sourceStrategy: persisted.sourceStrategy || status.sourceStrategy || "local-path",
      workspacePath: status.workspacePath || persisted.sourcePath || "",
      modelPath: status.modelPath || path.join(rootPath, "output"),
      logPath: status.logPath || path.join(rootPath, "logs", "train.log"),
      rootPath,
      createdAt: status.createdAt || null,
      updatedAt: status.updatedAt || null,
      state: status.state || "unknown",
      stage: status.stage || "unknown",
      message: status.message || "",
      timeline: status.timeline || getTimelineByMode(persisted.mode || status.mode || "colmap"),
      exitCode: status.exitCode ?? null,
      error: status.error || null,
      logTail: status.logTail || [],
      trainingProgress: status.trainingProgress || createInitialTrainingProgress({ parameterValues: persisted.parameterValues || status.parameterValues || {} }),
      preview: status.preview || null,
      hasCheckpoint: Boolean(status.hasCheckpoint || persisted.hasCheckpoint),
      latestCheckpointIteration: status.latestCheckpointIteration || persisted.latestCheckpointIteration || null,
      latestCheckpointPath: status.latestCheckpointPath || persisted.latestCheckpointPath || null,
      checkpointIterations: status.checkpointIterations || persisted.checkpointIterations || [],
      parentJobId: status.parentJobId || persisted.parentJobId || null,
      resumeFromCheckpoint: status.resumeFromCheckpoint || persisted.resumeFromCheckpoint || null,
      resumeFromIteration: status.resumeFromIteration || persisted.resumeFromIteration || null,
      resumeOutputMode: status.resumeOutputMode || persisted.resumeOutputMode || null,
      process: null,
      outputBuffer: "",
    };
  } catch {
    return null;
  }
}

async function resolveJobForApi(jobId) {
  const job = await loadStoredJob(jobId);
  if (!job) return null;

  if (!jobStore.has(job.id)) {
    jobStore.set(job.id, job);
  }

  if (
    !job.process
    && ["running", "queued", "cancelling"].includes(job.state)
  ) {
    await updateJob(job, {
      state: "failed",
      stage: "failed",
      message: "训练状态已失联",
      error: "本地开发服务重启或中断，原训练进程状态无法继续追踪。",
      trainingProgress: {
        ...(job.trainingProgress || createInitialTrainingProgress(job)),
        phase: "训练状态已失联",
        detail: "本地开发服务重启或中断，原训练进程状态无法继续追踪。",
      },
    });
  }

  return job;
}

async function listHistoricalJobs(sceneName = "") {
  let jobDirs = [];
  try {
    jobDirs = await fs.readdir(JOBS_ROOT, { withFileTypes: true });
  } catch {
    return [];
  }

  const normalizedFilter = normalizeSceneFolderHint(sceneName);
  const results = [];

  for (const entry of jobDirs) {
    if (!entry.isDirectory()) continue;
    const loaded = await loadStoredJob(entry.name);
    if (!loaded) continue;

    const checkpointInfo = await getCheckpointInfo(loaded.modelPath);
    loaded.hasCheckpoint = checkpointInfo.hasCheckpoint;
    loaded.latestCheckpointIteration = checkpointInfo.latestCheckpointIteration;
    loaded.latestCheckpointPath = checkpointInfo.latestCheckpointPath;
    loaded.checkpointIterations = checkpointInfo.checkpointIterations;

    if (normalizedFilter && normalizeSceneFolderHint(loaded.sceneName) !== normalizedFilter) {
      continue;
    }

    const canResume = ["success", "failed", "cancelled"].includes(loaded.state) && loaded.hasCheckpoint;
    results.push({
      id: loaded.id,
      runName: loaded.parentJobId ? `${loaded.sceneName}-resume` : loaded.sceneName,
      sceneName: loaded.sceneName,
      mode: loaded.mode,
      state: loaded.state,
      status: loaded.state,
      stage: loaded.stage,
      message: loaded.message,
      error: loaded.error,
      createdAt: loaded.createdAt,
      updatedAt: loaded.updatedAt,
      duration: formatJobDuration(loaded.createdAt, loaded.updatedAt),
      inputImageDir: loaded.inputImageDir,
      sparseRoot: loaded.sparseRoot,
      sourcePath: loaded.sourcePath || loaded.workspacePath,
      parameterValues: loaded.parameterValues || {},
      currentIteration: loaded.trainingProgress?.currentIteration || 0,
      totalIterations: loaded.trainingProgress?.totalIterations || Number(loaded.parameterValues?.iterations) || 30000,
      latestCheckpointIteration: loaded.latestCheckpointIteration,
      checkpointIterations: loaded.checkpointIterations || [],
      hasCheckpoint: loaded.hasCheckpoint,
      canResume,
      parentJobId: loaded.parentJobId || null,
      resumeFromIteration: loaded.resumeFromIteration || null,
      preview: loaded.preview || null,
      logTail: loaded.logTail || [],
      trainingProgress: loaded.trainingProgress || null,
    });
  }

  results.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return results;
}

async function pruneOldJobs() {
  let jobDirs = [];
  try {
    jobDirs = await fs.readdir(JOBS_ROOT, { withFileTypes: true });
  } catch {
    return;
  }

  const loadedJobs = [];
  for (const entry of jobDirs) {
    if (!entry.isDirectory()) continue;
    const loaded = await loadStoredJob(entry.name);
    if (!loaded) continue;
    loadedJobs.push(loaded);
  }

  loadedJobs.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  const removableJobs = loadedJobs
    .filter((job) => !["running", "queued", "cancelling"].includes(job.state))
    .slice(MAX_HISTORY_JOBS);

  await Promise.all(removableJobs.map(async (job) => {
    jobStore.delete(job.id);
    try {
      await fs.rm(job.rootPath, { recursive: true, force: true });
    } catch {
      // ignore prune failures so listing/training stays available
    }
  }));
}

async function verifyTrainingRuntime() {
  const script = `
import importlib.util
missing = [name for name in ["torch", "diff_gaussian_rasterization_ms"] if importlib.util.find_spec(name) is None]
print(",".join(missing))
`.trim();

  let stdout = "";
  if (PYTHON_BIN) {
    const result = await execFileAsync(PYTHON_BIN, ["-c", script], { cwd: MEGS2_ROOT, env: process.env });
    stdout = result.stdout || "";
  } else {
    const result = await execFileAsync(
      "bash",
      ["-lc", `source ${shellQuote(CONDA_SH)} && conda activate ${shellQuote(CONDA_ENV_NAME)} && python -c ${shellQuote(script)}`],
      {
        cwd: MEGS2_ROOT,
        env: process.env,
      },
    );
    stdout = result.stdout || "";
  }

  const missing = stdout.trim().split(",").map((item) => item.trim()).filter(Boolean);
  if (missing.length) {
    throw new Error(`训练环境缺少依赖模块：${missing.join(", ")}`);
  }
}

async function runColmapTrainingJob(job) {
  await verifyTrainingRuntime();
  job.cancelRequested = false;
  await updateJob(job, {
    state: "running",
    stage: "training_megs2",
    message: `MEGS² 训练已启动（${job.launcher}）`,
    trainingProgress: {
      ...(job.trainingProgress || createInitialTrainingProgress(job)),
      phase: "MEGS² 训练",
      detail: "训练进程已启动，等待首批日志输出",
    },
  });

  const launch = resolveTrainingLaunchCommand(job);
  job.launcher = launch.descriptor;

  const child = spawn(launch.command, launch.args, {
    cwd: MEGS2_ROOT,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });

  job.process = child;

  const logStream = createWriteStream(job.logPath, { flags: "a" });
  const writeChunk = (chunk) => {
    void appendTrainingOutput(job, chunk, logStream);
  };

  child.stdout.on("data", writeChunk);
  child.stderr.on("data", writeChunk);

  let finalized = false;

  child.on("error", async (error) => {
    if (finalized) return;
    finalized = true;
    await flushTrainingOutputBuffer(job);
    logStream.end();
    job.process = null;
    await updateJob(job, {
      state: "failed",
      stage: "failed",
      message: "训练进程启动失败",
      error: `[${job.launcher}] ${error.message}`,
      exitCode: -1,
      trainingProgress: {
        ...(job.trainingProgress || createInitialTrainingProgress(job)),
        phase: "启动失败",
        detail: error.message,
      },
    });
  });

  child.on("close", async (code, signal) => {
    if (finalized) return;
    finalized = true;
    await flushTrainingOutputBuffer(job);
    logStream.end();
    job.process = null;

    if (job.cancelRequested) {
      await updateJob(job, {
        state: "cancelled",
        stage: "cancelled",
        message: "任务已中断",
        exitCode: code,
        error: null,
        trainingProgress: {
          ...(job.trainingProgress || createInitialTrainingProgress(job)),
          phase: "任务已中断",
          detail: "训练进程已手动停止",
        },
      });
      return;
    }

    if (code === 0) {
      await updateJob(job, {
        stage: "exporting_result",
        message: "训练完成，正在整理输出结果",
        trainingProgress: {
          ...(job.trainingProgress || createInitialTrainingProgress(job)),
          phase: "结果导出",
          percent: 100,
          currentIteration: Number(job?.parameterValues?.iterations) || job?.trainingProgress?.totalIterations || 30000,
          totalIterations: Number(job?.parameterValues?.iterations) || job?.trainingProgress?.totalIterations || 30000,
          detail: "训练完成，正在整理输出结果",
        },
      });
      await updateJob(job, {
        state: "success",
        stage: "success",
        message: "训练完成",
        exitCode: 0,
        trainingProgress: {
          ...(job.trainingProgress || createInitialTrainingProgress(job)),
          phase: "训练完成",
          percent: 100,
          currentIteration: Number(job?.parameterValues?.iterations) || job?.trainingProgress?.totalIterations || 30000,
          totalIterations: Number(job?.parameterValues?.iterations) || job?.trainingProgress?.totalIterations || 30000,
          detail: "训练已完成，可查看输出结果",
        },
      });
      return;
    }

    if (signal) {
      const signalReason =
        signal === "SIGKILL"
          ? "训练进程被系统强制终止，常见原因是内存不足（OOM）"
          : `训练进程被信号 ${signal} 终止`;
      await updateJob(job, {
        state: "failed",
        stage: "failed",
        message: "训练失败",
        exitCode: code,
        error: `[${job.launcher}] ${signalReason}`,
        trainingProgress: {
          ...(job.trainingProgress || createInitialTrainingProgress(job)),
          phase: "训练失败",
          detail: signalReason,
        },
      });
      return;
    }

    await updateJob(job, {
      state: "failed",
      stage: "failed",
      message: "训练失败",
      exitCode: code,
      error: `[${job.launcher}] MEGS² train.py exited with code ${code}`,
      trainingProgress: {
        ...(job.trainingProgress || createInitialTrainingProgress(job)),
        phase: "训练失败",
        detail: `[${job.launcher}] MEGS² train.py exited with code ${code}`,
      },
    });
  });
}

async function cancelTrainingJob(jobId) {
  const job = await resolveJobForApi(jobId);
  if (!job) {
    return { ok: false, statusCode: 404, message: "Job not found" };
  }

  if (job.state === "success" || job.state === "failed" || job.state === "cancelled") {
    return { ok: false, statusCode: 409, message: "Job already finished" };
  }

  if (!job.process) {
    await updateJob(job, {
      state: "cancelled",
      stage: "cancelled",
      message: "任务已中断",
      exitCode: null,
      error: null,
      trainingProgress: {
        ...(job.trainingProgress || createInitialTrainingProgress(job)),
        phase: "任务已中断",
        detail: "任务在启动前被取消",
      },
    });
    return { ok: true, job };
  }

  job.cancelRequested = true;
  await updateJob(job, {
    state: "cancelling",
    stage: "cancelling",
    message: "正在中断任务...",
    trainingProgress: {
      ...(job.trainingProgress || createInitialTrainingProgress(job)),
      phase: "正在中断",
      detail: "正在向训练进程发送中断信号",
    },
  });

  try {
    job.process.kill("SIGTERM");
  } catch (error) {
    try {
      job.process.kill("SIGKILL");
    } catch {
      /* noop */
    }
  }

  setTimeout(() => {
    try {
      if (job.process && !job.process.killed) {
        job.process.kill("SIGKILL");
      }
    } catch {
      /* noop */
    }
  }, 4000);

  return { ok: true, job };
}

async function createTrainingJob(formData) {
  const payload = JSON.parse(String(formData.get("payload") || "{}"));
  const manifest = JSON.parse(String(formData.get("manifest") || "[]"));

  if (payload.mode !== "colmap") {
    throw new Error("Minimal runnable backend currently supports only COLMAP mode.");
  }

  const jobId = randomUUID();
  const rootPath = path.join(JOBS_ROOT, jobId);
  let workspacePath = path.join(rootPath, "workspace");
  const modelPath = path.join(rootPath, "output");
  const logPath = path.join(rootPath, "logs", "train.log");
  const sourceStrategy = payload.sourceStrategy === "local-path" ? "local-path" : "upload-copy";

  await ensureJobScaffold(rootPath);
  if (sourceStrategy === "local-path") {
    workspacePath = await resolveLocalColmapSource(payload, manifest);
  } else {
    await writeUploadedFiles(formData, manifest, workspacePath);
  }

  const inputImageDir = payload.inputImageDir || payload.parameterValues?.input_image_dir || "images";
  const sparseRootRelative = String(payload.parameterValues?.sparse_root || "sparse/0");
  const sparseRoot = path.join(workspacePath, sparseRootRelative);
  const imageRoot = path.join(workspacePath, inputImageDir);

  if (payload.parameterValues?.require_cameras_bin !== false) {
    await fs.access(path.join(sparseRoot, "cameras.bin")).catch(async () => {
      await fs.access(path.join(sparseRoot, "cameras.txt"));
    });
  }

  if (payload.parameterValues?.require_images_bin !== false) {
    await fs.access(path.join(sparseRoot, "images.bin")).catch(async () => {
      await fs.access(path.join(sparseRoot, "images.txt"));
    });
  }

  if (payload.parameterValues?.require_points_bin !== false) {
    await fs.access(path.join(sparseRoot, "points3D.bin")).catch(async () => {
      await fs.access(path.join(sparseRoot, "points3D.txt"));
    });
  }

  await fs.access(imageRoot);

  const timeline = [
    "已检查到COLMAP数据",
    "MEGS² 训练",
    "结果导出",
  ];

  const creationMessage =
    sourceStrategy === "local-path"
      ? `已定位本地 COLMAP 工程：${workspacePath}`
      : "任务已创建，等待训练启动";
  const resolvedSceneName =
    sourceStrategy === "local-path"
      ? inferResolvedSceneName(workspacePath, payload.sceneName)
      : (payload.sceneName || "unnamed-scene");

  const job = {
    id: jobId,
    mode: payload.mode,
    sceneName: resolvedSceneName,
    selectionSummary: payload.selectionSummary || "已接收训练输入",
    parameterValues: payload.parameterValues || {},
    inputImageDir,
    sparseRoot: sparseRootRelative,
    impMetric: getSceneImpMetric(payload.sceneTags || []),
    rootPath,
    workspacePath,
    sourcePath: workspacePath,
    sourceStrategy,
    modelPath,
    logPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    state: "queued",
    stage: "queued",
    message: creationMessage,
    timeline,
    process: null,
    launcher: PYTHON_BIN ? `python:${PYTHON_BIN}` : `conda:${CONDA_ENV_NAME}`,
    exitCode: null,
    error: null,
    logTail: [],
    trainingProgress: null,
    outputBuffer: "",
  };

  job.trainingProgress = createInitialTrainingProgress(job);
  if (sourceStrategy === "local-path") {
    job.trainingProgress = {
      ...job.trainingProgress,
      phase: "本地目录就绪",
      percent: 8,
      detail: `已直接接入本机目录：${workspacePath}`,
    };
  }

  jobStore.set(jobId, job);
  await persistJobArtifacts(job);
  await pruneOldJobs();
  await runColmapTrainingJob(job);
  return job;
}

async function createResumeTrainingJob(formData) {
  const payload = JSON.parse(String(formData.get("payload") || "{}"));
  const parentJobId = String(payload.parentJobId || "").trim();
  if (!parentJobId) {
    throw new Error("缺少续训来源任务。");
  }

  const parentJob = await loadStoredJob(parentJobId);
  if (!parentJob) {
    throw new Error("未找到续训来源任务。");
  }

  const checkpointIteration = Number(payload.resumeIteration);
  const additionalIterations = Number(payload.additionalIterations);
  if (!Number.isFinite(checkpointIteration) || checkpointIteration <= 0) {
    throw new Error("续训 checkpoint 迭代数无效。");
  }
  if (!Number.isFinite(additionalIterations) || additionalIterations <= 0) {
    throw new Error("追加训练轮数无效。");
  }

  const checkpointPath = path.join(parentJob.modelPath, `chkpnt${checkpointIteration}.pth`);
  await fs.access(checkpointPath);

  const outputMode = payload.outputMode === "reuse-dir" ? "reuse-dir" : "new-dir";
  const jobId = randomUUID();
  const rootPath = path.join(JOBS_ROOT, jobId);
  await ensureJobScaffold(rootPath);

  const mergedParameters = {
    ...(parentJob.parameterValues || {}),
    ...(payload.parameterValues || {}),
    iterations: checkpointIteration + additionalIterations,
  };

  const modelPath =
    outputMode === "reuse-dir"
      ? parentJob.modelPath
      : path.join(rootPath, "output");
  if (outputMode === "reuse-dir") {
    await fs.mkdir(modelPath, { recursive: true });
  }

  const job = {
    id: jobId,
    mode: parentJob.mode,
    sceneName: parentJob.sceneName,
    selectionSummary: `断点续训：${parentJob.sceneName} · checkpoint ${checkpointIteration}`,
    parameterValues: mergedParameters,
    inputImageDir: parentJob.inputImageDir,
    sparseRoot: parentJob.sparseRoot,
    impMetric: parentJob.impMetric || "indoor",
    rootPath,
    workspacePath: parentJob.workspacePath,
    sourcePath: parentJob.sourcePath || parentJob.workspacePath,
    sourceStrategy: parentJob.sourceStrategy || "local-path",
    modelPath,
    logPath: path.join(rootPath, "logs", "train.log"),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    state: "queued",
    stage: "queued",
    message: `已创建续训任务：iteration ${checkpointIteration} -> ${checkpointIteration + additionalIterations}`,
    timeline: [
      "已检查到历史 checkpoint",
      "MEGS² 训练",
      "结果导出",
    ],
    process: null,
    launcher: PYTHON_BIN ? `python:${PYTHON_BIN}` : `conda:${CONDA_ENV_NAME}`,
    exitCode: null,
    error: null,
    logTail: [],
    trainingProgress: null,
    outputBuffer: "",
    parentJobId,
    resumeFromCheckpoint: checkpointPath,
    resumeFromIteration: checkpointIteration,
    resumeOutputMode: outputMode,
  };

  job.trainingProgress = {
    ...createInitialTrainingProgress(job),
    phase: "已检查到历史 checkpoint",
    percent: 8,
    currentIteration: checkpointIteration,
    totalIterations: checkpointIteration + additionalIterations,
    detail: `续训起点 iteration ${checkpointIteration}`,
  };

  jobStore.set(jobId, job);
  await persistJobArtifacts(job);
  await pruneOldJobs();
  await runColmapTrainingJob(job);
  return job;
}

async function handleCreateTraining(req, res) {
  try {
    const formData = await parseMultipartFormData(req);
    const job = await createTrainingJob(formData);
    json(res, 200, { ok: true, job: toPublicJob(job) });
  } catch (error) {
    json(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to create training job",
    });
  }
}

async function handleGetTraining(jobId, res) {
  const job = await resolveJobForApi(jobId);
  if (!job) {
    json(res, 404, { ok: false, message: "Job not found" });
    return;
  }
  json(res, 200, { ok: true, job: toPublicJob(job) });
}

async function handleGetTrainingLogs(jobId, res) {
  const job = await resolveJobForApi(jobId);
  if (!job) {
    json(res, 404, { ok: false, message: "Job not found" });
    return;
  }
  const logs = await readLogs(job);
  json(res, 200, { ok: true, jobId, logs, tail: job.logTail || [] });
}

async function handleGetTrainingPreview(jobId, req, res) {
  const job = await resolveJobForApi(jobId);
  if (!job) {
    json(res, 404, { ok: false, message: "Job not found" });
    return;
  }

  const iteration = Number(new URL(req.url || "/", "http://127.0.0.1").searchParams.get("iteration"));
  if (!Number.isFinite(iteration) || iteration <= 0) {
    json(res, 400, { ok: false, message: "Invalid preview iteration" });
    return;
  }

  const filePath = path.join(job.modelPath, "point_cloud", `iteration_${iteration}`, "point_cloud.ply");
  try {
    await fs.access(filePath);
  } catch {
    json(res, 404, { ok: false, message: "Preview file not found" });
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store");
  fsSync.createReadStream(filePath).pipe(res);
}

async function handleListTrainingHistory(req, res) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const sceneName = String(url.searchParams.get("scene") || "").trim();
  await pruneOldJobs();
  const jobs = await listHistoricalJobs(sceneName);
  json(res, 200, { ok: true, jobs });
}

async function handleResumeTraining(req, res) {
  try {
    const formData = await parseMultipartFormData(req);
    const job = await createResumeTrainingJob(formData);
    json(res, 200, { ok: true, job: toPublicJob(job) });
  } catch (error) {
    json(res, 400, {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to resume training job",
    });
  }
}

function createRouteMatcher(url) {
  const trainingMatch = url.pathname.match(/^\/api\/train\/([^/]+)$/);
  const logsMatch = url.pathname.match(/^\/api\/train\/([^/]+)\/logs$/);
  const cancelMatch = url.pathname.match(/^\/api\/train\/([^/]+)\/cancel$/);
  const previewMatch = url.pathname.match(/^\/api\/train\/([^/]+)\/preview\/point-cloud$/);
  return {
    trainingJobId: trainingMatch?.[1] || null,
    logsJobId: logsMatch?.[1] || null,
    cancelJobId: cancelMatch?.[1] || null,
    previewJobId: previewMatch?.[1] || null,
  };
}

export function createLocalApiMiddleware() {
  return async (req, res, next) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const { trainingJobId, logsJobId, cancelJobId, previewJobId } = createRouteMatcher(url);

    if (url.pathname === "/api/local-gpu") {
      try {
        const payload = await queryLocalGpuMetrics();
        json(res, 200, payload);
      } catch (error) {
        json(res, 503, {
          ok: false,
          message: error instanceof Error ? error.message : "Failed to query local GPU metrics",
        });
      }
      return;
    }

    if (url.pathname === "/api/train/create" && req.method === "POST") {
      await handleCreateTraining(req, res);
      return;
    }

    if (url.pathname === "/api/train/history" && req.method === "GET") {
      await handleListTrainingHistory(req, res);
      return;
    }

    if (url.pathname === "/api/train/resume" && req.method === "POST") {
      await handleResumeTraining(req, res);
      return;
    }

    if (trainingJobId && req.method === "GET") {
      await handleGetTraining(trainingJobId, res);
      return;
    }

    if (logsJobId && req.method === "GET") {
      await handleGetTrainingLogs(logsJobId, res);
      return;
    }

    if (previewJobId && req.method === "GET") {
      await handleGetTrainingPreview(previewJobId, req, res);
      return;
    }

    if (cancelJobId && req.method === "POST") {
      const result = await cancelTrainingJob(cancelJobId);
      if (!result.ok) {
        json(res, result.statusCode, { ok: false, message: result.message });
        return;
      }
      json(res, 200, { ok: true, job: toPublicJob(result.job) });
      return;
    }

    next();
  };
}
