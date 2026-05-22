// src/ui/renderApp.js

import gardenHeroVideo from "../../figures/garden.mp4";
import roomHeroVideo from "../../figures/room.mp4";
import treehillHeroVideo from "../../figures/Treehill.mp4";
import bicycleShowcaseVideo from "../../figures/Bicycle.mp4";
import bonsaiShowcaseVideo from "../../figures/Bonsai.mp4";
import counterShowcaseVideo from "../../figures/Counter.mp4";
import flowersShowcaseVideo from "../../figures/Flowers.mp4";
import kitchenShowcaseVideo from "../../figures/Kitchen.mp4";
import stumpShowcaseVideo from "../../figures/Stump.mp4";
import workflowStep1Video from "../../figures/step1.mp4";
import workflowStep2TrimmedVideo from "../../figures/step2_last20s.mp4";
import workflowStep3Video from "../../figures/step3.mp4";
import workflowStep4TrimmedVideo from "../../figures/step4_last20s.mp4";
import megs2OverviewImage from "../../figures/3e12860e6003878673d08e1b053c270c.png";
import assetCardAImage from "../../figures/A_transparent.png";
import assetCardBImage from "../../figures/B_transparent.png";
import assetCardCImage from "../../figures/C_transparent.png";
import { createViewer } from "../viewer/createViewer.js";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

const ACTIVE_WORKSPACE_JOB_STORAGE_KEY = "focusgs-active-workspace-job";
const EXPORT_DEMO_TRIGGER_KEY = "x";
const EXPORT_DEMO_PHASES = {
  PRE_EXPORT: "pre_export",
  EXPORTING: "exporting",
  READY: "export_ready",
};
const EXPORT_DEMO_TIMINGS = {
  PRE_EXPORT_MS: 2600,
  EXPORTING_MS: 6800,
};
const EXPORT_DEMO_DATA = {
  progress: {
    preExport: {
      percent: 99,
      currentIteration: 29940,
      totalIterations: 30000,
      loss: 0.0264813,
      speed: "10.82 it/s",
      eta: "00:06",
      phase: "MEGS² 训练",
      detail: "训练已进入收尾阶段，正在整理最终输出。",
    },
    exporting: {
      percent: 100,
      currentIteration: 30000,
      totalIterations: 30000,
      loss: 0.0249831,
      speed: "--",
      eta: "--",
      phase: "结果导出",
      detail: "正在保存 Gaussian 结果并生成轻量化资产。",
    },
    ready: {
      percent: 100,
      currentIteration: 30000,
      totalIterations: 30000,
      loss: 0.0249831,
      speed: "--",
      eta: "--",
      phase: "结果导出",
      detail: "结果导出完成，可继续查看保存路径与最终输出摘要。",
    },
  },
  runtime: {
    outputSize: "1.84 GB",
    compressedSize: "148 MB",
    compressionRatio: "12.4x smaller",
    finalLoss: "0.0249831",
    trainingTime: "1h 06m",
    compressedPath: "/home/shirowana/FocusGS/frontend/gs-browser-viewer/.runtime/exports/counter/lightweight",
  },
  logs: {
    preExport: [
      "Training progress: 99%|█████████▉| 29910/30000 [1:05:48<00:11, 10.90it/s, Loss=0.0267329]",
      "Training progress: 99%|█████████▉| 29920/30000 [1:05:49<00:10, 10.88it/s, Loss=0.0261084]",
      "Training progress: 99%|█████████▉| 29930/30000 [1:05:50<00:08, 10.85it/s, Loss=0.0256048]",
      "Training progress: 99%|█████████▉| 29940/30000 [1:05:51<00:07, 10.82it/s, Loss=0.0264813]",
      "Preview branch armed: preparing export demonstration payload.",
    ],
    exporting: [
      "Training progress: 100%|██████████| 30000/30000 [1:05:58<00:00, 10.77it/s, Loss=0.0249831]",
      "[ITER 30000] Saving Gaussians",
      "Exporting lightweight assets...",
      "Packaging browser-ready Gaussian bundle...",
      "Compression finished.",
    ],
    ready: [
      "Lightweight assets saved to /home/shirowana/FocusGS/frontend/gs-browser-viewer/.runtime/exports/counter/lightweight",
      "Export summary: Output Size 1.84 GB -> Compressed Size 148 MB (12.4x smaller)",
      "Demo branch complete: final export package is ready for preview.",
    ],
  },
};

window.focusGSWorkspaceRuntime = window.focusGSWorkspaceRuntime || {
  jobStatus: "idle",
};

let parallaxScrollListener = null;
let parallaxResizeListener = null;
let parallaxFrameId = 0;
let parallaxTargets = [];

const SHOWCASE_SCENE_VIDEOS = {
  bicycle: bicycleShowcaseVideo,
  bonsai: bonsaiShowcaseVideo,
  counter: counterShowcaseVideo,
  flowers: flowersShowcaseVideo,
  garden: gardenHeroVideo,
  kitchen: kitchenShowcaseVideo,
  room: roomHeroVideo,
  stump: stumpShowcaseVideo,
  treehill: treehillHeroVideo,
};

// ---- 视差初始化 ----
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function measureParallaxTargets() {
  parallaxTargets = Array.from(document.querySelectorAll("[data-parallax-speed]"))
    .map((el) => {
      const speed = Number.parseFloat(el.dataset.parallaxSpeed || "0");
      const maxOffset = Number.parseFloat(el.dataset.parallaxMax || "72");
      const rect = el.getBoundingClientRect();

      return {
        el,
        speed: Number.isFinite(speed) ? speed : 0,
        maxOffset: Number.isFinite(maxOffset) ? Math.abs(maxOffset) : 72,
        baseTop: rect.top + window.scrollY,
        baseHeight: rect.height || el.offsetHeight || 0,
      };
    })
    .filter((target) => target.speed !== 0);
}

function applyParallaxTargets() {
  if (!parallaxTargets.length) return;

  const viewportCenter = window.scrollY + window.innerHeight / 2;

  parallaxTargets.forEach((target) => {
    if (!target.el.isConnected) return;

    const elementCenter = target.baseTop + target.baseHeight / 2;
    const rawOffset = (viewportCenter - elementCenter) * target.speed;
    const offset = clamp(rawOffset, -target.maxOffset, target.maxOffset);
    target.el.style.setProperty("--parallax-offset-y", `${offset.toFixed(2)}px`);
  });
}

function setupParallax() {
  if (parallaxScrollListener) {
    window.removeEventListener("scroll", parallaxScrollListener);
  }
  if (parallaxResizeListener) {
    window.removeEventListener("resize", parallaxResizeListener);
  }
  parallaxScrollListener = null;
  parallaxResizeListener = null;
  if (parallaxFrameId) {
    cancelAnimationFrame(parallaxFrameId);
    parallaxFrameId = 0;
  }

  measureParallaxTargets();
  if (!parallaxTargets.length) return;

  parallaxScrollListener = () => {
    if (parallaxFrameId) return;
    parallaxFrameId = window.requestAnimationFrame(() => {
      parallaxFrameId = 0;
      applyParallaxTargets();
    });
  };

  parallaxResizeListener = () => {
    measureParallaxTargets();
    applyParallaxTargets();
  };

  window.addEventListener("scroll", parallaxScrollListener, { passive: true });
  window.addEventListener("resize", parallaxResizeListener, { passive: true });
  applyParallaxTargets();
}

// ---- 绑定全局主题切换，供 HTML onclick 调用 ----
window.toggleTheme = function () {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === "dark") {
    root.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  } else {
    root.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
};

// ---- 工具函数 ----
function formatMetric(value) {
  return value == null ? "—" : String(value);
}

function formatMetricByType(type, value) {
  if (value == null) return "—";
  if (type === "psnr") return Number(value).toFixed(2);
  return Number(value).toFixed(3);
}

/**
 * 将 ISO 时间字符串格式化为本地日期
 * @param {string|null} iso
 */
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 根据任务状态返回对应的 CSS 类名和标签文字
 */
function getStatusMeta(status) {
  const map = {
    success: { cls: "status-dot--success", label: "完成" },
    running: { cls: "status-dot--running", label: "运行中" },
    failed:  { cls: "status-dot--failed",  label: "失败" },
    queued:  { cls: "status-dot--queued",  label: "排队中" },
    cancelled: { cls: "status-dot--cancelled", label: "已中断" },
    cancelling: { cls: "status-dot--cancelled", label: "中断中" },
  };
  return map[status] || { cls: "", label: status };
}

// ---- 构建左侧小场景卡片列表 ----
function buildSceneCards(scenes, activeSceneId) {
  return scenes
    .map(
      (scene) => `
        <a class="scene-card ${scene.id === activeSceneId ? "is-active" : ""}" href="/?scene=${scene.id}">
          <div class="scene-card__img-wrapper">
             <img src="${scene.thumbnail}" alt="${scene.name}" />
          </div>
          <div class="scene-card__body">
            <strong>${scene.name}</strong>
            <span>${scene.dataset}</span>
            <div class="tag-row">${buildTagList(scene.tags || [], true)}</div>
          </div>
        </a>
      `,
    )
    .join("");
}

function buildTagList(tags = [], isSmall = false) {
  return tags.map((tag) => `<span class="tag ${isSmall ? "tag--small" : ""}">${tag}</span>`).join("");
}

const HERO_DEMO_VIDEOS = [
  {
    title: "Garden",
    label: "Outdoor Reconstruction",
    src: gardenHeroVideo,
  },
  {
    title: "Room",
    label: "Indoor Detail Recovery",
    src: roomHeroVideo,
  },
  {
    title: "Treehill",
    label: "Large-Scale Scene Browsing",
    src: treehillHeroVideo,
  },
];

const HOME_PIPELINE_STEPS = [
  {
    id: "prepare",
    step: "01",
    label: "Data Preparation",
    title: "数据准备",
    summary: "无论输入来自图片、视频还是 COLMAP 工程，FocusGS 都提供清晰统一的起点，让重建流程更容易开始。",
    note: "图片目录会进入 COLMAP，视频会先抽帧再建图，而已处理好的 COLMAP 数据则可直接进入训练。",
    mediaSrc: workflowStep1Video,
    visual: "prepare",
  },
  {
    id: "train",
    step: "02",
    label: "Reconstruction Training",
    title: "重建训练",
    summary: "以 3D Gaussian Splatting 为核心，并引入 MEGS² 的显存优化能力推进模型训练。",
    note: "核心目标是在有限显存下仍然保持高质量三维重建的可训练性。",
    mediaSrc: workflowStep2TrimmedVideo,
    visual: "train",
  },
  {
    id: "export",
    step: "03",
    label: "Result Export",
    title: "结果导出",
    summary: "将训练完成后的 Gaussian 结果整理、导出并转换为适合后续分发与展示的输出资产。",
    note: "这一阶段强调结果文件的整理、格式转换与可发布性，为网页端加载和后续复用做好准备。",
    mediaSrc: workflowStep3Video,
    visual: "show",
  },
  {
    id: "history",
    step: "04",
    label: "History Records",
    title: "历史记录",
    summary: "历史记录不仅用于回看任务结果，也支持基于已有 checkpoint 发起断点续训，让实验迭代更加连贯。",
    note: "从任务浏览到断点续训，FocusGS 将历史结果、运行状态与后续训练衔接到同一条工作流中，方便持续推进新的实验轮次。",
    mediaSrc: workflowStep4TrimmedVideo,
    visual: "history",
  },
];

const HOME_GITHUB_LINK = "https://github.com/Shirowana/FocusGS.git";

const WORKSPACE_INPUT_MODES = {
  images: {
    key: "images",
    label: "图片目录",
    buttonLabel: "图片目录",
    inputLabel: "选择一个图片目录",
    dropzoneTitle: "拖拽图片文件夹到这里，或点击选择目录。",
    dropzoneHint: "支持任何图像格式",
    pickerKind: "folder",
    accept: "image/*",
    timelineSteps: [
      { title: "上传图片", detail: "读取图片文件夹并统计输入内容。" },
      { title: "COLMAP", detail: "提取特征、完成匹配和稀疏建图。" },
      { title: "MEGS² 训练", detail: "进入 MEGS² 重建训练流程。" },
      { title: "结果导出", detail: "导出可浏览的结果资产。" },
    ],
    jobTitle: "image_folder_job.json",
    jobPhaseIntro: "图片文件夹输入已准备好。",
  },
  video: {
    key: "video",
    label: "单个视频",
    buttonLabel: "单个视频",
    inputLabel: "选择一个视频文件",
    dropzoneTitle: "拖拽视频到这里，或点击选择视频。",
    dropzoneHint: "支持单个视频文件",
    pickerKind: "video",
    accept: "video/*",
    timelineSteps: [
      { title: "上传视频", detail: "读取单个视频文件并准备抽帧。" },
      { title: "抽帧", detail: "将视频切分为多张训练输入图像。" },
      { title: "COLMAP", detail: "完成特征提取、匹配和稀疏建图。" },
      { title: "MEGS² 训练", detail: "进入 MEGS² 重建训练流程。" },
      { title: "结果导出", detail: "导出可浏览的结果资产。" },
    ],
    jobTitle: "video_job.json",
    jobPhaseIntro: "视频输入已准备好。",
  },
  colmap: {
    key: "colmap",
    label: "COLMAP",
    buttonLabel: "COLMAP",
    inputLabel: "选择一个 COLMAP 工程目录",
    dropzoneTitle: "拖拽COLMAP工程文件夹到这里，或点击选择目录。",
    dropzoneHint: "需要包含 sparse/0 等关键结构",
    pickerKind: "folder",
    accept: ".bin,.txt,.png,.jpg,.jpeg,.json",
    timelineSteps: [
      { title: "已检查到COLMAP数据", detail: "校验 sparse/0 与相机模型是否可用。" },
      { title: "MEGS² 训练", detail: "直接进入 MEGS² 重建训练流程。" },
      { title: "结果导出", detail: "导出可浏览的结果资产。" },
    ],
    jobTitle: "colmap_job.json",
    jobPhaseIntro: "COLMAP 工程已就绪。",
  },
};

const WORKSPACE_RESUME_TIMELINE = {
  key: "resume",
  timelineSteps: [
    { title: "加载续训checkpoint", detail: "检查历史 checkpoint 并恢复训练上下文。" },
    { title: "MEGS² 训练", detail: "从历史 checkpoint 继续推进 MEGS² 训练流程。" },
    { title: "结果导出", detail: "导出新的可浏览结果与轻量化资产。" },
  ],
};

function getWorkspaceInputMode(modeKey = "images") {
  return WORKSPACE_INPUT_MODES[modeKey] || WORKSPACE_INPUT_MODES.images;
}

const WORKSPACE_COMMON_PARAMETERS = [
  {
    title: "通用任务参数",
    badge: "通用",
    items: [
      {
        key: "batch_size",
        label: "视角批大小",
        type: "number",
        defaultValue: 1,
        min: 1,
        max: 4,
        step: 1,
        recommendation: "推荐 1-2",
        description: "控制每轮并行采样的视角数量，默认以较小批次保证训练稳定性。",
      },
      {
        key: "save_interval",
        label: "结果保存间隔",
        type: "number",
        defaultValue: 5000,
        min: 1000,
        max: 10000,
        step: 500,
        recommendation: "推荐 5000",
        description: "控制中间结果与检查点的保存频率，过小会增加 I/O 负担。",
      },
    ],
  },
];

const WORKSPACE_PARAMETER_PRESETS = {
  images: [
    {
      title: "COLMAP 建图参数",
      badge: "建图",
      items: [
        {
          key: "camera_model",
          label: "相机模型",
          type: "select",
          defaultValue: "OPENCV",
          options: ["OPENCV", "PINHOLE", "SIMPLE_PINHOLE"],
          recommendation: "推荐 OPENCV",
          description: "控制 COLMAP 读取图像时采用的内参模型。",
        },
        {
          key: "single_camera",
          label: "单相机假设",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "同一数据集共享一套相机内参，适合同设备连续拍摄。",
        },
        {
          key: "matcher",
          label: "匹配方式",
          type: "select",
          defaultValue: "exhaustive",
          options: ["exhaustive", "sequential"],
          recommendation: "推荐 exhaustive",
          description: "全匹配更稳，顺序匹配更快，适合连续视频帧。",
        },
        {
          key: "use_gpu",
          label: "使用 GPU 特征提取",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "对应 COLMAP 的 SIFT GPU 开关，可明显缩短建图准备时间。",
        },
      ],
    },
    {
      title: "MEGS² 训练参数",
      badge: "训练",
      items: [
        {
          key: "iterations",
          label: "训练轮数",
          type: "number",
          defaultValue: 30000,
          min: 7000,
          max: 50000,
          step: 1000,
          recommendation: "推荐 30000",
          description: "控制主训练时长，轮数越高通常越稳定，但耗时也更长。",
        },
        {
          key: "lambda_dssim",
          label: "DSSIM 权重",
          type: "number",
          defaultValue: 0.2,
          min: 0,
          max: 1,
          step: 0.05,
          recommendation: "推荐 0.15-0.30",
          description: "平衡 L1 与结构相似度损失，过高可能牺牲颜色细节。",
        },
        {
          key: "position_lr_init",
          label: "初始位置学习率",
          type: "number",
          defaultValue: 0.00016,
          min: 0.00001,
          max: 0.001,
          step: 0.00001,
          recommendation: "推荐 1.6e-4",
          description: "控制 Gaussian 位置更新速度，过大会造成几何震荡。",
        },
        {
          key: "densify_grad_threshold",
          label: "致密化梯度阈值",
          type: "number",
          defaultValue: 0.0002,
          min: 0.00005,
          max: 0.001,
          step: 0.00005,
          recommendation: "推荐 2e-4",
          description: "控制何时触发 densify / prune，直接影响点数增长节奏。",
        },
      ],
    },
    {
      title: "MEGS² 剪枝参数",
      badge: "优化",
      items: [
        {
          key: "prune_ratio1",
          label: "第一阶段剪枝比例",
          type: "number",
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
          recommendation: "推荐 0.40-0.60",
          description: "用于第一轮简化筛选，过高可能过早丢失结构。",
        },
        {
          key: "prune_ratio2",
          label: "第二阶段剪枝比例",
          type: "number",
          defaultValue: 0.8,
          min: 0.4,
          max: 0.95,
          step: 0.05,
          recommendation: "推荐 0.75-0.85",
          description: "用于后期统一剪枝，决定最终轻量化程度。",
        },
        {
          key: "sharpness_ratio",
          label: "锐度保留比例",
          type: "number",
          defaultValue: 0.7,
          min: 0.3,
          max: 0.95,
          step: 0.05,
          recommendation: "推荐 0.65-0.75",
          description: "影响 SG 颜色表示中高频信息的保留强度。",
        },
        {
          key: "rho_lr",
          label: "稀疏优化学习率",
          type: "number",
          defaultValue: 0.0005,
          min: 0.0001,
          max: 0.002,
          step: 0.0001,
          recommendation: "推荐 5e-4",
          description: "控制后期 sparsifying optimizing 的更新幅度。",
        },
      ],
    },
  ],
  video: [
    {
      title: "视频抽帧参数",
      badge: "抽帧",
      items: [
        {
          key: "sample_fps",
          label: "采样帧率",
          type: "number",
          defaultValue: 2,
          min: 1,
          max: 10,
          step: 1,
          recommendation: "推荐 2-4 fps",
          description: "控制从视频中抽帧的频率，过高会带来大量相似帧。",
        },
        {
          key: "max_frames",
          label: "最大抽帧数量",
          type: "number",
          defaultValue: 240,
          min: 60,
          max: 600,
          step: 20,
          recommendation: "推荐 120-300",
          description: "用于限制输入规模，避免超长视频直接拖慢后续建图。",
        },
        {
          key: "short_side",
          label: "短边分辨率",
          type: "number",
          defaultValue: 1080,
          min: 720,
          max: 1600,
          step: 80,
          recommendation: "推荐 960-1280",
          description: "抽帧后图像的短边目标尺寸，影响建图速度和细节。",
        },
        {
          key: "output_format",
          label: "抽帧格式",
          type: "select",
          defaultValue: "jpg",
          options: ["jpg", "png"],
          recommendation: "推荐 jpg",
          description: "JPG 更轻更快，PNG 更适合无损保留但体积更大。",
        },
      ],
    },
    {
      title: "COLMAP 建图参数",
      badge: "建图",
      items: [
        {
          key: "camera_model",
          label: "相机模型",
          type: "select",
          defaultValue: "OPENCV",
          options: ["OPENCV", "PINHOLE", "SIMPLE_PINHOLE"],
          recommendation: "推荐 OPENCV",
          description: "视频抽帧通常仍按统一内参处理，默认 OPENCV 更稳。",
        },
        {
          key: "single_camera",
          label: "单相机假设",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "单条视频通常来自同一镜头，建议保留单相机假设。",
        },
        {
          key: "matcher",
          label: "匹配方式",
          type: "select",
          defaultValue: "sequential",
          options: ["sequential", "exhaustive"],
          recommendation: "推荐 sequential",
          description: "视频帧相邻相关性更强，顺序匹配通常更符合场景特征。",
        },
        {
          key: "ba_tolerance",
          label: "BA 容差",
          type: "number",
          defaultValue: 0.000001,
          min: 0.0000001,
          max: 0.00001,
          step: 0.0000001,
          recommendation: "推荐 1e-6",
          description: "控制 bundle adjustment 收敛精度，越小越严格但更慢。",
        },
      ],
    },
    {
      title: "MEGS² 训练参数",
      badge: "训练",
      items: [
        {
          key: "iterations",
          label: "训练轮数",
          type: "number",
          defaultValue: 40000,
          min: 10000,
          max: 60000,
          step: 1000,
          recommendation: "推荐 30000-40000",
          description: "视频输入通常帧数更多，适当提高轮数更利于收敛。",
        },
        {
          key: "opacity_lr",
          label: "透明度学习率",
          type: "number",
          defaultValue: 0.05,
          min: 0.005,
          max: 0.1,
          step: 0.005,
          recommendation: "推荐 0.03-0.05",
          description: "影响 splat 的显隐收敛速度，对噪点与空洞较敏感。",
        },
        {
          key: "densify_from_iter",
          label: "致密化起始轮数",
          type: "number",
          defaultValue: 500,
          min: 100,
          max: 3000,
          step: 100,
          recommendation: "推荐 500",
          description: "控制何时开始 densify，过早可能放大前期噪声。",
        },
        {
          key: "optimizing_spa_interval",
          label: "稀疏优化间隔",
          type: "number",
          defaultValue: 50,
          min: 20,
          max: 200,
          step: 10,
          recommendation: "推荐 50",
          description: "控制 MEGS² 稀疏优化触发频率，影响后期剪枝节奏。",
        },
      ],
    },
    {
      title: "MEGS² 剪枝参数",
      badge: "优化",
      items: [
        {
          key: "prune_ratio1",
          label: "第一阶段剪枝比例",
          type: "number",
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
          recommendation: "推荐 0.40-0.60",
          description: "用于第一轮简化筛选，过高可能过早丢失结构。",
        },
        {
          key: "prune_ratio2",
          label: "第二阶段剪枝比例",
          type: "number",
          defaultValue: 0.8,
          min: 0.4,
          max: 0.95,
          step: 0.05,
          recommendation: "推荐 0.75-0.85",
          description: "用于后期统一剪枝，决定最终轻量化程度。",
        },
        {
          key: "sharpness_ratio",
          label: "锐度保留比例",
          type: "number",
          defaultValue: 0.7,
          min: 0.3,
          max: 0.95,
          step: 0.05,
          recommendation: "推荐 0.65-0.75",
          description: "影响 SG 颜色表示中高频信息的保留强度。",
        },
        {
          key: "rho_lr",
          label: "稀疏优化学习率",
          type: "number",
          defaultValue: 0.0005,
          min: 0.0001,
          max: 0.002,
          step: 0.0001,
          recommendation: "推荐 5e-4",
          description: "控制后期 sparsifying optimizing 的更新幅度。",
        },
      ],
    },
  ],
  colmap: [
    {
      title: "COLMAP 工程检查",
      badge: "输入",
      items: [
        {
          key: "input_image_dir",
          label: "训练图像目录",
          type: "select",
          defaultValue: "images",
          options: ["images"],
          recommendation: "推荐按重建尺度选择",
          description: "用于手动指定训练实际读取的图像目录。",
        },
        {
          key: "sparse_root",
          label: "稀疏模型目录",
          type: "text",
          defaultValue: "sparse/0",
          recommendation: "推荐 sparse/0",
          description: "指定工程内有效的 sparse 模型根目录，用于快速检查与加载。",
        },
        {
          key: "require_cameras_bin",
          label: "检查 cameras 文件",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "要求目录中存在 cameras.bin 或 cameras.txt。",
        },
        {
          key: "require_images_bin",
          label: "检查 images 文件",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "要求目录中存在 images.bin 或 images.txt。",
        },
        {
          key: "require_points_bin",
          label: "检查 points3D 文件",
          type: "checkbox",
          defaultValue: true,
          recommendation: "推荐 开启",
          description: "要求目录中存在 points3D.bin 或 points3D.txt。",
        },
      ],
    },
    {
      title: "MEGS² 训练参数",
      badge: "训练",
      items: [
        {
          key: "iterations",
          label: "训练轮数",
          type: "number",
          defaultValue: 30000,
          min: 7000,
          max: 50000,
          step: 1000,
          recommendation: "推荐 30000",
          description: "已具备 COLMAP 输入时，可以直接把训练轮数作为主调节项。",
        },
        {
          key: "feature_lr",
          label: "颜色学习率",
          type: "number",
          defaultValue: 0.0025,
          min: 0.0005,
          max: 0.01,
          step: 0.0005,
          recommendation: "推荐 2.5e-3",
          description: "控制颜色特征更新速度，过大容易造成颜色闪烁。",
        },
        {
          key: "scaling_lr",
          label: "尺度学习率",
          type: "number",
          defaultValue: 0.005,
          min: 0.001,
          max: 0.02,
          step: 0.001,
          recommendation: "推荐 5e-3",
          description: "控制 Gaussian 尺度收缩/扩张速度，影响边界收敛。",
        },
        {
          key: "rotation_lr",
          label: "旋转学习率",
          type: "number",
          defaultValue: 0.001,
          min: 0.0002,
          max: 0.005,
          step: 0.0002,
          recommendation: "推荐 1e-3",
          description: "控制方向参数更新速度，适合微调结构对齐表现。",
        },
      ],
    },
    {
      title: "MEGS² 剪枝参数",
      badge: "优化",
      items: [
        {
          key: "lambda_sh_sparsity",
          label: "稀疏正则权重",
          type: "number",
          defaultValue: 0.01,
          min: 0.001,
          max: 0.05,
          step: 0.001,
          recommendation: "推荐 0.005-0.02",
          description: "控制 SG/SH 参数的稀疏约束强度，过高会压制细节。",
        },
        {
          key: "prune_ratio1",
          label: "第一阶段剪枝比例",
          type: "number",
          defaultValue: 0.5,
          min: 0.1,
          max: 0.9,
          step: 0.05,
          recommendation: "推荐 0.40-0.60",
          description: "第一轮筛选比例，决定早期结构保留多少。",
        },
        {
          key: "prune_ratio2",
          label: "第二阶段剪枝比例",
          type: "number",
          defaultValue: 0.8,
          min: 0.4,
          max: 0.95,
          step: 0.05,
          recommendation: "推荐 0.75-0.85",
          description: "后期进一步压缩结果体积的核心比例。",
        },
        {
          key: "optimizing_spa_stop_iter",
          label: "稀疏优化结束轮数",
          type: "number",
          defaultValue: 35200,
          min: 20000,
          max: 50000,
          step: 200,
          recommendation: "推荐 35200",
          description: "决定后期稀疏优化持续到什么时候，影响最终压缩程度。",
        },
      ],
    },
  ],
};

function getPreferredColmapImageDir(imageDirs = []) {
  const normalized = imageDirs.map((dir) => dir.toLowerCase());
  const preferredOrder = ["images_4", "images4", "images", "images_2", "images2", "images_8", "images8"];
  const hit = preferredOrder.find((name) => normalized.includes(name));
  if (hit) {
    return imageDirs[normalized.indexOf(hit)];
  }
  return imageDirs[0] || "images";
}

function getWorkspaceParameterPreset(modeKey = "images", context = {}) {
  const baseGroups = WORKSPACE_PARAMETER_PRESETS[modeKey] || WORKSPACE_PARAMETER_PRESETS.images;
  const clonedGroups = baseGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, options: Array.isArray(item.options) ? [...item.options] : item.options })),
  }));

  if (modeKey === "colmap") {
    const imageDirs = Array.isArray(context.colmapImageDirs) && context.colmapImageDirs.length ? context.colmapImageDirs : ["images"];
    const preferredDir = getPreferredColmapImageDir(imageDirs);
    const inputGroup = clonedGroups[0];
    if (inputGroup) {
      inputGroup.items = inputGroup.items.map((item) =>
        item.key === "input_image_dir"
          ? {
              ...item,
              options: imageDirs,
              defaultValue: preferredDir,
            }
          : item,
      );
    }
  }

  return [...WORKSPACE_COMMON_PARAMETERS, ...clonedGroups];
}

function getWorkspaceDefaultParamValues(modeKey = "images", currentValues = {}, context = {}) {
  const groups = getWorkspaceParameterPreset(modeKey, context);
  const nextValues = {};

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const currentValue = currentValues[item.key];
      if (item.type === "select" && Array.isArray(item.options) && item.options.length) {
        nextValues[item.key] = item.options.includes(currentValue) ? currentValue : item.defaultValue;
      } else {
        nextValues[item.key] = currentValue ?? item.defaultValue;
      }
    });
  });

  return nextValues;
}

const LIGHTWEIGHT_ASSET_CARDS = [
  {
    eyebrow: "Step A",
    title: "原始 3DGS 结果",
    subtitle: "Original Gaussian Output",
    copy: "保留训练后 Gaussian primitive 的完整结果形态，适合作为高质量重建资产的原始输出基线。",
    image: assetCardAImage,
    imageAlt: "Original 3DGS result",
    tone: "blue",
  },
  {
    eyebrow: "Step B",
    title: "轻量化处理流程",
    subtitle: "Lightweight Conversion Pipeline",
    copy: "对训练结果进行结构整理、格式转换与面向网页展示的压缩处理，为后续快速传输与加载建立中间层。",
    image: assetCardBImage,
    imageAlt: "Lightweight processing pipeline",
    tone: "cyan",
    mediaClassName: "asset-save-card__media--tall",
  },
  {
    eyebrow: "Step C",
    title: "轻量化高斯资产",
    subtitle: "Web-Ready Gaussian Asset",
    copy: "生成更适合浏览器端分发、预览与交互加载的轻量资产形态，降低展示侧的体积与等待成本。",
    image: assetCardCImage,
    imageAlt: "Lightweight gaussian asset",
    tone: "green",
  },
];

const SCENE_HIGHLIGHTS = {
  garden: [
    "花园场景里的草木层次比较丰富，适合观察细碎植被在连续视角切换中的稳定性。",
    "这类户外自然场景很能体现 3DGS 在真实空间深度和整体氛围恢复上的表现。",
  ],
  room: [
    "房间场景里家具密集、遮挡频繁，适合观察室内近景结构是否保持完整。",
    "在转动视角时，可以重点留意狭窄空间里的边缘是否自然、透视是否连贯。",
  ],
  bicycle: [
    "自行车场景前后景分层明显，适合观察物体主体与背景之间的空间关系。",
    "金属车架和复杂轮廓也很适合作为细节保真与视差表现的直观参考。",
  ],
  bonsai: [
    "盆景场景包含枝叶、花盆和桌面等多类局部结构，适合看近距离细节恢复。",
    "它也是一个很适合观察高对比局部光照和细小几何是否稳定的室内样例。",
  ],
  counter: [
    "操作台场景物体堆叠密集，能直观看到复杂遮挡下的重建完整度。",
    "这里也适合留意反光表面和小物件边缘是否会在浏览时出现破碎感。",
  ],
  kitchen: [
    "厨房场景大平面和重复结构较多，适合看整体空间是否足够稳定统一。",
    "当镜头缓慢移动时，可以重点观察柜体、台面和墙面的连续性是否自然。",
  ],
  stump: [
    "树桩场景视差很强，适合测试镜头绕转时前后景层次是否足够清晰。",
    "细枝叶与不规则树皮也能帮助判断模型对复杂自然几何的恢复能力。",
  ],
  flowers: [
    "花丛场景拥有大量高频纹理和细小结构，是观察清晰度表现的典型样例。",
    "如果场景浏览依然保持稳定，通常说明细节表达和空间组织都比较扎实。",
  ],
  treehill: [
    "山坡林地场景纵深感很强，适合观察大场景浏览时的层次展开效果。",
    "树木分布与地形起伏结合在一起，能够更直观地体现整体空间感是否自然。",
  ],
};

let workflowAutoAdvanceTimer = null;
let workflowAutoAdvanceObserver = null;
let gpuSummaryPollTimer = null;

function isVideoAsset(src = "") {
  return /\.(mp4|webm)$/i.test(src);
}

function renderResponsiveMedia({ src = "", alt = "", className = "", poster = "", preload = "metadata" }) {
  if (!src) return "";
  if (isVideoAsset(src)) {
    const posterAttr = poster ? ` poster="${poster}"` : "";
    return `<video class="${className}" src="${src}"${posterAttr} autoplay muted loop playsinline preload="${preload}"></video>`;
  }
  return `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" />`;
}

function getScenePreviewMedia(scene) {
  return scene.previewMedia || SHOWCASE_SCENE_VIDEOS[scene.id] || scene.thumbnail;
}

function buildHeroDemoStrip() {
  return HERO_DEMO_VIDEOS
    .map(
      (video, index) => `
        <figure class="hero-demo-card" data-parallax-speed="${0.05 + index * 0.02}" data-parallax-max="${28 + index * 6}">
          <div class="hero-demo-card__media">
            <video
              class="hero-demo-card__video"
              src="${video.src}"
              autoplay
              muted
              loop
              playsinline
              preload="auto"
            ></video>
          </div>
          <figcaption class="hero-demo-card__caption">
            <strong>${video.title}</strong>
            <span>${video.label}</span>
          </figcaption>
        </figure>
      `,
    )
    .join("");
}

function buildPageSwitch(sceneId = "garden", activePage = "home") {
  return `
    <div class="page-switch" role="tablist" aria-label="Page Navigation" data-active="${activePage}">
      <span class="page-switch__thumb" aria-hidden="true"></span>
      <a
        class="page-switch__item ${activePage === "home" ? "is-active" : ""}"
        href="/"
        data-page="home"
        role="tab"
        aria-selected="${activePage === "home"}"
      >
        首页
      </a>
      <a
        class="page-switch__item ${activePage === "showcase" ? "is-active" : ""}"
        href="/?scene=${sceneId}"
        data-page="showcase"
        role="tab"
        aria-selected="${activePage === "showcase"}"
      >
        展示
      </a>
      <a
        class="page-switch__item ${activePage === "train" ? "is-active" : ""}"
        href="/?page=train&scene=${sceneId}"
        data-page="train"
        role="tab"
        aria-selected="${activePage === "train"}"
      >
        训练
      </a>
      <a
        class="page-switch__item ${activePage === "history" ? "is-active" : ""}"
        href="/?page=history"
        data-page="history"
        role="tab"
        aria-selected="${activePage === "history"}"
      >
        历史
      </a>
    </div>
  `;
}

function buildTopbarPageTitle(pageLabel = "", pageDetail = "") {
  const label = escapeHtml(pageLabel);
  const detail = escapeHtml(pageDetail);
  return `
    <div class="topbar__page-title" aria-label="页面标题">
      <span class="topbar__page-pill">${label}</span>
      <span class="topbar__page-sep" aria-hidden="true"></span>
      <span class="topbar__page-desc">${detail}</span>
    </div>
  `;
}

function buildMethodVisual() {
  return `
    <div class="method-visual">
      <img class="method-visual__image" src="${megs2OverviewImage}" alt="MEGS² overview diagram" loading="lazy" />
    </div>
  `;
}

function buildLightweightAssetCards() {
  return LIGHTWEIGHT_ASSET_CARDS
    .map((card, index) => {
      const cardMarkup = `
        <article class="asset-save-card asset-save-card--${card.tone}" data-parallax-speed="${0.04 + index * 0.01}" data-parallax-max="${18 + index * 4}">
          <div class="asset-save-card__media ${card.mediaClassName || ""}">
            <div class="asset-save-card__frame ${card.mediaClassName || ""}">
              <img class="asset-save-card__image" src="${card.image}" alt="${card.imageAlt}" loading="lazy" />
            </div>
          </div>
          <div class="asset-save-card__body">
            <span class="asset-save-card__eyebrow">${card.eyebrow}</span>
            <h3>${card.title}</h3>
            <p class="asset-save-card__subtitle">${card.subtitle}</p>
            <p class="asset-save-card__copy">${card.copy}</p>
          </div>
        </article>
      `;

      if (index === LIGHTWEIGHT_ASSET_CARDS.length - 1) {
        return cardMarkup;
      }

      return `
        ${cardMarkup}
        <div class="asset-save-arrow" aria-hidden="true">
          <span class="asset-save-arrow__line"></span>
          <span class="asset-save-arrow__head"></span>
        </div>
      `;
    })
    .join("");
}

function buildShowcaseSceneCards(scenes, activeSceneId) {
  return scenes
    .map((scene) => {
      const preview = getScenePreviewMedia(scene);
      return `
        <button class="showcase-scene-card ${scene.id === activeSceneId ? "is-active" : ""}" type="button" data-scene-id="${scene.id}">
          <div class="showcase-scene-card__media">
            ${renderResponsiveMedia({
              src: preview,
              alt: `${scene.name} preview`,
              className: "showcase-scene-card__img",
              poster: scene.thumbnail,
            })}
            <span class="showcase-scene-card__veil"></span>
          </div>
          <div class="showcase-scene-card__meta">
            <strong>${scene.name}</strong>
            <span>${scene.dataset}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function buildShowcaseCarousel(scene, scenes) {
  const activeIndex = Math.max(
    0,
    scenes.findIndex((item) => item.id === scene.id),
  );
  const total = scenes.length;
  const previousScene = scenes[(activeIndex - 1 + total) % total];
  const nextScene = scenes[(activeIndex + 1) % total];

  return `
    <div class="showcase-carousel" id="showcase-carousel" data-active-index="${activeIndex}">
      <button class="showcase-carousel__nav" type="button" data-direction="prev" aria-label="Previous scene">
        <span aria-hidden="true">‹</span>
      </button>
      <div class="showcase-carousel__center">
        <div class="showcase-carousel__hint">
          <strong>${activeIndex + 1}</strong>
          <span>/</span>
          <strong>${total}</strong>
        </div>
        <div class="showcase-carousel__stage-card">
          <div class="showcase-carousel__edge">
            <span class="showcase-carousel__edge-label">Prev</span>
            <strong>${previousScene.name}</strong>
          </div>
          <div class="showcase-carousel__active-card">
            <div class="showcase-carousel__preview">
              ${renderResponsiveMedia({
                src: scene.thumbnail,
                alt: `${scene.name} preview`,
                className: "showcase-carousel__preview-media",
                poster: scene.thumbnail,
              })}
              <span class="showcase-carousel__preview-veil"></span>
            </div>
            <div class="showcase-carousel__active-meta">
              <strong>${scene.name}</strong>
              <span>${scene.dataset} · ${scene.imageCount ? `${scene.imageCount} images` : "Image count pending"}</span>
            </div>
          </div>
          <div class="showcase-carousel__edge showcase-carousel__edge--right">
            <span class="showcase-carousel__edge-label">Next</span>
            <strong>${nextScene.name}</strong>
          </div>
        </div>
      </div>
      <button class="showcase-carousel__nav" type="button" data-direction="next" aria-label="Next scene">
        <span aria-hidden="true">›</span>
      </button>
    </div>
  `;
}

function buildShowcaseFeature(scene) {
  const preview = getScenePreviewMedia(scene);
  const detailTags = [
    scene.dataset,
    `Iter ${scene.iteration / 1000}k`,
    scene.imageCount ? `${scene.imageCount} images` : "Image count pending",
  ];

  return `
    <div class="showcase-stage__media-shell" id="showcase-media-frame">
      ${renderResponsiveMedia({
        src: preview,
        alt: `${scene.name} stage preview`,
        className: "showcase-stage__media",
        poster: scene.thumbnail,
      })}
      <div class="showcase-stage__grid"></div>
      <div class="showcase-stage__pulse showcase-stage__pulse--a"></div>
      <div class="showcase-stage__pulse showcase-stage__pulse--b"></div>
      <div class="showcase-stage__scan"></div>
    </div>
    <div class="showcase-stage__content">
      <div class="showcase-stage__content-top">
        <div>
          <p class="showcase-stage__eyebrow">Featured Scene</p>
          <h3 id="showcase-title">${scene.name}</h3>
        </div>
        <a class="btn btn--outline showcase-stage__link" id="showcase-open-link" href="/?scene=${scene.id}">进入展示</a>
      </div>
      <p class="showcase-stage__desc" id="showcase-description">${scene.description}</p>
      <div class="showcase-stage__facts">
        ${detailTags
          .map(
            (tag, index) => `
              <div class="showcase-stage__fact">
                <span>${index === 0 ? "Dataset" : index === 1 ? "Checkpoint" : "Images"}</span>
                <strong>${tag}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="showcase-stage__tags" id="showcase-tags">${buildTagList(scene.tags || [], true)}</div>
    </div>
  `;
}

function buildWorkflowTabs(steps, activeIndex = 0) {
  return steps
    .map(
      (step, index) => `
        <button class="workflow-tab ${index === activeIndex ? "is-active" : ""}" type="button" data-step-index="${index}">
          <span class="workflow-tab__step">${step.step}</span>
          <span class="workflow-tab__text">
            <strong>${step.title}</strong>
            <span>${step.label}</span>
          </span>
        </button>
      `,
    )
    .join("");
}

function buildWorkflowCopy(step) {
  return `
    <p class="workflow-copy__eyebrow">${step.label}</p>
    <h3>${step.title}</h3>
    <p class="workflow-copy__summary">${step.summary}</p>
    <p class="workflow-copy__note">${step.note}</p>
  `;
}

function buildSceneSourceCopy(scene) {
  if (scene.imageCount) {
    return `来自 ${scene.sourceLabel || scene.dataset} 的 ${scene.sourceSceneName || scene.id}（${scene.name}）场景，共 ${scene.imageCount} 张输入图像。`;
  }

  return `来自 ${scene.sourceLabel || scene.dataset} 的 ${scene.sourceSceneName || scene.id}（${scene.name}）场景，本轮先展示压缩结果，本地输入图像待后续补充。`;
}

function buildSceneGallery(scene) {
  const images = Array.isArray(scene.galleryImages) ? scene.galleryImages : [];
  const initialImage = images[0] || scene.thumbnail;
  const hasCarousel = images.length > 1;
  const countText = hasCarousel ? `1 / ${images.length}` : images.length === 1 ? "1 / 1" : "Static Preview";
  const statusText = hasCarousel || images.length === 1 ? "本地输入图像预览" : "本地原图待补充";

  return `
    <div class="scene-gallery ${hasCarousel ? "" : "is-static"}" id="scene-gallery">
      <div class="scene-gallery__frame">
        <img
          id="scene-gallery-image"
          class="scene-gallery__image"
          src="${initialImage}"
          alt="${scene.name} gallery preview"
        />
        <div class="scene-gallery__veil"></div>
      </div>
      <div class="scene-gallery__footer">
        <div class="scene-gallery__meta">
          <strong>${statusText}</strong>
          <span id="scene-gallery-count">${countText}</span>
        </div>
        ${
          hasCarousel
            ? `
              <div class="scene-gallery__controls">
                <button type="button" class="scene-gallery__nav" id="scene-gallery-prev" aria-label="上一张">&lt;</button>
                <button type="button" class="scene-gallery__nav" id="scene-gallery-next" aria-label="下一张">&gt;</button>
              </div>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function buildSceneHighlightPanel(scene) {
  return `
    <section class="panel code-panel code-panel--expanded workspace-detail-panel">
      <h2>场景亮点</h2>
      <div class="scene-info-card scene-info-card--highlight">
        <div class="scene-info-block">
          <span class="scene-info-block__eyebrow">数据来源</span>
          <p>${buildSceneSourceCopy(scene)}</p>
        </div>
        <div class="scene-info-block">
          <span class="scene-info-block__eyebrow">场景说明</span>
          <p>${scene.summary || scene.description}</p>
        </div>
        ${buildSceneGallery(scene)}
        <div class="tag-row scene-info-card__tags">${buildTagList(scene.tags)}</div>
      </div>
    </section>
  `;
}

function setupSlimSceneGuideInteraction() {
  const sceneGuidePanel = document.getElementById("scene-guide-panel");
  const sceneGuideToggle = document.getElementById("scene-guide-toggle");
  if (!sceneGuidePanel || !sceneGuideToggle) return;
  if (sceneGuidePanel.dataset.boundSlimGuide === "true") return;
  sceneGuidePanel.dataset.boundSlimGuide = "true";

  sceneGuideToggle.addEventListener("click", () => {
    const nextCollapsed = !sceneGuidePanel.classList.contains("is-collapsed");
    sceneGuidePanel.classList.toggle("is-collapsed", nextCollapsed);
    sceneGuideToggle.textContent = nextCollapsed ? "展开" : "收起";
    sceneGuideToggle.setAttribute("aria-expanded", String(!nextCollapsed));
  });
}

function buildPerformanceSummary() {
  return `
    <div class="perf-summary" id="perf-summary">
      <div class="perf-summary__item perf-summary__item--live">
        <div class="perf-summary__row">
          <strong>当前显存占用</strong>
          <span class="perf-summary__value" id="gpu-memory-value">--</span>
        </div>
        <p id="gpu-name-copy">正在连接本地 GPU 状态...</p>
      </div>
      <div class="perf-summary__item perf-summary__item--live">
        <div class="perf-summary__row">
          <strong>GPU 利用率</strong>
          <span class="perf-summary__value" id="gpu-util-value">--</span>
        </div>
        <p>实时读取当前图形处理器的忙碌程度。</p>
      </div>
      <div class="perf-summary__item perf-summary__item--live perf-summary__item--accent">
        <div class="perf-summary__row">
          <strong>FPS 帧数</strong>
          <span class="perf-summary__value" id="gpu-fps-value">--</span>
        </div>
        <p id="gpu-refresh-copy">等待 viewer 回传实时帧率...</p>
      </div>
    </div>
  `;
}

function stripAnsiText(text = "") {
  return String(text).replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function getLogTailExcerpt(logs = "", lineCount = 8) {
  return stripAnsiText(logs)
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-lineCount)
    .join("\n");
}

function persistActiveWorkspaceJobId(jobId) {
  try {
    if (jobId) {
      localStorage.setItem(ACTIVE_WORKSPACE_JOB_STORAGE_KEY, String(jobId));
    } else {
      localStorage.removeItem(ACTIVE_WORKSPACE_JOB_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function readPersistedActiveWorkspaceJobId() {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_JOB_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function buildTrainingProgressPanel() {
  return `
    <div class="training-progress-card" id="training-progress-card">
      <div class="training-progress-card__head">
        <div class="training-progress-card__title-wrap">
          <span class="training-progress-card__eyebrow">REAL-TIME TRAINING</span>
          <strong id="training-progress-phase">等待任务启动</strong>
        </div>
        <span class="training-progress-card__percent" id="training-progress-percent">0%</span>
      </div>
      <div class="training-progress-card__bar">
        <span id="training-progress-bar"></span>
      </div>
	      <div class="training-progress-card__meta">
	        <span id="training-progress-iteration" style="display:none;"></span>
	        <span id="training-progress-state">尚未提交任务</span>
	      </div>
	    </div>
	  `;
	}

function buildTrainingRuntimePanel() {
  return `
    <section class="panel training-runtime-panel" id="training-runtime-panel" style="display: none;">
      <h2>训练实时状态</h2>
      <div class="training-runtime-grid">
        <div class="training-runtime-item">
          <span>当前损失</span>
          <strong id="training-runtime-loss">--</strong>
          <small>实时读取训练输出中的 Loss。</small>
        </div>
        <div class="training-runtime-item">
          <span>当前速度</span>
          <strong id="training-runtime-speed">--</strong>
          <small>按迭代速度估算训练吞吐。</small>
        </div>
        <div class="training-runtime-item">
          <span>预计剩余</span>
          <strong id="training-runtime-eta">--</strong>
          <small>来自训练进度条中的剩余时间。</small>
        </div>
      </div>
    </section>
  `;
}

function stopGpuSummaryPolling() {
  if (gpuSummaryPollTimer) {
    clearInterval(gpuSummaryPollTimer);
    gpuSummaryPollTimer = null;
  }
}

async function refreshGpuSummary() {
  const memoryEl = document.getElementById("gpu-memory-value");
  const utilEl = document.getElementById("gpu-util-value");
  const fpsEl = document.getElementById("gpu-fps-value");
  const nameCopyEl = document.getElementById("gpu-name-copy");
  const refreshCopyEl = document.getElementById("gpu-refresh-copy");
  if (!memoryEl || !utilEl || !fpsEl) return;

  const liveFps = Number(window.focusGSRuntimeStats?.fps);
  const jobStatus = window.focusGSWorkspaceRuntime?.jobStatus || "idle";
  const isTrainingJob = jobStatus === "queued" || jobStatus === "running" || jobStatus === "cancelling";
  fpsEl.textContent = !isTrainingJob && Number.isFinite(liveFps) && liveFps > 0 ? `${liveFps}` : "--";

  try {
    const response = await fetch("/api/local-gpu", { cache: "no-store" });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("LOCAL_GPU_ENDPOINT_MISSING");
    }

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload?.message || "GPU metrics unavailable");
    }

    memoryEl.textContent = `${payload.memoryUsedMB} / ${payload.memoryTotalMB} MB`;
    utilEl.textContent = `${payload.utilizationGPU}%`;
    if (nameCopyEl) nameCopyEl.textContent = payload.name;

    if (refreshCopyEl) {
      const stamp = new Date(payload.timestamp);
      const fpsText = !isTrainingJob && Number.isFinite(liveFps) && liveFps > 0 ? ` · FPS ${liveFps}` : "";
      refreshCopyEl.textContent = `上次刷新 ${stamp.getHours().toString().padStart(2, "0")}:${stamp.getMinutes().toString().padStart(2, "0")}:${stamp.getSeconds().toString().padStart(2, "0")}${fpsText}`;
    }
  } catch (error) {
    memoryEl.textContent = "--";
    utilEl.textContent = "--";
    if (nameCopyEl) {
      nameCopyEl.textContent =
        error instanceof Error && error.message === "LOCAL_GPU_ENDPOINT_MISSING"
          ? "本地 GPU 接口未生效，请重启 4173 开发服务。"
          : "当前环境无法读取本地 GPU 状态。";
    }
    if (refreshCopyEl) {
      refreshCopyEl.textContent =
        error instanceof Error && error.message === "LOCAL_GPU_ENDPOINT_MISSING"
          ? "重启 `npm run dev` 或 `vite preview` 后，这里就会显示实时显存。"
          : "请确认本机可直接执行 nvidia-smi。";
    }
  }
}

function setupGpuSummary() {
  stopGpuSummaryPolling();
  if (!document.getElementById("perf-summary")) return;

  refreshGpuSummary();
  gpuSummaryPollTimer = window.setInterval(refreshGpuSummary, 3000);
}

function buildWorkflowVisual(step) {
  if (step.mediaSrc) {
    const media = renderResponsiveMedia({
      src: step.mediaSrc,
      alt: `${step.title} preview`,
      className: "workflow-media__asset",
    });
    if (media) {
      return media;
    }
  }

  return `
    <div class="workflow-fallback workflow-fallback--${step.visual}">
      <div class="workflow-fallback__surface"></div>
      <div class="workflow-fallback__core"></div>
      <div class="workflow-fallback__lines">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="workflow-fallback__tiles">
        <i></i>
        <i></i>
        <i></i>
      </div>
    </div>
  `;
}

function stopWorkflowAutoAdvance() {
  if (workflowAutoAdvanceTimer) {
    clearInterval(workflowAutoAdvanceTimer);
    workflowAutoAdvanceTimer = null;
  }
  if (workflowAutoAdvanceObserver) {
    workflowAutoAdvanceObserver.disconnect();
    workflowAutoAdvanceObserver = null;
  }
}

function updateShowcaseFeature(scene) {
  const featureRoot = document.getElementById("showcase-feature");
  if (!featureRoot || !scene) return;

  featureRoot.innerHTML = buildShowcaseFeature(scene);
  setupParallax();
}

function updateShowcaseCarousel(scene, scenes) {
  const carouselRoot = document.getElementById("showcase-carousel-shell");
  if (!carouselRoot || !scene) return;
  carouselRoot.innerHTML = buildShowcaseCarousel(scene, scenes);
}

function updateWorkflowStage(index, steps = HOME_PIPELINE_STEPS) {
  const boundedIndex = (index + steps.length) % steps.length;
  const activeStep = steps[boundedIndex];
  const tabs = document.querySelectorAll(".workflow-tab");
  const copy = document.getElementById("workflow-copy");
  const media = document.getElementById("workflow-media");
  const shell = document.querySelector(".workflow-shell");

  if (!copy || !media || !shell) return;

  shell.dataset.activeIndex = String(boundedIndex);
  tabs.forEach((tab, tabIndex) => {
    tab.classList.toggle("is-active", tabIndex === boundedIndex);
  });

  copy.innerHTML = buildWorkflowCopy(activeStep);
  media.innerHTML = buildWorkflowVisual(activeStep);
}

function setupShowcaseInteraction(scenes) {
  const carouselShell = document.getElementById("showcase-carousel-shell");
  if (!carouselShell) return;

  carouselShell.addEventListener("click", (event) => {
    const navButton = event.target.closest(".showcase-carousel__nav");
    if (!navButton) return;

    const carousel = document.getElementById("showcase-carousel");
    const currentIndex = Number(carousel?.dataset.activeIndex || 0);
    const direction = navButton.dataset.direction;
    const nextIndex =
      direction === "prev"
        ? (currentIndex - 1 + scenes.length) % scenes.length
        : (currentIndex + 1) % scenes.length;
    const scene = scenes[nextIndex];
    if (!scene) return;

    updateShowcaseFeature(scene);
    updateShowcaseCarousel(scene, scenes);
  });
}

function setupWorkflowInteraction(steps = HOME_PIPELINE_STEPS) {
  stopWorkflowAutoAdvance();

  const workflow = document.getElementById("workflow");
  const tabs = document.getElementById("workflow-tabs");
  if (!workflow || !tabs) return;

  const activate = (index) => updateWorkflowStage(index, steps);

  tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".workflow-tab");
    if (!tab) return;

    activate(Number(tab.dataset.stepIndex));
  });

  const startCycle = () => {
    if (workflowAutoAdvanceTimer) return;
    workflowAutoAdvanceTimer = setInterval(() => {
      const currentIndex = Number(document.querySelector(".workflow-shell")?.dataset.activeIndex || 0);
      activate(currentIndex + 1);
    }, 20000);
  };

  const pauseCycle = () => {
    if (!workflowAutoAdvanceTimer) return;
    clearInterval(workflowAutoAdvanceTimer);
    workflowAutoAdvanceTimer = null;
  };

  workflowAutoAdvanceObserver = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        startCycle();
      } else {
        pauseCycle();
      }
    },
    {
      threshold: 0.45,
    },
  );

  workflowAutoAdvanceObserver.observe(workflow);
}

// ---- 构建历史任务面板 HTML ----
function buildHistoryPanel(tasks) {
  if (!tasks || tasks.length === 0) {
    return `
      <div class="history-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>暂无历史记录</span>
      </div>
    `;
  }

  const rows = tasks
    .map((task) => {
      const { cls, label } = getStatusMeta(task.status);
      const currentIteration = Number(task.currentIteration) || 0;
      const totalIterations = Number(task.totalIterations) || Number(task.parameterValues?.iterations) || 30000;
      const progressLabel = currentIteration > 0 ? `${currentIteration} / ${totalIterations} iter` : `${totalIterations} iter`;
      const checkpointLabel = task.hasCheckpoint
        ? `checkpoint ${task.latestCheckpointIteration || "可用"}`
        : "无 checkpoint";
      const errorText = task.error || task.message || "无可用日志摘要";
      const parameterSummary = [
        task.inputImageDir ? `图像目录 ${task.inputImageDir}` : null,
        task.sparseRoot ? `稀疏模型 ${task.sparseRoot}` : null,
        task.mode ? `输入 ${task.mode}` : null,
      ].filter(Boolean);
      const metricsHtml = `
        <div class="history-detail__metrics">
          <span><em>进度</em>${progressLabel}</span>
          <span><em>状态</em>${label}</span>
          <span><em>续训</em>${checkpointLabel}</span>
        </div>
      `;
      const detailText = task.status === "failed"
        ? errorText
        : task.message || "任务已完成，可查看输出结果。";
      const actionButton = task.canResume
        ? `
          <button class="btn btn--xs btn--ghost history-action-btn" type="button" data-history-action="resume" data-job-id="${task.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><polyline points="21 3 21 9 15 9"/></svg>
            断点续训
          </button>
        `
        : "";

      return `
        <div class="history-item" data-id="${task.id}">
          <div class="history-item__row">
            <span class="status-dot ${cls}" title="${label}"></span>
            <div class="history-item__info">
              <strong class="history-item__name">${task.runName}</strong>
              <span class="history-item__meta">${progressLabel} · ${task.duration || "—"}</span>
            </div>
            <span class="history-item__date">${formatDate(task.createdAt)}</span>
            <button class="history-item__toggle" aria-label="展开详情">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div class="history-item__detail">
            <div class="history-detail__inner">
              ${metricsHtml}
              <div class="history-detail__summary">
                <p>${detailText}</p>
                <div class="history-detail__chips">${parameterSummary.map((item) => `<span>${item}</span>`).join("")}</div>
              </div>
              <div class="history-detail__footer">
                <span class="history-detail__status status-pill--${task.status}">${label}</span>
                <div class="history-detail__actions">
                  ${actionButton}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `<div class="history-list">${rows}</div>`;
}

// ---- 绑定历史任务的展开/折叠交互 ----
function setupHistoryInteraction() {
  const panel = document.querySelector(".history-panel");
  if (!panel || panel.dataset.boundHistory === "true") return;
  panel.dataset.boundHistory = "true";

  panel.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest(".history-item__toggle");
    const row = e.target.closest(".history-item__row");
    if (!toggleBtn && !row) return;
    if (e.target.closest(".history-action-btn")) return;

    const item = e.target.closest(".history-item");
    if (!item) return;

    const isOpen = item.classList.contains("is-open");
    panel.querySelectorAll(".history-item.is-open").forEach((el) => el.classList.remove("is-open"));
    if (!isOpen) item.classList.add("is-open");
  });
}

function buildResumeDialog(task) {
  const latestIteration = Number(task?.latestCheckpointIteration) || 0;
  const defaultAdditionalIterations = 5000;
  return `
    <div class="history-resume-modal is-visible" id="history-resume-modal" aria-hidden="false">
      <div class="history-resume-modal__backdrop" data-history-modal-close="true"></div>
      <div class="history-resume-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="history-resume-title">
        <div class="history-resume-modal__head">
          <div>
            <p class="history-resume-modal__eyebrow">RESUME TRAINING</p>
            <h3 id="history-resume-title">${task.runName}</h3>
          </div>
          <button type="button" class="history-resume-modal__close" data-history-modal-close="true" aria-label="关闭">×</button>
        </div>
        <div class="history-resume-modal__body">
          <div class="history-resume-modal__meta">
            <span>当前可续训 checkpoint</span>
            <strong>iteration ${latestIteration || "--"}</strong>
          </div>
          <div class="history-resume-modal__field">
            <label for="resume-iteration-select">续训起点</label>
            <select id="resume-iteration-select" class="workspace-params-input">
              ${(task.checkpointIterations || []).map((iteration) => `<option value="${iteration}" ${iteration === latestIteration ? "selected" : ""}>iteration ${iteration}</option>`).join("")}
            </select>
          </div>
          <div class="history-resume-modal__field">
            <label for="resume-additional-iterations">追加训练轮数</label>
            <input id="resume-additional-iterations" class="workspace-params-input" type="number" min="1000" step="1000" value="${defaultAdditionalIterations}" />
          </div>
          <div class="history-resume-modal__field">
            <label for="resume-output-mode">输出方式</label>
            <select id="resume-output-mode" class="workspace-params-input">
              <option value="new-dir" selected>新建续训输出目录</option>
              <option value="reuse-dir">复用原输出目录</option>
            </select>
          </div>
        </div>
        <div class="history-resume-modal__actions">
          <button type="button" class="workspace-params-submit history-resume-modal__cancel" data-history-modal-close="true">取消</button>
          <button type="button" class="workspace-params-submit" id="history-resume-submit" data-job-id="${task.id}">开始续训</button>
        </div>
      </div>
    </div>
  `;
}

function buildExportDemoDialog(sceneName = "counter") {
  const runtime = EXPORT_DEMO_DATA.runtime;
  const cards = [
    {
      label: "Final Loss",
      value: runtime.finalLoss,
      note: "训练完成时记录的最终损失",
    },
    {
      label: "Training Time",
      value: runtime.trainingTime,
      note: "本轮完整训练与导出耗时",
    },
    {
      label: "Output Size",
      value: runtime.outputSize,
      note: "原始 Gaussian 结果目录体积",
    },
    {
      label: "Compressed Size",
      value: runtime.compressedSize,
      note: "面向网页展示的轻量化资产体积",
    },
    {
      label: "Compression Ratio",
      value: runtime.compressionRatio,
      note: "结果压缩后的体积下降幅度",
    },
    {
      label: "Saved Path",
      value: "Local Export",
      note: runtime.compressedPath,
    },
  ];

  return `
    <div class="export-demo-modal is-visible" id="export-demo-modal" aria-hidden="false">
      <div class="export-demo-modal__backdrop" data-export-demo-close="true"></div>
      <div class="export-demo-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="export-demo-title">
        <div class="export-demo-modal__hero">
          <div class="export-demo-modal__copy">
            <p class="export-demo-modal__eyebrow">RESULT EXPORT</p>
            <h3 id="export-demo-title">导出完成</h3>
            <p class="export-demo-modal__lead">${sceneName} 的轻量化结果资产已保存到本地目录，可直接用于网页加载、快速预览与后续复用。</p>
            <div class="export-demo-modal__paths">
              <div>
                <span>轻量化输出目录</span>
                <code>${runtime.compressedPath}</code>
              </div>
            </div>
          </div>
          <button type="button" class="export-demo-modal__close" data-export-demo-close="true" aria-label="关闭">×</button>
        </div>
        <div class="export-demo-modal__metrics">
          ${cards.map((card) => `
            <article class="export-demo-card">
              <span class="export-demo-card__label">${card.label}</span>
              <strong class="export-demo-card__value">${card.value}</strong>
              <p class="export-demo-card__note">${card.note}</p>
            </article>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function buildTrainingCompletionDialog({ sceneId = "garden", job = {} } = {}) {
  const jobId = job?.id || "";
  const sceneName = job?.sceneName || sceneId || "scene";
  const outputPath = job?.modelPath || "";
  const logPath = job?.logPath || "";
  const preview = job?.preview || null;

  const detailLines = [
    jobId ? `job_id=${jobId}` : "",
    outputPath ? `output=${outputPath}` : "",
    logPath ? `log=${logPath}` : "",
    preview?.filePath ? `preview=${preview.filePath}` : "",
  ].filter(Boolean);

  return `
    <div class="export-demo-modal is-visible" id="train-done-modal" aria-hidden="false">
      <div class="export-demo-modal__backdrop" data-history-modal-close="true"></div>
      <div class="export-demo-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="train-done-title">
        <div class="export-demo-modal__hero">
          <div class="export-demo-modal__copy">
            <p class="export-demo-modal__eyebrow">TRAINING COMPLETE</p>
            <h3 id="train-done-title">训练完成</h3>
            <p class="export-demo-modal__lead">${sceneName} 的训练已结束，结果与日志已保存到本地。你可以去「历史」页面查看本次任务详情、输出路径与后续续训入口。</p>
            ${detailLines.length ? `
              <div class="export-demo-modal__paths">
                <div>
                  <span>本次任务</span>
                  <code>${detailLines.join("\n")}</code>
                </div>
              </div>
            ` : ""}
            <div style="margin-top: 14px; display:flex; gap:10px; flex-wrap:wrap;">
              <a class="btn btn--primary" href="/?page=history&scene=${sceneId}&job=${encodeURIComponent(jobId)}&tab=overview" style="text-decoration:none;">去历史与结果</a>
              <button type="button" class="btn btn--outline" data-history-modal-close="true">继续留在训练页</button>
            </div>
          </div>
          <button type="button" class="export-demo-modal__close" data-history-modal-close="true" aria-label="关闭">×</button>
        </div>
      </div>
    </div>
  `;
}

function getTimelineItemStatusClass(status = "pending") {
  return `timeline-item is-${status}`;
}

function buildWorkspaceTimelineMarkup(modeConfig, progressIndex = -1) {
  const steps = modeConfig.timelineSteps
    .map((step, index) => {
      const status = progressIndex < 0 ? "pending" : index < progressIndex ? "success" : index === progressIndex ? "running" : "pending";
      return `
        <div class="${getTimelineItemStatusClass(status)}">
          <div class="timeline-marker"></div>
          <div class="timeline-content">
            <strong>${step.title}</strong>
            <p>${step.detail}</p>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <h2>阶段时间线</h2>
    <div class="timeline">${steps}</div>
  `;
}

function buildWorkspaceTimelineInlineMarkup(modeConfig, progressIndex = -1) {
  const steps = modeConfig.timelineSteps
    .map((step, index) => {
      const status = progressIndex < 0 ? "pending" : index < progressIndex ? "success" : index === progressIndex ? "running" : "pending";
      const statusClass =
        status === "success" ? "is-success" : status === "running" ? "is-running" : "is-pending";
      return `
        <div class="train-timeline-step ${statusClass}" title="${step.detail}">
          <div class="train-timeline-step__dot" aria-hidden="true"></div>
          <div class="train-timeline-step__meta">
            <span class="train-timeline-step__index">${index + 1}</span>
            <strong class="train-timeline-step__title">${step.title}</strong>
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <section class="train-timeline" aria-label="阶段时间线">
      <div class="train-timeline__rail">
        ${steps}
      </div>
    </section>
  `;
}

function buildWorkspaceParameterField(item, value, isLocked = false) {
  const inputId = `workspace-param-${item.key}`;
  const recommendation = item.recommendation ? `<span class="workspace-params-item__recommend">${item.recommendation}</span>` : "";
  const disabledAttr = isLocked ? "disabled" : "";

  let control = "";
  if (item.type === "select") {
    control = `
      <select class="workspace-params-input" id="${inputId}" data-param-key="${item.key}" ${disabledAttr}>
        ${item.options
          .map((option) => `<option value="${option}" ${String(value) === String(option) ? "selected" : ""}>${option}</option>`)
          .join("")}
      </select>
    `;
  } else if (item.type === "checkbox") {
    control = `
      <label class="workspace-params-toggle ${isLocked ? "is-disabled" : ""}">
        <input type="checkbox" id="${inputId}" data-param-key="${item.key}" ${value ? "checked" : ""} ${disabledAttr} />
        <span>${value ? "已开启" : "已关闭"}</span>
      </label>
    `;
  } else {
    const min = item.min != null ? `min="${item.min}"` : "";
    const max = item.max != null ? `max="${item.max}"` : "";
    const step = item.step != null ? `step="${item.step}"` : "";
    const type = item.type === "text" ? "text" : "number";
    control = `
      <input
        class="workspace-params-input"
        id="${inputId}"
        data-param-key="${item.key}"
        type="${type}"
        value="${value}"
        ${disabledAttr}
        ${min}
        ${max}
        ${step}
      />
    `;
  }

  return `
    <div class="workspace-params-item">
      <div class="workspace-params-item__meta">
        <label class="workspace-params-item__label" for="${inputId}">${item.label}</label>
        ${recommendation}
      </div>
      <div class="workspace-params-item__control">
        ${control}
      </div>
    </div>
  `;
}

function buildWorkspaceParameterSnapshot(modeKey = "images", parameterValues = {}, context = {}) {
  return getWorkspaceParameterPreset(modeKey, context).map((group) => ({
    section: group.title,
    tag: group.badge,
    items: group.items.map((item) => ({
      key: item.key,
      label: item.label,
      value: parameterValues[item.key],
      recommendation: item.recommendation || "",
    })),
  }));
}

function buildWorkspaceParamsMarkup(modeKey = "images", parameterValues = {}, canStartTask = false, context = {}, isLocked = false) {
  const groups = getWorkspaceParameterPreset(modeKey, context);
  const groupMarkup = groups
    .map(
      (group) => `
        <div class="workspace-params-group">
          <div class="workspace-params-group__head">
            <strong>${group.title}</strong>
            <span>${group.badge}</span>
          </div>
          <div class="workspace-params-grid">
            ${group.items.map((item) => buildWorkspaceParameterField(item, parameterValues[item.key] ?? item.defaultValue, isLocked)).join("")}
          </div>
        </div>
      `,
    )
    .join("");

  return `
    <div class="workspace-params-header">
      <h2>重建参数</h2>
    </div>
    <div class="workspace-params-actions">
      <button
        type="button"
        class="workspace-params-submit"
        id="workspace-start-training"
        ${canStartTask ? "" : "disabled"}
      >
        开始重建
      </button>
      <button
        type="button"
        class="workspace-params-submit"
        id="workspace-cancel-training"
        disabled
      >
        中断重建
      </button>
    </div>
    <div class="workspace-params-body">${groupMarkup}</div>
  `;
}

function buildWorkspaceJobPayload({ modeConfig, sceneName, selectionSummary, status = "idle", progressIndex = -1, parameterValues = {}, parameterContext = {}, runtimeMeta = {} }) {
  const effectiveModeConfig = runtimeMeta?.timeline_mode === "resume" ? WORKSPACE_RESUME_TIMELINE : modeConfig;
  const currentStep = progressIndex >= 0 ? effectiveModeConfig.timelineSteps[progressIndex]?.title || null : null;

  const payload = {
    file: modeConfig.jobTitle,
    input_mode: modeConfig.key,
    scene: sceneName,
    status,
    selection: selectionSummary || "尚未选择输入源",
    current_step: currentStep,
    parameter_profile: buildWorkspaceParameterSnapshot(modeConfig.key, parameterValues, parameterContext),
    workflow: effectiveModeConfig.timelineSteps.map((step, index) => ({
      index: index + 1,
      title: step.title,
      detail: step.detail,
      state: progressIndex < 0 ? "pending" : index < progressIndex ? "success" : index === progressIndex ? "running" : "pending",
    })),
  };

  if (runtimeMeta && Object.keys(runtimeMeta).length) {
    payload.runtime = runtimeMeta;
  }

  return payload;
}

function setWorkspaceJobPreview({
  modeConfig,
  sceneName,
  selectionSummary,
  status = "idle",
  progressIndex = -1,
  logBadgeText = "",
  parameterValues = {},
  parameterContext = {},
  runtimeMeta = {},
}) {
  const codeBlock = document.getElementById("json-log-content");
  const logBadge = document.getElementById("log-status-badge");
  if (codeBlock) {
    const hasRuntimeLogs = Boolean(runtimeMeta?.log_excerpt)
      || (Array.isArray(runtimeMeta?.log_tail) && runtimeMeta.log_tail.length);
    // When a real job is running/queued/etc, prefer showing training logs.
    // During idle, show the job.json preview so users can inspect the payload snapshot.
    if (status && status !== "idle" && hasRuntimeLogs) {
      const excerpt = runtimeMeta?.log_excerpt;
      const tail = Array.isArray(runtimeMeta?.log_tail) ? runtimeMeta.log_tail.join("\n") : "";
      codeBlock.textContent = (excerpt || tail || "等待首批训练日志...").trim();
    } else {
      codeBlock.textContent = JSON.stringify(
        buildWorkspaceJobPayload({
          modeConfig,
          sceneName,
          selectionSummary,
          status,
          progressIndex,
          parameterValues,
          parameterContext,
          runtimeMeta,
        }),
        null,
        2,
      );
    }
  }

  if (logBadge) {
    const badgeClass =
      status === "success"
        ? "status-dot--success"
        : status === "running"
          ? "status-dot--running"
          : status === "cancelling"
            ? "status-dot--cancelled"
          : status === "cancelled"
            ? "status-dot--cancelled"
          : status === "failed"
            ? "status-dot--failed"
            : "status-dot--queued";
    logBadge.innerHTML = `<span class="status-dot ${badgeClass}"></span> ${
      logBadgeText
        || (status === "running"
          ? "正在处理"
          : status === "cancelling"
            ? "正在中断"
          : status === "cancelled"
            ? "任务已中断"
            : status === "success"
              ? "任务完成"
              : status === "failed"
                ? "输入检查失败"
                : "等待任务启动")
    }`;
  }
}

function isImageFile(file) {
  return file?.type?.startsWith("image/") || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(file?.name || "");
}

function isVideoFile(file) {
  return file?.type?.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(file?.name || "");
}

function hasColmapStructure(files = []) {
  const normalized = files.map((file) => (file.webkitRelativePath || file.name || "").replaceAll("\\", "/").toLowerCase());
  const hasCameras = normalized.some((path) => path.includes("sparse/0/cameras.bin") || path.endsWith("cameras.bin") || path.includes("sparse/0/cameras.txt"));
  const hasImages = normalized.some((path) => path.includes("sparse/0/images.bin") || path.endsWith("images.bin") || path.includes("sparse/0/images.txt"));
  const hasPoints = normalized.some((path) => path.includes("sparse/0/points3d.bin") || path.endsWith("points3d.bin") || path.includes("sparse/0/points3d.txt"));
  return hasCameras && hasImages && hasPoints;
}

function isColmapImageDirName(name = "") {
  return /^images(?:[_-]?\d+)?$/i.test(name) || name.toLowerCase() === "images";
}

function detectColmapImageDirs(files = []) {
  const found = new Map();

  files.forEach((file) => {
    if (!isImageFile(file)) return;
    const relativePath = (file.webkitRelativePath || file.name || "").replaceAll("\\", "/");
    const parts = relativePath.split("/").filter(Boolean);
    const dirName = parts.slice(0, -1).find((part) => isColmapImageDirName(part));
    if (!dirName) return;
    found.set(dirName.toLowerCase(), dirName);
  });

  return Array.from(found.values()).sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
}

function analyzeColmapInput(files = []) {
  const imageDirs = detectColmapImageDirs(files);
  const relativeSamples = files.map((file) => file.webkitRelativePath || file.name || "").filter(Boolean);
  const rootName = relativeSamples[0]?.split("/")[0] || files[0]?.name || "未命名目录";

  return {
    rootName,
    hasSparse: hasColmapStructure(files),
    imageDirs,
  };
}

function summarizeSelectedInput(modeKey, files = []) {
  if (!files.length) return "尚未选择输入源";

  if (modeKey === "video") {
    return `已选择视频：${files[0]?.name || "未命名文件"}`;
  }

  const relativeSamples = files.map((file) => file.webkitRelativePath || file.name || "").filter(Boolean);
  const rootName = relativeSamples[0]?.split("/")[0] || files[0]?.name || "未命名目录";

  if (modeKey === "colmap") {
    const analysis = analyzeColmapInput(files);
    if (!analysis.hasSparse) {
      return `目录 ${rootName} 缺少 sparse/0 关键结构`;
    }
    if (!analysis.imageDirs.length) {
      return `目录 ${rootName} 缺少可用图像目录（images / images_2 / images_4 / images_8）`;
    }
    return `已选择 COLMAP 工程：${rootName} · 检测到 ${analysis.imageDirs.length} 个图像目录`;
  }

  const imageCount = files.filter(isImageFile).length;
  return `已选择图片目录：${rootName} · ${imageCount} 张图片`;
}

function readWorkspaceParamControlValue(target) {
  if (target instanceof HTMLInputElement) {
    if (target.type === "checkbox") return target.checked;
    if (target.type === "number") return target.value === "" ? "" : Number(target.value);
  }
  return target.value;
}

async function readAllDirectoryEntries(entry) {
  if (!entry) return [];
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => {
        Object.defineProperty(file, "webkitRelativePath", {
          configurable: true,
          value: entry.fullPath?.replace(/^\//, "") || file.name,
        });
        resolve([file]);
      });
    });
  }

  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const entries = [];

  async function readChunk() {
    return new Promise((resolve) => {
      reader.readEntries(async (chunk) => {
        if (!chunk.length) {
          resolve();
          return;
        }
        entries.push(...chunk);
        await readChunk();
        resolve();
      });
    });
  }

  await readChunk();
  const nested = await Promise.all(entries.map((child) => readAllDirectoryEntries(child)));
  return nested.flat();
}

async function collectDropzoneFiles(event) {
  const items = Array.from(event.dataTransfer?.items || []);
  const entries = items
    .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
    .filter(Boolean);

  if (entries.length) {
    const files = await Promise.all(entries.map((entry) => readAllDirectoryEntries(entry)));
    return files.flat();
  }

  return Array.from(event.dataTransfer?.files || []);
}

// ---- 绑定工作台任务交互模拟 ----
function setupWorkspaceInteraction(selectedScene) {
  const workspaceState = {
    mode: "images",
    modeActivated: false,
    sceneGuideCollapsed: false,
    selectedFiles: [],
    selectionMeta: {},
    selectionSummary: "尚未选择输入源",
    paramValues: getWorkspaceDefaultParamValues("images"),
    colmapImageDirs: [],
    jobStatus: "idle",
    progressIndex: -1,
    logBadgeText: "图片目录模式待命",
    simulationTimer: null,
    pollTimer: null,
    fakeProgressTimer: null,
    activeJobId: null,
    isSubmitting: false,
    runtimeMeta: {},
    submissionAbortController: null,
    previewIteration: null,
    previewReady: false,
    historyTasks: [],
    resumeSubmitting: false,
    exportDemoPhase: null,
    exportDemoTimer: null,
    completionModalShownJobId: null,
  };
  // Prevent unnecessary rerenders: only rebuild the params DOM when lock-state flips.
  let lastParamsLocked = null;

  // 1. 中间 Viewer/Log Tabs 切换
  const tabViewer = document.getElementById("tab-viewer");
  const tabLog = document.getElementById("tab-log");
  const viewStage = document.getElementById("view-stage");
  const logStage = document.getElementById("log-stage");
  const sceneGuidePanel = document.getElementById("scene-guide-panel");
  const sceneGuideToggle = document.getElementById("scene-guide-toggle");
  const workspaceViewerOverlay = document.getElementById("workspace-viewer-overlay");
  const workspaceViewerExpandBtn = document.getElementById("workspace-expand-scene-guide");
  const timelinePanel =
    document.getElementById("timeline-panel")
    || document.getElementById("train-timeline-inline");
  const paramsPanel = document.getElementById("workspace-params-panel");
  const detailPanels = document.querySelectorAll(".workspace-detail-panel");
  const segmentButtons = Array.from(document.querySelectorAll(".segment[data-input-mode]"));
  const inputLabel = document.getElementById("workspace-input-label");
  const dropzone = document.querySelector(".upload-dropzone");
  const dropzoneTitle = document.getElementById("upload-dropzone-title");
  const dropzoneHint = document.getElementById("upload-dropzone-hint");
  const dropzoneStatus = document.getElementById("upload-dropzone-status");
  const sceneNameInput = document.getElementById("workspace-scene-name");
  const folderInput = document.getElementById("workspace-folder-input");
  const videoInput = document.getElementById("workspace-video-input");
  const historyPanelContent = document.getElementById("history-panel-content");
  const historyCount = document.getElementById("history-count");
  const historyModalRoot = document.getElementById("history-modal-root");

  function getWorkspaceParameterContext() {
    return {
      colmapImageDirs: workspaceState.colmapImageDirs,
    };
  }

  function getWorkspaceSceneName() {
    return sceneNameInput?.value?.trim() || selectedScene.id;
  }

  function getResolvedWorkspaceSceneName(fallback = "") {
    return (
      workspaceState.runtimeMeta?.resolved_scene_name
      || workspaceState.selectionMeta?.rootName
      || fallback
      || getWorkspaceSceneName()
    );
  }

  function hasActiveWorkspaceJob() {
    return Boolean(workspaceState.activeJobId);
  }

  function isWorkspaceParamsLocked() {
    // Keep original intent: lock hyper-params while submitting or when a job is active/cancelling.
    // The Start/Cancel buttons remain controlled by `updateStartButtonState()`.
    return workspaceState.isSubmitting || hasActiveWorkspaceJob() || workspaceState.jobStatus === "cancelling";
  }

  function clearActiveWorkspaceJob() {
    workspaceState.activeJobId = null;
    persistActiveWorkspaceJobId("");
  }

  function updateHistoryPanel(tasks = workspaceState.historyTasks) {
    workspaceState.historyTasks = Array.isArray(tasks) ? tasks : [];
    if (historyPanelContent) {
      historyPanelContent.innerHTML = buildHistoryPanel(workspaceState.historyTasks);
    }
    if (historyCount) {
      historyCount.textContent = `${workspaceState.historyTasks.length} 条`;
    }
  }

  function closeHistoryResumeModal() {
    if (historyModalRoot) {
      historyModalRoot.innerHTML = "";
    }
    workspaceState.resumeSubmitting = false;
  }

  function openHistoryResumeModal(task) {
    if (!historyModalRoot) return;
    historyModalRoot.innerHTML = buildResumeDialog(task);
  }

  function clearExportDemoTimer() {
    if (workspaceState.exportDemoTimer) {
      window.clearTimeout(workspaceState.exportDemoTimer);
      workspaceState.exportDemoTimer = null;
    }
  }

  function closeExportDemoModal() {
    const modal = historyModalRoot?.querySelector("#export-demo-modal");
    if (modal) modal.remove();
  }

  function canStartWorkspaceTask() {
    return workspaceState.modeActivated && validateSelection(workspaceState.selectedFiles).ok;
  }

  function setTimelineVisible(visible) {
    if (!timelinePanel) return;
    timelinePanel.style.display = visible ? "block" : "none";
  }

  function setParamsVisible(visible) {
    if (!paramsPanel) return;
    paramsPanel.style.display = visible ? "block" : "none";
  }

  function setWorkspaceDetailPanelsHidden(hidden) {
    detailPanels.forEach((panel) => panel.classList.toggle("is-hidden-by-input-mode", hidden));
  }

  function isExportDemoActive() {
    return Boolean(workspaceState.exportDemoPhase);
  }

  function syncSceneGuidePanel() {
    if (!sceneGuidePanel) return;
    sceneGuidePanel.classList.toggle("is-collapsed", workspaceState.sceneGuideCollapsed);
    if (sceneGuideToggle) {
      sceneGuideToggle.textContent = workspaceState.sceneGuideCollapsed ? "展开" : "收起";
      sceneGuideToggle.setAttribute("aria-expanded", String(!workspaceState.sceneGuideCollapsed));
    }
  }

  function syncWorkspaceViewerMode() {
    if (!workspaceViewerOverlay) return;
    const showOverlay = workspaceState.modeActivated && workspaceState.sceneGuideCollapsed && !workspaceState.previewReady;
    workspaceViewerOverlay.classList.toggle("is-visible", showOverlay);
    if (viewStage) {
      viewStage.classList.toggle("is-task-mode", showOverlay);
      viewStage.classList.toggle("is-preview-live", workspaceState.previewReady);
    }
  }

  function setSceneGuideCollapsed(nextCollapsed, reason = "manual") {
    workspaceState.sceneGuideCollapsed = Boolean(nextCollapsed);
    syncSceneGuidePanel();
    syncWorkspaceViewerMode();
    if (reason === "manual" && !workspaceState.sceneGuideCollapsed) {
      setWorkspaceDetailPanelsHidden(false);
    }
  }

  function getActiveTimelineConfig(modeKey) {
    return workspaceState.runtimeMeta?.timeline_mode === "resume"
      ? WORKSPACE_RESUME_TIMELINE
      : getWorkspaceInputMode(modeKey);
  }

  function renderTimeline(modeKey, progressIndex = -1) {
    const modeConfig = getActiveTimelineConfig(modeKey);
    if (!timelinePanel) return;
    // Train page uses the inline horizontal timeline docked under the progress card.
    if (timelinePanel.id === "train-timeline-inline") {
      timelinePanel.innerHTML = buildWorkspaceTimelineInlineMarkup(modeConfig, progressIndex);
    } else {
      timelinePanel.innerHTML = buildWorkspaceTimelineMarkup(modeConfig, progressIndex);
    }
  }

  function renderParams(modeKey) {
    if (!paramsPanel) return;
    paramsPanel.innerHTML = buildWorkspaceParamsMarkup(
      modeKey,
      workspaceState.paramValues,
      canStartWorkspaceTask(),
      getWorkspaceParameterContext(),
      isWorkspaceParamsLocked(),
    );
    updateStartButtonState();
  }

  function updateTrainingRuntimePanel(snapshot = {}) {
    const panel = document.getElementById("training-runtime-panel");
    const lossEl = document.getElementById("training-runtime-loss");
    const speedEl = document.getElementById("training-runtime-speed");
    const etaEl = document.getElementById("training-runtime-eta");
    if (!panel || !lossEl || !speedEl || !etaEl) return;

    const runtimeMeta = snapshot.runtimeMeta || {};
    const trainingProgress = snapshot.trainingProgress || runtimeMeta.trainingProgress || {};
    const shouldShow = Boolean(snapshot.status && snapshot.status !== "idle");
    const isTrainingState = snapshot.status === "queued" || snapshot.status === "running" || snapshot.status === "cancelling";

    panel.style.display = shouldShow ? "block" : "none";
    if (!shouldShow) return;

    const loss = trainingProgress.loss ?? runtimeMeta.progress_loss;
    const speed = trainingProgress.speed ?? runtimeMeta.progress_speed;
    const eta = trainingProgress.eta ?? runtimeMeta.progress_eta;

    lossEl.textContent = Number.isFinite(Number(loss)) ? Number(loss).toFixed(7) : "--";
    speedEl.textContent = isTrainingState && speed ? String(speed) : "--";
    etaEl.textContent = isTrainingState && eta ? String(eta) : "--";
  }

  function syncTrainingViewerPreview(snapshot = {}) {
    const preview = snapshot.preview || snapshot.runtimeMeta?.preview || null;
    const isDemoBranch = snapshot.runtimeMeta?.demo_branch === "export";
    const overlay = document.getElementById("workspace-viewer-overlay");
    const overlayTitle = overlay?.querySelector("h3");
    const overlayText = overlay?.querySelector(".workspace-viewer-overlay__body");
    const previewMeta = document.getElementById("workspace-viewer-preview-meta");
    const previewBadge = document.getElementById("viewer-preview-badge");
    const previewIterationLabel = document.getElementById("viewer-preview-iteration");
    const viewStageEl = document.getElementById("view-stage");
    if (!isDemoBranch && snapshot.status === "success" && preview?.url) {
      workspaceState.previewReady = true;
      workspaceState.previewIteration = preview.iteration;
      if (previewMeta) previewMeta.textContent = `当前结果：iteration ${preview.iteration}`;
      if (previewBadge) previewBadge.classList.add("is-visible");
      if (previewIterationLabel) previewIterationLabel.textContent = `iteration ${preview.iteration}`;
      if (overlayTitle) overlayTitle.textContent = "训练完成";
      if (overlayText) overlayText.textContent = "最终结果已生成并加载到 Viewer。";
      window.focusGSStudioLoadPreview?.(preview.url, preview.iteration);
    } else {
      workspaceState.previewReady = false;
      workspaceState.previewIteration = null;
      if (previewMeta) previewMeta.textContent = "训练中仅保留日志，不加载实时预览。";
      if (previewBadge) previewBadge.classList.remove("is-visible", "is-refreshing");
      if (previewIterationLabel) previewIterationLabel.textContent = "iteration --";
      if (overlayTitle) overlayTitle.textContent = "训练预览已关闭";
      if (overlayText) overlayText.textContent = "训练期间不加载中间 checkpoint，等任务结束后再切换到最终结果。";
      if (viewStageEl) {
        viewStageEl.classList.remove("is-preview-refresh");
      }
    }
    syncWorkspaceViewerMode();
  }

  function updateTrainingProgressCard(snapshot = {}) {
    const card = document.getElementById("training-progress-card");
    const phaseEl = document.getElementById("training-progress-phase");
    const percentEl = document.getElementById("training-progress-percent");
    const barEl = document.getElementById("training-progress-bar");
    const iterationEl = document.getElementById("training-progress-iteration");
    const stateEl = document.getElementById("training-progress-state");
    if (!card || !phaseEl || !percentEl || !barEl || !iterationEl || !stateEl) return;

    const runtimeMeta = snapshot.runtimeMeta || {};
    const trainingProgress = snapshot.trainingProgress || {};
    const totalSteps = getWorkspaceInputMode(workspaceState.mode).timelineSteps.length;
    const totalIterations =
      Number(trainingProgress.totalIterations)
      || Number(runtimeMeta.progress_total_iterations)
      || Number(snapshot.parameterValues?.iterations)
      || Number(workspaceState.paramValues?.iterations)
      || 30000;

    let currentIteration =
      Number(trainingProgress.currentIteration)
      || Number(runtimeMeta.progress_iteration)
      || 0;
    const resumeFromIteration =
      Number(trainingProgress.resumeFromIteration)
      || Number(runtimeMeta.resume_from_iteration)
      || 0;
    const hasRealIterationProgress = currentIteration > 0;

    if (resumeFromIteration > 0 && currentIteration > 0 && currentIteration < resumeFromIteration) {
      currentIteration += resumeFromIteration;
    } else if (resumeFromIteration > 0 && currentIteration <= 0) {
      currentIteration = resumeFromIteration;
    }

	    let percent = Number(trainingProgress.percent ?? runtimeMeta.progress_percent);
	    if (!hasRealIterationProgress) {
	      // Idle state should always start at 0%. Only show "fake" progress once a job is actually running/queued.
	      if (!snapshot.status || snapshot.status === "idle") {
	        percent = 0;
	      } else {
	        percent = Number(runtimeMeta.fake_progress_percent);
	        if (!Number.isFinite(percent)) {
	          percent = runtimeMeta.source_strategy === "local-path" ? 8 : 2;
	        }
	      }
	    } else if (!Number.isFinite(percent)) {
	      if (snapshot.status === "success") {
	        percent = 100;
	      } else if (snapshot.status === "running") {
	        const normalizedIndex = snapshot.progressIndex >= 0 ? Math.min(snapshot.progressIndex, Math.max(totalSteps - 1, 0)) : 0;
        percent = totalSteps > 1 ? Math.round((normalizedIndex / (totalSteps - 1)) * 100) : 0;
      } else {
        percent = 0;
      }
    }

    if (resumeFromIteration > 0 && totalIterations > 0 && currentIteration > 0) {
      percent = Math.round((currentIteration / totalIterations) * 100);
    }

    if (snapshot.status === "success" && currentIteration <= 0) {
      currentIteration = totalIterations;
    }

    const phase =
      (hasRealIterationProgress ? (trainingProgress.phase || runtimeMeta.progress_phase) : null)
      || (snapshot.status === "queued" || (snapshot.status === "running" && !hasRealIterationProgress)
        ? "已检查到COLMAP数据"
        : snapshot.status === "running"
          ? "MEGS² 训练"
          : snapshot.status === "cancelling"
            ? "正在中断"
            : snapshot.status === "cancelled"
              ? "任务已中断"
              : snapshot.status === "failed"
                ? "训练失败"
                : snapshot.status === "success"
                  ? "训练完成"
                  : "等待任务启动");

    const stateText =
      (hasRealIterationProgress ? (trainingProgress.detail || runtimeMeta.progress_detail) : null)
      || runtimeMeta.fake_progress_label
      || snapshot.logBadgeText
      || "等待新的训练任务";

	    card.dataset.status = snapshot.status || "idle";
	    phaseEl.textContent = phase;
	    percentEl.textContent = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
	    barEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
	    const shouldShowIteration = Boolean(snapshot.status && snapshot.status !== "idle");
	    iterationEl.style.display = shouldShowIteration ? "inline" : "none";
	    if (shouldShowIteration) {
	      iterationEl.textContent = hasRealIterationProgress
	        ? `${Math.max(0, Math.round(currentIteration))} / ${totalIterations} iter`
	        : "准备训练环境中";
	    } else {
	      iterationEl.textContent = "";
	    }
	    stateEl.textContent = stateText;
	  }

  function syncJobPreview(overrides = {}) {
    workspaceState.jobStatus = overrides.status ?? workspaceState.jobStatus;
    workspaceState.progressIndex = overrides.progressIndex ?? workspaceState.progressIndex;
    workspaceState.logBadgeText = overrides.logBadgeText ?? workspaceState.logBadgeText;
    workspaceState.runtimeMeta = overrides.runtimeMeta ?? workspaceState.runtimeMeta;
    window.focusGSWorkspaceRuntime.jobStatus = workspaceState.jobStatus;

    const paramsLocked = isWorkspaceParamsLocked();
    if (paramsLocked !== lastParamsLocked) {
      lastParamsLocked = paramsLocked;
      renderParams(workspaceState.mode);
    }

    setWorkspaceJobPreview({
      modeConfig: getWorkspaceInputMode(workspaceState.mode),
      sceneName: getResolvedWorkspaceSceneName(),
      selectionSummary: workspaceState.selectionSummary,
      status: workspaceState.jobStatus,
      progressIndex: workspaceState.progressIndex,
      logBadgeText: workspaceState.logBadgeText,
      parameterValues: workspaceState.paramValues,
      parameterContext: getWorkspaceParameterContext(),
      runtimeMeta: workspaceState.runtimeMeta,
    });
    updateTrainingProgressCard({
      status: workspaceState.jobStatus,
      progressIndex: workspaceState.progressIndex,
      logBadgeText: workspaceState.logBadgeText,
      runtimeMeta: workspaceState.runtimeMeta,
      parameterValues: workspaceState.paramValues,
      trainingProgress: workspaceState.runtimeMeta?.trainingProgress || {},
      logs: workspaceState.runtimeMeta?.log_excerpt || "",
    });
    updateTrainingRuntimePanel({
      status: workspaceState.jobStatus,
      runtimeMeta: workspaceState.runtimeMeta,
      trainingProgress: workspaceState.runtimeMeta?.trainingProgress || {},
    });
    syncTrainingViewerPreview({
      status: workspaceState.jobStatus,
      runtimeMeta: workspaceState.runtimeMeta,
      preview: workspaceState.runtimeMeta?.preview || null,
    });
    updateStartButtonState();
  }

  function applyExportDemoSnapshot(phaseKey = EXPORT_DEMO_PHASES.PRE_EXPORT) {
    const sceneName = getResolvedWorkspaceSceneName(getWorkspaceSceneName());
    const progressKey =
      phaseKey === EXPORT_DEMO_PHASES.EXPORTING
        ? "exporting"
        : phaseKey === EXPORT_DEMO_PHASES.READY
          ? "ready"
          : "preExport";
    const progressData = EXPORT_DEMO_DATA.progress[progressKey];
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    const trainingStepIndex = Math.max(0, modeConfig.timelineSteps.findIndex((step) => step.title === "MEGS² 训练"));
    const exportStepIndex = Math.max(trainingStepIndex, modeConfig.timelineSteps.findIndex((step) => step.title === "结果导出"));
    const progressIndex = phaseKey === EXPORT_DEMO_PHASES.PRE_EXPORT ? trainingStepIndex : exportStepIndex;
    const logLines = [
      ...EXPORT_DEMO_DATA.logs.preExport,
      ...(phaseKey === EXPORT_DEMO_PHASES.EXPORTING || phaseKey === EXPORT_DEMO_PHASES.READY ? EXPORT_DEMO_DATA.logs.exporting : []),
      ...(phaseKey === EXPORT_DEMO_PHASES.READY ? EXPORT_DEMO_DATA.logs.ready : []),
    ];

    workspaceState.exportDemoPhase = phaseKey;
    workspaceState.modeActivated = true;
    setWorkspaceDetailPanelsHidden(true);
    setSceneGuideCollapsed(true, "auto");
    setTimelineVisible(true);
    setParamsVisible(true);
    renderTimeline(modeConfig.key, progressIndex);
    switchTab("log");

    syncJobPreview({
      status: phaseKey === EXPORT_DEMO_PHASES.READY ? "success" : "running",
      progressIndex,
      logBadgeText:
        phaseKey === EXPORT_DEMO_PHASES.READY
          ? "导出完成：结果已保存到本地"
          : phaseKey === EXPORT_DEMO_PHASES.EXPORTING
            ? "正在整理结果并导出轻量化资产..."
            : "演示分支：训练收尾阶段",
      runtimeMeta: {
        demo_branch: "export",
        resolved_scene_name: sceneName,
        progress_phase: progressData.phase,
        progress_percent: progressData.percent,
        progress_iteration: progressData.currentIteration,
        progress_total_iterations: progressData.totalIterations,
        progress_detail: progressData.detail,
        progress_loss: progressData.loss,
        progress_speed: progressData.speed,
        progress_eta: progressData.eta,
        output_size: EXPORT_DEMO_DATA.runtime.outputSize,
        compressed_size: EXPORT_DEMO_DATA.runtime.compressedSize,
        compression_ratio: EXPORT_DEMO_DATA.runtime.compressionRatio,
        compressed_output_path: EXPORT_DEMO_DATA.runtime.compressedPath,
        log_excerpt: logLines.slice(-12).join("\n"),
        trainingProgress: {
          phase: progressData.phase,
          percent: progressData.percent,
          currentIteration: progressData.currentIteration,
          totalIterations: progressData.totalIterations,
          detail: progressData.detail,
          loss: progressData.loss,
          speed: progressData.speed,
          eta: progressData.eta,
        },
      },
    });

    const codeBlock = document.getElementById("json-log-content");
    if (codeBlock) {
      codeBlock.textContent = logLines.join("\n");
    }

    if (phaseKey === EXPORT_DEMO_PHASES.READY) {
      if (historyModalRoot) {
        historyModalRoot.innerHTML = buildExportDemoDialog(sceneName);
      }
    }
  }

  function startExportDemoFlow() {
    clearExportDemoTimer();
    clearFakeProgressTimer();
    clearJobPollTimer();
    closeExportDemoModal();

    applyExportDemoSnapshot(EXPORT_DEMO_PHASES.PRE_EXPORT);
    workspaceState.exportDemoTimer = window.setTimeout(() => {
      applyExportDemoSnapshot(EXPORT_DEMO_PHASES.EXPORTING);
      workspaceState.exportDemoTimer = window.setTimeout(() => {
        applyExportDemoSnapshot(EXPORT_DEMO_PHASES.READY);
        workspaceState.exportDemoTimer = null;
      }, EXPORT_DEMO_TIMINGS.EXPORTING_MS);
    }, EXPORT_DEMO_TIMINGS.PRE_EXPORT_MS);
  }

  async function fetchTrainingHistory() {
    const response = await fetch("/api/train/history", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Array.isArray(payload.jobs)) {
      throw new Error(payload.message || "读取历史记录失败。");
    }
    return payload.jobs;
  }

  async function recoverActiveWorkspaceJob(preferredJobId = "") {
    const jobs = await fetchTrainingHistory();
    updateHistoryPanel(jobs);

    const activeStatuses = ["running", "queued", "cancelling"];
    const preferredJob = preferredJobId
      ? jobs.find((item) => item.id === preferredJobId && activeStatuses.includes(item.status))
      : null;
    const fallbackJob = jobs.find((item) => activeStatuses.includes(item.status));
    const targetJob = preferredJob || fallbackJob;

    if (!targetJob?.id) {
      throw new Error("未找到正在运行的任务。");
    }

    const [job, logs] = await Promise.all([fetchTrainingJob(targetJob.id), fetchTrainingLogs(targetJob.id)]);

    workspaceState.modeActivated = true;
    setWorkspaceDetailPanelsHidden(true);
    setSceneGuideCollapsed(true, "auto");
    setTimelineVisible(true);
    setParamsVisible(true);
    applyMode(job.mode || "colmap", true);
    workspaceState.selectionSummary = job.selectionSummary || "已恢复训练任务";
    workspaceState.paramValues = {
      ...workspaceState.paramValues,
      ...(job.parameterValues || {}),
    };
    workspaceState.runtimeMeta = {
      source_strategy: job.sourceStrategy,
      source_path: job.sourcePath,
      resolved_scene_name: job.sceneName,
      selected_image_dir: job.inputImageDir,
      sparse_root: job.sparseRoot,
      timeline_mode: job.resumeFromIteration ? "resume" : "default",
      resume_from_iteration: job.resumeFromIteration || 0,
      trainingProgress: job.trainingProgress || {},
      preview: job.preview || null,
    };
    applyServerJob(job, logs);
    switchTab("log");
    return job;
  }

  async function refreshTrainingHistory() {
    try {
      const jobs = await fetchTrainingHistory();
      updateHistoryPanel(jobs);
    } catch (error) {
      updateHistoryPanel(workspaceState.historyTasks);
      if (historyPanelContent && (!workspaceState.historyTasks || !workspaceState.historyTasks.length)) {
        historyPanelContent.innerHTML = `
          <div class="history-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${error instanceof Error ? error.message : "历史记录读取失败"}</span>
          </div>
        `;
      }
    }
  }

  async function resumeTrainingJob(payload) {
    const formData = new FormData();
    formData.set("payload", JSON.stringify(payload));
    const response = await fetch("/api/train/resume", {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.job) {
      throw new Error(result.message || "创建续训任务失败。");
    }
    return result.job;
  }

  function clearSimulationTimer() {
    if (workspaceState.simulationTimer) {
      window.clearInterval(workspaceState.simulationTimer);
      workspaceState.simulationTimer = null;
    }
  }

  function clearFakeProgressTimer() {
    if (workspaceState.fakeProgressTimer) {
      window.clearTimeout(workspaceState.fakeProgressTimer);
      workspaceState.fakeProgressTimer = null;
    }
  }

  function clearJobPollTimer() {
    if (workspaceState.pollTimer) {
      window.clearTimeout(workspaceState.pollTimer);
      workspaceState.pollTimer = null;
    }
  }

  function startFakeQueuedProgress() {
    clearFakeProgressTimer();

    let fakeProgress = Number(workspaceState.runtimeMeta?.fake_progress_percent);
    if (!Number.isFinite(fakeProgress) || fakeProgress < 0) {
      fakeProgress = 0;
    }

    function getFakeProgressLabel(progressValue) {
      if (progressValue < 18) return "正在定位本地数据目录";
      if (progressValue < 42) return "正在检查 COLMAP 结构";
      if (progressValue < 68) return "正在准备训练环境";
      if (progressValue < 92) return "正在加载训练模块";
      if (progressValue < 100) return "训练环境已就绪，等待首批训练日志";
      return "训练环境已就绪，等待首批训练日志";
    }

    workspaceState.runtimeMeta = {
      ...workspaceState.runtimeMeta,
      fake_progress_percent: fakeProgress,
      fake_progress_label: getFakeProgressLabel(fakeProgress),
    };
    syncJobPreview();

    const tickFakeProgress = () => {
      const hasRealIterationProgress =
        Number(workspaceState.runtimeMeta?.progress_iteration) > 0
        || Number(workspaceState.runtimeMeta?.trainingProgress?.currentIteration) > 0;

      if (hasRealIterationProgress) {
        clearFakeProgressTimer();
        return;
      }

      if (
        !workspaceState.isSubmitting
        && workspaceState.jobStatus !== "queued"
        && workspaceState.jobStatus !== "running"
      ) {
        clearFakeProgressTimer();
        return;
      }

      let nextStep = 0;
      if (fakeProgress < 18) {
        nextStep = 2.5 + Math.random() * 6.5;
      } else if (fakeProgress < 42) {
        nextStep = 1.8 + Math.random() * 5.2;
      } else if (fakeProgress < 68) {
        nextStep = 1.2 + Math.random() * 4.0;
      } else if (fakeProgress < 92) {
        nextStep = 0.8 + Math.random() * 2.4;
      } else if (fakeProgress < 100) {
        nextStep = 0.45 + Math.random() * 1.2;
      }

      fakeProgress = Math.min(100, fakeProgress + nextStep);
      workspaceState.runtimeMeta = {
        ...workspaceState.runtimeMeta,
        fake_progress_percent: Number(fakeProgress.toFixed(1)),
        fake_progress_label: getFakeProgressLabel(fakeProgress),
      };
      syncJobPreview();

      if (fakeProgress >= 100) {
        workspaceState.fakeProgressTimer = null;
        return;
      }

      const nextDelay =
        fakeProgress < 32
          ? 220 + Math.round(Math.random() * 240)
          : fakeProgress < 74
            ? 260 + Math.round(Math.random() * 360)
            : 380 + Math.round(Math.random() * 520);

      const adjustedDelay =
        fakeProgress >= 92
          ? 180 + Math.round(Math.random() * 220)
          : nextDelay;

      workspaceState.fakeProgressTimer = window.setTimeout(tickFakeProgress, adjustedDelay);
    };

    const initialDelay = 180 + Math.round(Math.random() * 180);
    workspaceState.fakeProgressTimer = window.setTimeout(tickFakeProgress, initialDelay);
  }

  function updateStartButtonState() {
    const startButton = paramsPanel?.querySelector("#workspace-start-training");
    const cancelButton = paramsPanel?.querySelector("#workspace-cancel-training");
    if (!startButton) return;

    const isReady = workspaceState.modeActivated && validateSelection(workspaceState.selectedFiles).ok;
    const shouldDisable = !isReady || workspaceState.isSubmitting || hasActiveWorkspaceJob() || isExportDemoActive();

    startButton.disabled = shouldDisable;
    startButton.textContent = workspaceState.isSubmitting
      ? "正在提交任务..."
      : isExportDemoActive()
        ? "结果导出演示进行中"
      : hasActiveWorkspaceJob()
        ? "MEGS² 训练进行中"
        : "开始重建";

    if (cancelButton) {
      const canCancel = !isExportDemoActive() && (workspaceState.isSubmitting || hasActiveWorkspaceJob()) && workspaceState.jobStatus !== "cancelled" && workspaceState.jobStatus !== "failed" && workspaceState.jobStatus !== "success";
      cancelButton.disabled = !canCancel;
      cancelButton.textContent = workspaceState.isSubmitting
        ? "中断上传"
        : workspaceState.jobStatus === "cancelling"
          ? "正在中断..."
          : "中断重建";
    }
  }

  function switchTab(mode) {
    if (!tabViewer || !tabLog) return;
    if (mode === "viewer") {
      tabViewer.classList.add("active");
      tabLog.classList.remove("active");
      viewStage.style.display = "block";
      logStage.style.display = "none";
    } else {
      tabLog.classList.add("active");
      tabViewer.classList.remove("active");
      logStage.style.display = "flex";
      viewStage.style.display = "none";
    }
  }

  function updateDropzoneState(text, tone = "idle") {
    if (!dropzoneStatus) return;
    dropzoneStatus.textContent = text;
    dropzoneStatus.dataset.tone = tone;
  }

  function applyMode(modeKey, triggeredByUser = false, preserveActiveJob = false) {
    if (isExportDemoActive()) {
      closeExportDemoModal();
      clearExportDemoTimer();
      workspaceState.exportDemoPhase = null;
    }
    const modeConfig = getWorkspaceInputMode(modeKey);
    workspaceState.mode = modeConfig.key;
    workspaceState.modeActivated = triggeredByUser ? true : workspaceState.modeActivated;
    workspaceState.colmapImageDirs = [];
    workspaceState.paramValues = getWorkspaceDefaultParamValues(modeConfig.key, workspaceState.paramValues, getWorkspaceParameterContext());
    workspaceState.jobStatus = "idle";
    workspaceState.progressIndex = -1;
    workspaceState.logBadgeText = `${modeConfig.label}模式待命`;
    workspaceState.runtimeMeta = {};
    workspaceState.submissionAbortController = null;
    clearSimulationTimer();
    clearJobPollTimer();
    if (!preserveActiveJob) {
      workspaceState.activeJobId = null;
      persistActiveWorkspaceJobId("");
    }
    workspaceState.isSubmitting = false;

    segmentButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.inputMode === modeConfig.key);
    });

    if (inputLabel) inputLabel.textContent = modeConfig.inputLabel;
    if (dropzoneTitle) dropzoneTitle.textContent = modeConfig.dropzoneTitle;
    if (dropzoneHint) dropzoneHint.textContent = modeConfig.dropzoneHint;
    if (folderInput) folderInput.accept = "";
    if (videoInput) videoInput.accept = modeConfig.pickerKind === "video" ? modeConfig.accept : "video/*";

    workspaceState.selectedFiles = [];
    workspaceState.selectionSummary = "尚未选择输入源";
    updateDropzoneState("尚未选择输入源", "idle");
    renderParams(modeConfig.key);
    syncJobPreview();

    if (triggeredByUser) {
      setSceneGuideCollapsed(true, "auto");
      setTimelineVisible(true);
      setParamsVisible(true);
      renderTimeline(modeConfig.key, -1);
    }
  }

  function validateSelection(files = []) {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    if (!files.length) {
      return { ok: false, files: [], message: "未检测到有效输入。", tone: "error" };
    }

    if (modeConfig.key === "video") {
      const videoFiles = files.filter(isVideoFile);
      if (videoFiles.length !== 1 || files.length !== 1) {
        return { ok: false, files: [], message: "当前模式只接受单个视频文件。", tone: "error" };
      }
      return { ok: true, files: [videoFiles[0]], message: `已选择视频：${videoFiles[0].name}`, tone: "success" };
    }

    if (modeConfig.key === "colmap") {
      const analysis = analyzeColmapInput(files);
      if (!analysis.hasSparse) {
        return { ok: false, files, message: "当前目录缺少 sparse/0 的关键 COLMAP 结构。", tone: "error", meta: analysis };
      }
      if (!analysis.imageDirs.length) {
        return { ok: false, files, message: "当前目录缺少可用图像目录（images / images_2 / images_4 / images_8）。", tone: "error", meta: analysis };
      }
      return { ok: true, files, message: summarizeSelectedInput("colmap", files), tone: "success", meta: analysis };
    }

    const imageFiles = files.filter(isImageFile);
    if (!imageFiles.length) {
      return { ok: false, files: [], message: "当前模式需要图片文件夹。", tone: "error" };
    }
    return { ok: true, files: imageFiles, message: summarizeSelectedInput("images", imageFiles), tone: "success" };
  }

  function commitSelection(files = []) {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    const validation = validateSelection(files);
    workspaceState.selectedFiles = validation.files;
    workspaceState.selectionMeta = validation.meta || {};
    workspaceState.colmapImageDirs = validation.meta?.imageDirs || [];
    // Consider the user "activated" the mode once they've provided an input selection.
    // This keeps the CTA buttons behavior consistent with earlier iterations.
    if (validation.ok) {
      workspaceState.modeActivated = true;
    }
    workspaceState.paramValues = getWorkspaceDefaultParamValues(workspaceState.mode, workspaceState.paramValues, getWorkspaceParameterContext());
    workspaceState.selectionSummary = validation.message;
    workspaceState.runtimeMeta =
      validation.ok && modeConfig.key === "colmap"
        ? {
            source_strategy: "local-path",
            source_hint: validation.meta?.rootName || getWorkspaceSceneName(),
            resolved_scene_name: validation.meta?.rootName || getWorkspaceSceneName(),
            detected_image_dirs: workspaceState.colmapImageDirs,
            selected_image_dir: workspaceState.paramValues.input_image_dir,
            sparse_root: workspaceState.paramValues.sparse_root,
          }
        : {};
    updateDropzoneState(validation.message, validation.tone);
    syncJobPreview({
      status: validation.ok ? "idle" : "failed",
      progressIndex: -1,
      logBadgeText: validation.ok ? `${modeConfig.label}模式待命` : "输入检查未通过",
    });
    renderParams(modeConfig.key);
    return validation.ok;
  }

  async function handleDropSelection(event) {
    event.preventDefault();
    dropzone?.classList.remove("is-dragover");
    const files = await collectDropzoneFiles(event);
    commitSelection(files);
  }

  function openPickerForMode() {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    if (modeConfig.pickerKind === "video") {
      videoInput?.click();
      return;
    }
    folderInput?.click();
  }

  function startTaskSimulation() {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    const totalSteps = modeConfig.timelineSteps.length;

    clearSimulationTimer();
    switchTab("log");
    setTimelineVisible(true);
    renderTimeline(modeConfig.key, 0);
    syncJobPreview({
      status: "running",
      progressIndex: 0,
      logBadgeText: `第 1/${totalSteps} 阶段: ${modeConfig.timelineSteps[0].title}`,
    });

    let activeIndex = 0;
    workspaceState.simulationTimer = window.setInterval(() => {
      activeIndex += 1;
      if (activeIndex >= totalSteps) {
        clearSimulationTimer();
        renderTimeline(modeConfig.key, totalSteps);
        syncJobPreview({
          status: "success",
          progressIndex: totalSteps,
          logBadgeText: "任务完成",
        });
        return;
      }

      renderTimeline(modeConfig.key, activeIndex);
      syncJobPreview({
        status: "running",
        progressIndex: activeIndex,
        logBadgeText: `第 ${activeIndex + 1}/${totalSteps} 阶段: ${modeConfig.timelineSteps[activeIndex].title}`,
      });
    }, 1500);
  }

  function getWorkspaceUploadManifest(files = []) {
    return files.map((file, index) => ({
      key: `file-${index}`,
      name: file.name,
      relativePath: file.webkitRelativePath || file.name,
      size: file.size,
    }));
  }

  function mapServerJobProgress(job) {
    const totalSteps = getActiveTimelineConfig(workspaceState.mode).timelineSteps.length;
    const hasRealIterationProgress = Number(job?.trainingProgress?.currentIteration) > 0;

    if (!job) return workspaceState.progressIndex;

    if (job.stage === "queued" || job.stage === "preparing_input") {
      return 0;
    }

    if (job.stage === "training_megs2") {
      return hasRealIterationProgress ? Math.min(1, totalSteps - 1) : 0;
    }

    if (job.stage === "exporting_result") {
      return Math.min(2, totalSteps - 1);
    }

    if (job.stage === "success") {
      return totalSteps;
    }

    if (job.stage === "failed") {
      return workspaceState.progressIndex >= 0 ? workspaceState.progressIndex : 0;
    }

    if (job.stage === "cancelling" || job.stage === "cancelled") {
      return workspaceState.progressIndex >= 0 ? workspaceState.progressIndex : 0;
    }

    return workspaceState.progressIndex;
  }

  function getLogExcerpt(logs = "") {
    return getLogTailExcerpt(logs, 12);
  }

  function applyServerJob(job, logs = "") {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    const progressIndex = mapServerJobProgress(job);
    const hasRealIterationProgress = Number(job?.trainingProgress?.currentIteration) > 0;
    const preservedFakeProgressPercent = workspaceState.runtimeMeta?.fake_progress_percent;
    const preservedFakeProgressLabel = workspaceState.runtimeMeta?.fake_progress_label;
    const resolvedSceneName =
      job?.sceneName
      || workspaceState.selectionMeta?.rootName
      || getWorkspaceSceneName();

    if (job.state === "success" || job.state === "failed" || job.state === "cancelled") {
      clearActiveWorkspaceJob();
      workspaceState.isSubmitting = false;
      clearFakeProgressTimer();
      clearJobPollTimer();
      void refreshTrainingHistory();
      // The previous input selection is tied to the finished run; clear it so the "创建任务" panel
      // doesn't keep showing stale "已选择..." text after a terminal state (failed/cancelled/success).
      workspaceState.selectedFiles = [];
      workspaceState.selectionMeta = {};
      workspaceState.colmapImageDirs = [];
      updateDropzoneState("尚未选择输入源", "idle");
      renderParams(workspaceState.mode);
    } else if (job.id) {
      workspaceState.activeJobId = job.id;
      persistActiveWorkspaceJobId(job.id);
      if (hasRealIterationProgress) {
        clearFakeProgressTimer();
      }
    }

    renderTimeline(modeConfig.key, progressIndex);
    syncJobPreview({
      status: job.state === "running" || job.state === "queued" ? job.state : job.state,
      progressIndex,
      logBadgeText: job.message || (job.state === "success" ? "任务完成" : "任务进行中"),
      runtimeMeta: {
        job_id: job.id,
        server_state: job.state,
        server_stage: job.stage,
        updated_at: job.updatedAt,
        workspace_path: job.workspacePath,
        output_path: job.modelPath,
        log_path: job.logPath,
        launcher: job.launcher,
        selected_image_dir: job.inputImageDir,
        sparse_root: job.sparseRoot,
        source_path: job.sourcePath,
        source_strategy: job.sourceStrategy,
        exit_code: job.exitCode,
        error: job.error,
        progress_phase: job.trainingProgress?.phase,
        progress_percent: job.trainingProgress?.percent,
        progress_iteration: job.trainingProgress?.currentIteration,
        progress_total_iterations: job.trainingProgress?.totalIterations,
        progress_detail: job.trainingProgress?.detail,
        progress_loss: job.trainingProgress?.loss,
        progress_speed: job.trainingProgress?.speed,
        progress_eta: job.trainingProgress?.eta,
        trainingProgress: job.trainingProgress || {},
        timeline_mode: job.resumeFromIteration ? "resume" : "default",
        resume_from_iteration: job.resumeFromIteration || 0,
        resolved_scene_name: resolvedSceneName,
        fake_progress_percent: hasRealIterationProgress ? undefined : preservedFakeProgressPercent,
        fake_progress_label: hasRealIterationProgress ? undefined : preservedFakeProgressLabel,
        preview: job.preview || null,
        log_tail: Array.isArray(job.logTail) ? job.logTail : [],
        log_excerpt: logs ? getLogExcerpt(logs) : undefined,
      },
    });

    if (
      job.state === "success"
      && !isExportDemoActive()
      && historyModalRoot
      && workspaceState.completionModalShownJobId !== job.id
    ) {
      workspaceState.completionModalShownJobId = job.id;
      historyModalRoot.innerHTML = buildTrainingCompletionDialog({ sceneId: selectedScene?.id || "garden", job });
    }

    if (job.state === "success" && job.preview?.url) {
      switchTab("viewer");
      window.focusGSStudioLoadPreview?.(job.preview.url, job.preview.iteration);
    }
  }

  async function fetchTrainingJob(jobId) {
    const response = await fetch(`/api/train/${jobId}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.job) {
      throw new Error(payload.message || "读取训练状态失败。");
    }
    return payload.job;
  }

  async function fetchTrainingLogs(jobId) {
    const response = await fetch(`/api/train/${jobId}/logs`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || "读取训练日志失败。");
    }
    return payload.logs || "";
  }

  async function restoreActiveWorkspaceJob() {
    const persistedJobId = readPersistedActiveWorkspaceJobId();
    if (!persistedJobId) return;

    workspaceState.activeJobId = persistedJobId;
    workspaceState.jobStatus = "running";
    window.focusGSWorkspaceRuntime.jobStatus = "running";

    try {
      const [job, logs] = await Promise.all([fetchTrainingJob(persistedJobId), fetchTrainingLogs(persistedJobId)]);

      if (!job || ["success", "failed", "cancelled"].includes(job.state)) {
        persistActiveWorkspaceJobId("");
        return;
      }

      workspaceState.modeActivated = true;
      setWorkspaceDetailPanelsHidden(true);
      setSceneGuideCollapsed(true, "auto");
      setTimelineVisible(true);
      setParamsVisible(true);
      applyMode(job.mode || "colmap", true);
      workspaceState.selectionSummary = job.selectionSummary || "已恢复训练任务";
      workspaceState.paramValues = {
        ...workspaceState.paramValues,
        ...(job.parameterValues || {}),
      };
      workspaceState.runtimeMeta = {
        source_strategy: job.sourceStrategy,
        source_path: job.sourcePath,
        resolved_scene_name: job.sceneName,
        selected_image_dir: job.inputImageDir,
        sparse_root: job.sparseRoot,
        timeline_mode: job.resumeFromIteration ? "resume" : "default",
        resume_from_iteration: job.resumeFromIteration || 0,
        trainingProgress: job.trainingProgress || {},
        preview: job.preview || null,
      };
      applyServerJob(job, logs);
      switchTab("log");
      scheduleTrainingJobPoll(job.id, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Job not found")) {
        try {
          const recoveredJob = await recoverActiveWorkspaceJob(persistedJobId);
          scheduleTrainingJobPoll(recoveredJob.id, 1200);
          return;
        } catch {
          clearActiveWorkspaceJob();
          return;
        }
      }
      scheduleTrainingJobPoll(persistedJobId, 2500);
    }
  }

  async function cancelTrainingJob(jobId) {
    const response = await fetch(`/api/train/${jobId}/cancel`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.job) {
      throw new Error(payload.message || "中断任务失败。");
    }
    return payload.job;
  }

  function scheduleTrainingJobPoll(jobId, delay = 2200) {
    clearJobPollTimer();
    workspaceState.pollTimer = window.setTimeout(async () => {
      try {
        const [job, logs] = await Promise.all([fetchTrainingJob(jobId), fetchTrainingLogs(jobId)]);
        applyServerJob(job, logs);
        if (job.state !== "success" && job.state !== "failed" && job.state !== "cancelled") {
          scheduleTrainingJobPoll(jobId);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("Job not found")) {
          try {
            const recoveredJob = await recoverActiveWorkspaceJob(jobId);
            scheduleTrainingJobPoll(recoveredJob.id, 1200);
            return;
          } catch (recoverError) {
            clearActiveWorkspaceJob();
            syncJobPreview({
              status: "idle",
              progressIndex: workspaceState.progressIndex >= 0 ? workspaceState.progressIndex : 0,
              logBadgeText: recoverError instanceof Error ? recoverError.message : "当前没有可恢复的运行中任务。",
              runtimeMeta: {
                ...workspaceState.runtimeMeta,
                error: recoverError instanceof Error ? recoverError.message : "当前没有可恢复的运行中任务。",
              },
            });
            return;
          }
        }
        syncJobPreview({
          status: workspaceState.jobStatus === "idle" ? "running" : workspaceState.jobStatus,
          progressIndex: workspaceState.progressIndex >= 0 ? workspaceState.progressIndex : 0,
          logBadgeText: error instanceof Error ? `轮询失败，稍后重试：${error.message}` : "轮询失败，稍后重试。",
          runtimeMeta: {
            ...workspaceState.runtimeMeta,
            error: error instanceof Error ? error.message : "轮询训练状态失败。",
          },
        });
        scheduleTrainingJobPoll(jobId, 2500);
      }
    }, delay);
  }

  async function startRealColmapTraining() {
    const modeConfig = getWorkspaceInputMode(workspaceState.mode);
    const manifest = getWorkspaceUploadManifest(workspaceState.selectedFiles);
    const formData = new FormData();
    const submissionAbortController = new AbortController();
    workspaceState.submissionAbortController = submissionAbortController;
    const payload = {
      mode: workspaceState.mode,
      sceneName: getResolvedWorkspaceSceneName(getWorkspaceSceneName()),
      sceneTags: selectedScene.tags || [],
      selectionSummary: workspaceState.selectionSummary,
      parameterValues: workspaceState.paramValues,
      inputImageDir: workspaceState.paramValues.input_image_dir,
      sourceStrategy: "local-path",
      sourceHint: workspaceState.selectionMeta?.rootName || getWorkspaceSceneName(),
    };

    formData.set("payload", JSON.stringify(payload));
    formData.set("manifest", JSON.stringify(manifest));

    workspaceState.isSubmitting = true;
    renderTimeline(modeConfig.key, 0);
    syncJobPreview({
      status: "queued",
      progressIndex: 0,
      logBadgeText: "正在检查输入数据并准备训练环境...",
      runtimeMeta: {
        source_strategy: "local-path",
        source_hint: workspaceState.selectionMeta?.rootName || getWorkspaceSceneName(),
        resolved_scene_name: getResolvedWorkspaceSceneName(getWorkspaceSceneName()),
        upload_count: 0,
        selected_image_dir: workspaceState.paramValues.input_image_dir,
        sparse_root: workspaceState.paramValues.sparse_root,
        log_excerpt: [
          "[FocusGS] 正在创建训练任务...",
          `mode=${workspaceState.mode}`,
          `scene=${getResolvedWorkspaceSceneName(getWorkspaceSceneName())}`,
          `input_image_dir=${workspaceState.paramValues.input_image_dir}`,
          `sparse_root=${workspaceState.paramValues.sparse_root}`,
        ].join("\n"),
        trainingProgress: {},
        fake_progress_percent: 0,
        fake_progress_label: "正在定位本地数据目录",
      },
    });
    startFakeQueuedProgress();

    try {
      const response = await fetch("/api/train/create", {
        method: "POST",
        body: formData,
        signal: submissionAbortController.signal,
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok || !result.job) {
        throw new Error(result.message || "创建训练任务失败。");
      }

      workspaceState.isSubmitting = false;
      workspaceState.activeJobId = result.job.id;
      persistActiveWorkspaceJobId(result.job.id);
      workspaceState.submissionAbortController = null;
      applyServerJob(result.job);
      void refreshTrainingHistory();
      if (Number(result.job?.trainingProgress?.currentIteration) <= 0) {
        startFakeQueuedProgress();
      }
      switchTab("log");
      scheduleTrainingJobPoll(result.job.id, 1200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        workspaceState.isSubmitting = false;
        clearActiveWorkspaceJob();
        clearFakeProgressTimer();
        workspaceState.submissionAbortController = null;
        syncJobPreview({
          status: "cancelled",
          progressIndex: 0,
          logBadgeText: "上传已中断",
          runtimeMeta: {
            ...workspaceState.runtimeMeta,
            error: "上传已中断",
            log_excerpt: "[FocusGS] 已中断：上传被用户取消。",
          },
        });
        updateDropzoneState("上传已中断", "error");
        return;
      }
      workspaceState.isSubmitting = false;
      clearActiveWorkspaceJob();
      clearFakeProgressTimer();
      workspaceState.submissionAbortController = null;
      syncJobPreview({
        status: "failed",
        progressIndex: 0,
        logBadgeText: error instanceof Error ? error.message : "创建训练任务失败。",
        runtimeMeta: {
          ...workspaceState.runtimeMeta,
          error: error instanceof Error ? error.message : "创建训练任务失败。",
          log_excerpt: `[FocusGS] 创建训练任务失败：${error instanceof Error ? error.message : "未知错误"}`,
        },
      });
      updateDropzoneState(error instanceof Error ? error.message : "创建训练任务失败。", "error");
    }
  }

  function attemptStartTraining() {
    if (!workspaceState.modeActivated || workspaceState.isSubmitting || hasActiveWorkspaceJob() || isExportDemoActive()) return;

    const isReady = commitSelection(workspaceState.selectedFiles);
    if (!isReady) return;

    if (workspaceState.mode !== "colmap") {
      window.alert("当前最小可运行版只接入了 COLMAP 模式的真实训练。图片目录和视频模式会在后续继续补全。");
      return;
    }

    const confirmed = window.confirm(
      `请确认当前 ${getWorkspaceInputMode(workspaceState.mode).label} 的超参数已经设置无误。确认后将开始真实训练任务。`,
    );
    if (!confirmed) return;

    setWorkspaceDetailPanelsHidden(true);
    setSceneGuideCollapsed(true, "auto");
    renderParams(workspaceState.mode);
    setTimelineVisible(true);
    setParamsVisible(true);
    switchTab("log");
    void startRealColmapTraining();
  }

  async function attemptCancelTraining() {
    if (isExportDemoActive()) return;
    if (!hasActiveWorkspaceJob() && !workspaceState.isSubmitting) return;

    if (workspaceState.isSubmitting && workspaceState.submissionAbortController) {
      workspaceState.submissionAbortController.abort();
      return;
    }

    try {
      const job = await cancelTrainingJob(workspaceState.activeJobId);
      applyServerJob(job);
      if (job.state === "cancelling") {
        scheduleTrainingJobPoll(job.id, 700);
      }
    } catch (error) {
      syncJobPreview({
        status: "failed",
        progressIndex: workspaceState.progressIndex >= 0 ? workspaceState.progressIndex : 0,
        logBadgeText: error instanceof Error ? error.message : "中断任务失败。",
        runtimeMeta: {
          ...workspaceState.runtimeMeta,
          error: error instanceof Error ? error.message : "中断任务失败。",
        },
      });
    }
  }

  async function attemptResumeTraining(task) {
    if (!task?.canResume) return;
    openHistoryResumeModal(task);
  }

  async function submitResumeTraining(parentJobId) {
    if (workspaceState.resumeSubmitting) return;
    const task = workspaceState.historyTasks.find((item) => item.id === parentJobId);
    if (!task) {
      window.alert("未找到续训来源任务。");
      return;
    }

    const iterationSelect = document.getElementById("resume-iteration-select");
    const additionalInput = document.getElementById("resume-additional-iterations");
    const outputModeSelect = document.getElementById("resume-output-mode");
    const resumeButton = document.getElementById("history-resume-submit");
    const resumeIteration = Number(iterationSelect?.value);
    const additionalIterations = Number(additionalInput?.value);
    const outputMode = outputModeSelect?.value || "new-dir";

    if (!Number.isFinite(resumeIteration) || resumeIteration <= 0) {
      window.alert("请选择有效的续训 checkpoint。");
      return;
    }
    if (!Number.isFinite(additionalIterations) || additionalIterations <= 0) {
      window.alert("请输入有效的追加训练轮数。");
      return;
    }

    workspaceState.resumeSubmitting = true;
    if (resumeButton instanceof HTMLButtonElement) {
      resumeButton.disabled = true;
      resumeButton.textContent = "正在创建续训任务...";
    }

    try {
      const job = await resumeTrainingJob({
        parentJobId,
        resumeIteration,
        additionalIterations,
        outputMode,
      });

      workspaceState.modeActivated = true;
      workspaceState.isSubmitting = false;
      workspaceState.activeJobId = job.id;
      persistActiveWorkspaceJobId(job.id);
      setWorkspaceDetailPanelsHidden(true);
      setSceneGuideCollapsed(true, "auto");
      setTimelineVisible(true);
      setParamsVisible(true);
      workspaceState.runtimeMeta = {
        ...workspaceState.runtimeMeta,
        timeline_mode: "resume",
      };
      switchTab("log");
      closeHistoryResumeModal();
      applyServerJob(job);
      if (Number(job?.trainingProgress?.currentIteration) <= 0) {
        startFakeQueuedProgress();
      }
      await refreshTrainingHistory();
      scheduleTrainingJobPoll(job.id, 1200);
    } catch (error) {
      workspaceState.resumeSubmitting = false;
      if (resumeButton instanceof HTMLButtonElement) {
        resumeButton.disabled = false;
        resumeButton.textContent = "开始续训";
      }
      window.alert(error instanceof Error ? error.message : "创建续训任务失败。");
    }
  }

  if (tabViewer) tabViewer.addEventListener("click", () => switchTab("viewer"));
  if (tabLog) tabLog.addEventListener("click", () => switchTab("log"));

  sceneGuideToggle?.addEventListener("click", () => {
    setSceneGuideCollapsed(!workspaceState.sceneGuideCollapsed, "manual");
  });

  sceneGuidePanel?.addEventListener("click", (event) => {
    const sceneLink = event.target.closest('a.scene-card[href]');
    if (!sceneLink) return;
    if (!hasActiveWorkspaceJob() && !workspaceState.isSubmitting) return;

    event.preventDefault();
    window.alert("当前训练仍在进行中。为避免丢失任务上下文，场景导览已暂时锁定；请先中断训练或等待任务完成。");
  });

  workspaceViewerExpandBtn?.addEventListener("click", () => {
    setSceneGuideCollapsed(false, "manual");
  });

  // 3. 表单控件交互补充 (Segment切换 & Upload点击)
  segmentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isExportDemoActive()) {
        window.alert("结果导出演示进行中，请先关闭导出窗口或刷新页面后再切换输入模式。");
        return;
      }
      if ((workspaceState.isSubmitting || hasActiveWorkspaceJob()) && button.dataset.inputMode !== workspaceState.mode) {
        window.alert("当前任务仍在进行中，请等待结束后再切换输入模式。");
        return;
      }
      applyMode(button.dataset.inputMode || "images", true);
    });
  });

  if (dropzone) {
    dropzone.addEventListener("click", () => {
      if (isExportDemoActive()) return;
      openPickerForMode();
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("is-dragover");
    });
    dropzone.addEventListener("drop", (event) => {
      void handleDropSelection(event);
    });
  }

  folderInput?.addEventListener("change", () => {
    if (isExportDemoActive()) return;
    commitSelection(Array.from(folderInput.files || []));
    folderInput.value = "";
  });

  videoInput?.addEventListener("change", () => {
    if (isExportDemoActive()) return;
    commitSelection(Array.from(videoInput.files || []));
    videoInput.value = "";
  });

  sceneNameInput?.addEventListener("input", () => {
    if (isExportDemoActive()) return;
    syncJobPreview();
    void refreshTrainingHistory();
  });

  paramsPanel?.addEventListener("input", (event) => {
    if (isExportDemoActive()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const key = target.dataset.paramKey;
    if (!key) return;

    workspaceState.paramValues[key] = readWorkspaceParamControlValue(target);
    if (key === "input_image_dir" || key === "sparse_root") {
      workspaceState.runtimeMeta = {
        ...workspaceState.runtimeMeta,
        selected_image_dir: key === "input_image_dir" ? workspaceState.paramValues[key] : workspaceState.paramValues.input_image_dir,
        sparse_root: key === "sparse_root" ? workspaceState.paramValues[key] : workspaceState.paramValues.sparse_root,
      };
    }
    syncJobPreview();
  });

  paramsPanel?.addEventListener("change", (event) => {
    if (isExportDemoActive()) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const key = target.dataset.paramKey;
    if (!key) return;

    workspaceState.paramValues[key] = readWorkspaceParamControlValue(target);
    if (key === "input_image_dir" || key === "sparse_root") {
      workspaceState.runtimeMeta = {
        ...workspaceState.runtimeMeta,
        selected_image_dir: key === "input_image_dir" ? workspaceState.paramValues[key] : workspaceState.paramValues.input_image_dir,
        sparse_root: key === "sparse_root" ? workspaceState.paramValues[key] : workspaceState.paramValues.sparse_root,
      };
    }
    syncJobPreview();
  });

  setupSceneGallery(selectedScene);

  // Wheel on <input type="number"> often changes the value instead of scrolling.
  // We capture that wheel and forward it to the nearest real scroll container.
  paramsPanel?.addEventListener(
    "wheel",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type !== "number") return;
      if (!paramsPanel) return;

      event.preventDefault();

      const sidebar = paramsPanel.closest(".sidebar");
      const panelCanScroll = paramsPanel.scrollHeight > paramsPanel.clientHeight + 2;
      const sidebarCanScroll = Boolean(sidebar && sidebar.scrollHeight > sidebar.clientHeight + 2);

      if (panelCanScroll) {
        paramsPanel.scrollTop += event.deltaY;
        return;
      }

      if (sidebar && sidebarCanScroll) {
        sidebar.scrollTop += event.deltaY;
        return;
      }

      window.scrollBy({ top: event.deltaY });
    },
    { passive: false },
  );

  paramsPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("#workspace-start-training");
    if (!button) return;
    if (button instanceof HTMLButtonElement && button.disabled) return;
    attemptStartTraining();
  });

  paramsPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("#workspace-cancel-training");
    if (!button) return;
    if (button instanceof HTMLButtonElement && button.disabled) return;
    void attemptCancelTraining();
  });

  document.querySelector(".history-panel")?.addEventListener("click", (event) => {
    const resumeButton = event.target.closest('[data-history-action="resume"]');
    if (!resumeButton) return;
    const task = workspaceState.historyTasks.find((item) => item.id === resumeButton.dataset.jobId);
    if (!task) return;
    void attemptResumeTraining(task);
  });

  historyModalRoot?.addEventListener("click", (event) => {
    const exportCloseTarget = event.target.closest("[data-export-demo-close]");
    if (exportCloseTarget) {
      closeExportDemoModal();
      workspaceState.exportDemoPhase = null;
      clearExportDemoTimer();
      return;
    }
    const closeTarget = event.target.closest("[data-history-modal-close]");
    if (closeTarget) {
      closeHistoryResumeModal();
      return;
    }
    const submitTarget = event.target.closest("#history-resume-submit");
    if (submitTarget) {
      void submitResumeTraining(submitTarget.dataset.jobId || "");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== EXPORT_DEMO_TRIGGER_KEY) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
    event.preventDefault();
    startExportDemoFlow();
  });

  applyMode("images", false, Boolean(readPersistedActiveWorkspaceJobId()));
  syncSceneGuidePanel();
  syncWorkspaceViewerMode();
  const pageKey = new URLSearchParams(window.location.search).get("page") || "";
  const shouldShowTrainingPanels = pageKey === "train";
  setTimelineVisible(shouldShowTrainingPanels);
  setParamsVisible(shouldShowTrainingPanels);
  if (shouldShowTrainingPanels) {
    renderTimeline(workspaceState.mode, -1);
    renderParams(workspaceState.mode);
    switchTab("log");
  }
  updateHistoryPanel([]);
  void refreshTrainingHistory();
  // Deep link from History: /?page=train&scene=...&resume=<jobId>
  if (shouldShowTrainingPanels) {
    const resumeJobId = new URLSearchParams(window.location.search).get("resume") || "";
    if (resumeJobId) {
      void (async () => {
        try {
          const jobs = await fetchTrainingHistory();
          updateHistoryPanel(jobs);
          const target = jobs.find((item) => item.id === resumeJobId);
          if (target?.canResume) {
            openHistoryResumeModal(target);
          }
        } catch {
          // If history fetch fails, we simply skip the auto-open behavior.
        }
      })();
    }
  }
  void restoreActiveWorkspaceJob();
}

function setupSceneGallery(scene) {
  const galleryRoot = document.getElementById("scene-gallery");
  const imageEl = document.getElementById("scene-gallery-image");
  const countEl = document.getElementById("scene-gallery-count");
  const prevBtn = document.getElementById("scene-gallery-prev");
  const nextBtn = document.getElementById("scene-gallery-next");
  if (!galleryRoot || !imageEl || !scene) return;

  const images = Array.isArray(scene.galleryImages) ? scene.galleryImages : [];
  if (images.length <= 1) return;

  let currentIndex = 0;

  const renderImage = (nextIndex) => {
    currentIndex = (nextIndex + images.length) % images.length;
    galleryRoot.classList.add("is-transitioning");

    window.setTimeout(() => {
      imageEl.src = images[currentIndex];
      imageEl.alt = `${scene.name} gallery ${currentIndex + 1}`;
      if (countEl) countEl.textContent = `${currentIndex + 1} / ${images.length}`;
      requestAnimationFrame(() => {
        galleryRoot.classList.remove("is-transitioning");
      });
    }, 110);
  };

  prevBtn?.addEventListener("click", () => renderImage(currentIndex - 1));
  nextBtn?.addEventListener("click", () => renderImage(currentIndex + 1));
}

// ============================================================
// 长首页渲染：展示项目亮点、预览图、画廊
// ============================================================
export function renderHomePage(scenes) {
  document.title = "FocusGS | 3D Gaussian Splatting Showcase";
  stopWorkflowAutoAdvance();
  stopGpuSummaryPolling();

  const featuredScene = scenes[0] || null;
  const sceneCount = scenes.length;
  const activeWorkflowStep = HOME_PIPELINE_STEPS[0];

  document.getElementById("app").innerHTML = `
    <div class="landing-page">
      <nav class="home-nav">
        <div class="home-nav__surface">
          <a class="home-nav-brand" href="/" aria-label="FocusGS Home">
            <span class="home-nav-brand__logo-shell" aria-hidden="true">
              <img class="home-nav-brand__logo home-nav-brand__logo--light" src="/logo.png" alt="" />
              <img class="home-nav-brand__logo home-nav-brand__logo--dark" src="/logo-dark.png" alt="" />
            </span>
            <span class="home-nav-brand__text">
              <span class="home-nav-brand__title">FocusGS</span>
              <span class="home-nav-brand__subtitle">Memory-Efficient 3D Gaussian Splatting</span>
            </span>
          </a>
          <div class="home-nav__actions">
            ${buildPageSwitch(featuredScene?.id || "garden", "home")}
            <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换亮/暗色主题">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <section class="hero-section">
        <div class="hero-bg-glow" data-parallax-speed="0.28" data-parallax-max="88"></div>
        <div class="hero-content">
          <p class="eyebrow">FOCUSGS FRAMEWORK</p>
          <h1 class="hero-title">更省显存，更轻量走进 3DGS</h1>
          <p class="hero-subtitle">FocusGS 聚焦 3D Gaussian Splatting，引入 MEGS² 的显存优化能力，并结合轻量化高斯资产存储，让高质量三维重建在有限硬件上也能顺畅运行、快速加载与展示。</p>
          <div class="hero-demo-strip">
            ${buildHeroDemoStrip()}
          </div>
          <div class="hero-highlights">
            <span>3DGS Core</span>
            <span>MEGS² Strategy</span>
            <span>${sceneCount} Scenes Ready</span>
          </div>
          <div class="hero-actions">
            <a href="/?scene=${featuredScene?.id || "garden"}" class="btn btn--primary">进入展示</a>
            <a href="/?page=train&scene=${featuredScene?.id || "garden"}" class="btn btn--outline">开始训练</a>
          </div>
          <div style="margin-top: 10px;">
            <a
              href="#showcase"
              style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); text-decoration: none;"
            >
              看看有哪些场景 →
            </a>
          </div>
        </div>
      </section>

      <section class="method-section" id="method">
        <div class="method-layout">
          <div class="section-header section-header--centered method-header">
            <p class="section-kicker">METHOD OVERVIEW</p>
            <h2>更轻的 3DGS，先从显存优化开始。</h2>
            <p>FocusGS 结合 MEGS² 显存优化与轻量化高斯资产保存，在保证三维重建质量的同时，进一步降低运行负担与结果体积。</p>
          </div>
          <div class="method-visual-shell" data-parallax-speed="0.06" data-parallax-max="42">
            ${buildMethodVisual()}
          </div>
          <div class="method-summary">
            <p>FocusGS 以 3D Gaussian Splatting 作为三维重建与渲染主线，并重点吸收 MEGS² 的核心思想来优化显存开销。在表示层面，MEGS² 不再沿用传统 3DGS 中较重的 SH 颜色表示，而是引入更轻量的 Spherical Gaussian 颜色建模方式，用更紧凑的参数结构描述视角相关外观，从源头压缩单个 Gaussian primitive 的存储负担。在结构层面，MEGS² 进一步提出统一剪枝思路，不再把“删掉哪些 Gaussian”与“删掉哪些颜色参数”割裂处理，而是用一套更一致的策略同时约束 primitive 数量与其内部参数规模，从而在训练阶段和渲染阶段都显著缓解显存压力。对 FocusGS 而言，这样的收益并不只是模型更省显存，更关键的是它让 3DGS 在有限硬件条件下也能保持较稳定的重建质量与可训练性，在 PSNR、SSIM、LPIPS 等指标尽量保持竞争力的前提下，把效率优化真正落实到三维重建流程本身。</p>
          </div>
        </div>
      </section>

      <section class="asset-save-section">
        <div class="method-layout">
          <div class="section-header section-header--centered asset-save-header">
            <p class="section-kicker">LIGHTWEIGHT ASSET STORAGE</p>
            <h2>更轻的 3DGS，结果文件也会轻量化储存。</h2>
            <p>FocusGS 在训练完成之后，继续面向展示与发布环节整理 Gaussian 结果，将原始重建输出转换为更适合网页传输、快速加载与浏览器预览的轻量资产形态。</p>
          </div>
          <div class="asset-save-grid">
            ${buildLightweightAssetCards()}
          </div>
        </div>
      </section>

      <section id="showcase" class="showcase-section">
        <div class="section-header section-header--centered">
          <p class="section-kicker">Scene Showcase</p>
          <h2>九个场景，持续扩展的 3DGS 演示入口。</h2>
          <p class="showcase-section__subtitle">从预训练结果到后续新实验场景，FocusGS 让场景展示区保持可新增、可切换、可进入展示页的连续体验。</p>
        </div>
        <div class="showcase-shell">
          <div class="showcase-stage" id="showcase-feature" data-parallax-speed="0.08" data-parallax-max="56">
            ${featuredScene ? buildShowcaseFeature(featuredScene) : ""}
          </div>
          <div class="showcase-carousel-shell" id="showcase-carousel-shell">
            ${featuredScene ? buildShowcaseCarousel(featuredScene, scenes) : ""}
          </div>
        </div>
      </section>

      <section class="workflow-section" id="workflow">
        <div class="section-header section-header--centered">
          <p class="section-kicker">Workflow</p>
          <h2>三种输入入口，对应三条清晰的重建路径。</h2>
          <p>无论是图片目录、单个视频，还是已处理好的 COLMAP 工程，FocusGS 都会把它们收束到统一的重建训练、结果导出与历史记录流程里。</p>
        </div>
        <div class="workflow-shell" data-active-index="0" data-parallax-speed="0.07" data-parallax-max="52">
          <div class="workflow-tabs" id="workflow-tabs">
            ${buildWorkflowTabs(HOME_PIPELINE_STEPS, 0)}
          </div>
          <div class="workflow-stage">
            <div class="workflow-copy" id="workflow-copy">
              ${buildWorkflowCopy(activeWorkflowStep)}
            </div>
            <div class="workflow-media" id="workflow-media">
              ${buildWorkflowVisual(activeWorkflowStep)}
            </div>
          </div>
        </div>
      </section>

      <section class="cta-section" id="cta">
        <div class="cta-card">
          <div class="cta-copy">
            <p class="section-kicker">Launch the Studio</p>
            <h2>FocusGS 让 3DGS 在有限显存条件下也能顺畅展示。</h2>
            <p>从场景成果浏览到训练实验，这个首页负责建立第一印象；真正的三维重建、日志与历史管理将在后续页面里继续展开。</p>
          </div>
          <div class="cta-actions cta-actions--stacked">
            <a class="btn btn--primary" href="/?page=train&scene=${featuredScene?.id || "garden"}">开始训练</a>
            <a class="btn btn--outline" href="/?scene=${featuredScene?.id || "garden"}">先逛展示</a>
          </div>
        </div>
      </section>

      <footer class="footer footer--minimal">
        <span>© 2026 FocusGS Project. All rights reserved.</span>
      </footer>
    </div>
  `;

  setTimeout(() => {
    setupParallax();
    setupShowcaseInteraction(scenes);
    setupWorkflowInteraction(HOME_PIPELINE_STEPS);
  }, 0);
}

// ============================================================
// 工作台渲染：展示单场景的 3D Viewer + 信息 + 历史任务
// @param {Array} scenes 所有场景列表
// @param {Object} selectedScene 当前场景
// @param {Array} history 该场景的历史任务列表
// ============================================================
export function renderWorkspacePage(
  scenes,
  selectedScene,
  history = [],
) {
  stopWorkflowAutoAdvance();
  document.title = `${selectedScene.name} | FocusGS Studio`;

  document.getElementById("app").innerHTML = `
    <div class="layout studio-layout">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar__left">
          <a class="home-nav-brand home-nav-brand--compact" href="/" aria-label="FocusGS Home">
            <span class="home-nav-brand__logo-shell" aria-hidden="true">
              <img class="home-nav-brand__logo home-nav-brand__logo--light" src="/logo.png" alt="" />
              <img class="home-nav-brand__logo home-nav-brand__logo--dark" src="/logo-dark.png" alt="" />
            </span>
            <span class="home-nav-brand__text">
              <span class="home-nav-brand__title">FocusGS</span>
              <span class="home-nav-brand__subtitle">Memory-Efficient 3D Gaussian Splatting</span>
            </span>
          </a>
          ${buildTopbarPageTitle("展示", selectedScene?.name || selectedScene?.id || "")}
        </div>
        <div class="topbar__actions">
           ${buildPageSwitch(selectedScene.id, "showcase")}
           <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换主题">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
           </button>
           <button class="btn btn--icon" id="btn-reset-view" title="重置到初始视角" onclick="focusGSStudioResetView()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           </button>
           <button class="btn btn--icon" id="btn-toggle-fullscreen" title="全屏查看" onclick="focusGSStudioToggleFullscreen()">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           </button>
        </div>
      </header>

      <!-- 左侧控制面板 -->
      <aside class="sidebar sidebar--left">
        <!-- 场景导览 -->
        <section class="panel action-panel scene-guide-panel" id="scene-guide-panel">
          <div class="scene-guide-panel__head">
            <h2>场景导览区</h2>
            <button type="button" class="scene-guide-panel__toggle" id="scene-guide-toggle" aria-expanded="true">收起</button>
          </div>
          <div class="scene-grid-small">
            ${buildSceneCards(scenes, selectedScene.id)}
          </div>
        </section>
      </aside>

      <!-- 中间主视图：Viewer -->
      <main class="viewer-shell">
        <!-- 3D 渲染容器 -->
        <div class="viewer-stage" id="view-stage">
          <div class="viewer-overlay" id="status-overlay">
              <div class="viewer-spinner"></div>
              <span>Loading pretrained ${selectedScene.id} splats...</span>
          </div>
          <div class="viewer-status-text" id="status">Initiating Viewer...</div>
          <div id="viewer"></div>
        </div>
      </main>

      <!-- 右侧信息与时间线面板 -->
      <aside class="sidebar sidebar--right">
        <section class="panel info-panel workspace-detail-panel">
          <h2>场景简介</h2>
          <p class="desc">${selectedScene.description}</p>
          <div class="sys-item" style="margin-top:12px;">
              <span>数据集来源</span>
              <p style="color:var(--text-main);">${selectedScene.dataset}</p>
          </div>
          <div class="tag-row">${buildTagList(selectedScene.tags)}</div>
        </section>

        <section class="panel metrics-panel workspace-detail-panel">
          <h2>指标 (Iteration ${selectedScene.iteration})</h2>
          <div class="metrics-grid">
             <div class="metric-item">
                 <span class="metric-label">PSNR↑</span>
                 <strong class="metric-val ${selectedScene.metrics?.psnr ? "" : "metric-tbd"}">${formatMetricByType("psnr", selectedScene.metrics?.psnr)}</strong>
             </div>
             <div class="metric-item">
                 <span class="metric-label">SSIM↑</span>
                 <strong class="metric-val ${selectedScene.metrics?.ssim ? "" : "metric-tbd"}">${formatMetricByType("ssim", selectedScene.metrics?.ssim)}</strong>
             </div>
             <div class="metric-item">
                 <span class="metric-label">LPIPS↓</span>
                 <strong class="metric-val ${selectedScene.metrics?.lpips ? "" : "metric-tbd"}">${formatMetricByType("lpips", selectedScene.metrics?.lpips)}</strong>
             </div>
          </div>
        </section>

        ${buildSceneHighlightPanel(selectedScene)}

        <section class="panel help-panel">
          <h2>性能摘要</h2>
          ${buildPerformanceSummary()}
        </section>
      </aside>
    </div>
    <div id="history-modal-root"></div>
  `;

  setTimeout(() => {
    setupSlimSceneGuideInteraction();
    setupSceneGallery(selectedScene);
    setupGpuSummary();
  }, 0);
}

export function renderTrainPage(scenes, selectedScene) {
  stopWorkflowAutoAdvance();
  document.title = `训练 | ${selectedScene?.name || "FocusGS"}`;

  const scene = selectedScene || scenes?.[0] || { id: "garden", name: "Garden" };

  document.getElementById("app").innerHTML = `
    <div class="layout studio-layout studio-layout--train">
      <header class="topbar">
        <div class="topbar__left">
          <a class="home-nav-brand home-nav-brand--compact" href="/" aria-label="FocusGS Home">
            <span class="home-nav-brand__logo-shell" aria-hidden="true">
              <img class="home-nav-brand__logo home-nav-brand__logo--light" src="/logo.png" alt="" />
              <img class="home-nav-brand__logo home-nav-brand__logo--dark" src="/logo-dark.png" alt="" />
            </span>
            <span class="home-nav-brand__text">
              <span class="home-nav-brand__title">FocusGS</span>
              <span class="home-nav-brand__subtitle">Memory-Efficient 3D Gaussian Splatting</span>
            </span>
          </a>
          ${buildTopbarPageTitle("训练", "三维重建训练")}
        </div>
        <div class="topbar__actions">
          ${buildPageSwitch(scene.id, "train")}
          <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换主题">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
        </div>
      </header>

      <aside class="sidebar sidebar--left">
        <section class="panel task-create-panel">
          <h2>创建任务</h2>

          <div class="segmented-control">
            <button class="segment active" type="button" data-input-mode="images">图片目录</button>
            <button class="segment" type="button" data-input-mode="video">单个视频</button>
            <button class="segment" type="button" data-input-mode="colmap">COLMAP</button>
          </div>

          <div class="form-group">
            <label>场景名</label>
            <input id="workspace-scene-name" type="text" class="input-field" placeholder="${scene.id}" value="${scene.id}" />
          </div>

          <div class="form-group">
            <label id="workspace-input-label">选择一个图片目录</label>
            <div class="upload-dropzone">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
               <p id="upload-dropzone-title">拖拽图片文件夹到这里，或点击选择目录。</p>
               <span id="upload-dropzone-hint">支持任何图像格式</span>
               <small id="upload-dropzone-status" class="upload-dropzone__status">尚未选择输入源</small>
            </div>
            <input id="workspace-folder-input" type="file" hidden webkitdirectory directory multiple />
            <input id="workspace-video-input" type="file" hidden accept="video/*" />
          </div>
        </section>

        <section class="panel help-panel">
          <h2>性能摘要</h2>
          ${buildPerformanceSummary()}
        </section>
      </aside>

      <main class="viewer-shell">
        <div class="viewer-tabs viewer-tabs--title">
          <div class="viewer-tabs__title">日志记录</div>
        </div>

        <div class="log-stage" id="log-stage" style="display: flex;">
          ${buildTrainingProgressPanel()}
          <div class="train-timeline-inline" id="train-timeline-inline"></div>
          <div class="log-header">
            <div class="log-title">
              <strong>训练日志</strong>
              <div class="log-badge" id="log-status-badge">
                 <span class="status-dot status-dot--success"></span>
                 任务空闲
              </div>
            </div>
          </div>
          <div class="log-content-wrapper">
             <pre class="code-log"><code id="json-log-content">等待任务启动...</code></pre>
          </div>
        </div>
      </main>

      <aside class="sidebar sidebar--right">
        <section class="panel workspace-params-panel" id="workspace-params-panel">
          <h2>重建参数</h2>
        </section>

        ${buildTrainingRuntimePanel()}
      </aside>
    </div>
    <div id="history-modal-root"></div>
  `;

  setTimeout(() => {
    setupWorkspaceInteraction(selectedScene || scene);
    setupGpuSummary();
  }, 0);
}

export function renderHistoryPage(scenes, selectedScene) {
  stopWorkflowAutoAdvance();
  document.title = `历史 | ${selectedScene?.name || "FocusGS"}`;

  const scene = selectedScene || scenes?.[0] || { id: "garden", name: "Garden" };
  const sceneOptions = (Array.isArray(scenes) ? scenes : [])
    .map((item) => `<option value="${item.id}">${item.name || item.id}</option>`)
    .join("");

  document.getElementById("app").innerHTML = `
    <div class="layout studio-layout studio-layout--history">
      <header class="topbar">
        <div class="topbar__left">
          <a class="home-nav-brand home-nav-brand--compact" href="/" aria-label="FocusGS Home">
            <span class="home-nav-brand__logo-shell" aria-hidden="true">
              <img class="home-nav-brand__logo home-nav-brand__logo--light" src="/logo.png" alt="" />
              <img class="home-nav-brand__logo home-nav-brand__logo--dark" src="/logo-dark.png" alt="" />
            </span>
            <span class="home-nav-brand__text">
              <span class="home-nav-brand__title">FocusGS</span>
              <span class="home-nav-brand__subtitle">Memory-Efficient 3D Gaussian Splatting</span>
            </span>
          </a>
          ${buildTopbarPageTitle("历史", "实验结果与记录")}
        </div>
        <div class="topbar__actions">
          ${buildPageSwitch(scene.id, "history")}
          <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换主题">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
        </div>
      </header>

      <main class="history-shell">
        <aside class="history-favorites" aria-label="Favorites">
          <div class="history-favorites__head">
            <div>
              <p class="history-favorites__eyebrow">FAVORITES</p>
              <h2>收藏夹</h2>
            </div>
            <span class="history-count" id="history-fav-count">0</span>
          </div>
          <div class="history-favorites__list" id="history-fav-list"></div>
          <div class="history-favorites__editor" id="history-fav-editor" style="display:none;">
            <div class="history-favorites__field">
              <label for="history-fav-alias">重命名</label>
              <input id="history-fav-alias" class="input-field" type="text" placeholder="给这个实验起个名字" />
            </div>
            <div class="history-favorites__field">
              <label for="history-fav-note">备注</label>
              <textarea id="history-fav-note" class="input-field" rows="4" placeholder="记录参数变化、对比结论、下一步计划..."></textarea>
            </div>
            <div class="history-favorites__actions">
              <button type="button" class="btn btn--outline" id="history-fav-remove">取消收藏</button>
              <button type="button" class="btn btn--primary" id="history-fav-save">保存</button>
            </div>
          </div>
          <div class="history-favorites__empty" id="history-fav-empty">
            暂无收藏。你可以在右侧列表点 ☆ 收藏重要任务。
          </div>
        </aside>

        <section class="history-board" aria-label="History board">
          <div class="history-board__inner">
            <div class="history-board__head">
              <div>
                <p class="history-board__eyebrow">HISTORY</p>
                <h2>历史记录</h2>
              </div>
              <span class="history-count" id="history-v1-count">—</span>
            </div>
            <div class="history-v1-toolbar" aria-label="History filters">
              <div class="history-filter">
                <div class="history-filter__field history-filter__field--search">
                  <label for="history-search" class="history-filter__label">搜索</label>
                  <input id="history-search" type="search" class="input-field" placeholder="scene / jobId / 关键词" />
                </div>
                <div class="history-filter__field">
                  <label for="history-scene-select" class="history-filter__label">场景</label>
                  <select id="history-scene-select" class="workspace-params-input">
                    <option value="">All scenes</option>
                    ${sceneOptions}
                  </select>
                </div>
                <div class="history-filter__field">
                  <label for="history-sort-select" class="history-filter__label">排序</label>
                  <select id="history-sort-select" class="workspace-params-input">
                    <option value="updated_desc" selected>Updated ↓</option>
                    <option value="created_desc">Created ↓</option>
                  </select>
                </div>
              </div>

              <div class="history-filter__chips">
                <div class="segmented-control history-status-chips" id="history-status-chips">
                  <button class="segment active" type="button" data-status="all">All</button>
                  <button class="segment" type="button" data-status="running">Running</button>
                  <button class="segment" type="button" data-status="success">Success</button>
                  <button class="segment" type="button" data-status="failed">Failed</button>
                  <button class="segment" type="button" data-status="cancelled">Cancelled</button>
                </div>
                <div class="history-filter__actions">
                  <span class="history-count" id="history-v1-count">—</span>
                  <button type="button" class="btn btn--ghost history-import-btn" id="history-import-btn">自定义导入</button>
                </div>
              </div>
            </div>

            <div class="history-v1-list" id="history-v1-list" aria-label="History list"></div>
          </div>
        </section>
      </main>
    </div>
    <div id="history-modal-root"></div>
  `;

  setTimeout(() => {
    setupHistoryPageInteraction(scenes, scene);
  }, 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createHistoryPathActions(job) {
  const workspacePath = String(job?.workspacePath || "");
  const outputPath = String(job?.modelPath || "");
  const logPath = String(job?.logPath || "");
  const previewPath = String(job?.preview?.filePath || "");

  return `
    <div class="history-drawer__path-actions">
      <button type="button" class="btn btn--xs btn--ghost" data-history-path-target="output" data-path="${escapeHtml(outputPath)}">结果目录</button>
      <button type="button" class="btn btn--xs btn--ghost" data-history-path-target="log" data-path="${escapeHtml(logPath)}">日志目录</button>
      ${previewPath ? `<button type="button" class="btn btn--xs btn--ghost" data-history-path-target="preview" data-path="${escapeHtml(previewPath)}">预览文件</button>` : ""}
      ${workspacePath ? `<button type="button" class="btn btn--xs btn--ghost" data-history-path-target="workspace" data-path="${escapeHtml(workspacePath)}">数据目录</button>` : ""}
    </div>
  `;
}

function buildHistoryPathDialog({ title = "路径详情", path = "", note = "" } = {}) {
  const safePath = escapeHtml(path || "—");
  const safeNote = escapeHtml(note || "可以复制路径到本机文件管理器中打开。浏览器页面本身通常不能直接拉起系统文件夹。");
  return `
    <div class="history-path-modal is-visible" id="history-path-modal" aria-hidden="false">
      <div class="history-path-modal__backdrop" data-history-path-close="true"></div>
      <div class="history-path-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="history-path-title">
        <div class="history-path-modal__head">
          <div>
            <p class="history-path-modal__eyebrow">LOCAL PATH</p>
            <h3 id="history-path-title">${escapeHtml(title)}</h3>
          </div>
          <button type="button" class="history-path-modal__close" data-history-path-close="true" aria-label="关闭">×</button>
        </div>
        <div class="history-path-modal__body">
          <p class="history-path-modal__note">${safeNote}</p>
          <pre class="history-path-modal__code"><code id="history-path-value">${safePath}</code></pre>
        </div>
        <div class="history-path-modal__actions">
          <button type="button" class="btn btn--outline" data-history-path-copy="true">复制路径</button>
        </div>
      </div>
    </div>
  `;
}

function buildHistoryImportDialog({ sceneOptions = "", defaultScene = "", defaultRunName = "" } = {}) {
  return `
    <div class="history-import-modal is-visible" id="history-import-modal" aria-hidden="false">
      <div class="history-import-modal__backdrop" data-history-import-close="true"></div>
      <div class="history-import-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="history-import-title">
        <div class="history-import-modal__head">
          <div>
            <p class="history-import-modal__eyebrow">CUSTOM IMPORT</p>
            <h3 id="history-import-title">自定义导入</h3>
          </div>
          <button type="button" class="history-import-modal__close" data-history-import-close="true" aria-label="关闭">×</button>
        </div>
        <form class="history-import-modal__body" id="history-import-form">
          <div class="history-import-modal__grid">
            <div class="history-import-modal__field history-import-modal__field--wide">
              <label for="history-import-run-name">名称</label>
              <input id="history-import-run-name" class="input-field" type="text" maxlength="80" value="${escapeHtml(defaultRunName)}" placeholder="自定义导入名称" />
            </div>
            <div class="history-import-modal__field">
              <label for="history-import-scene-select">场景</label>
              <select id="history-import-scene-select" class="workspace-params-input">
                ${sceneOptions}
              </select>
            </div>
            <div class="history-import-modal__field">
              <label for="history-import-new-scene">新场景名</label>
              <input id="history-import-new-scene" class="input-field" type="text" maxlength="80" placeholder="可选，填写后覆盖上面的场景" />
            </div>
            <div class="history-import-modal__field">
              <label for="history-import-iteration">迭代</label>
              <input id="history-import-iteration" class="input-field" type="number" min="0" step="1" value="1" placeholder="1" />
            </div>
            <div class="history-import-modal__field history-import-modal__field--wide">
              <label for="history-import-note">备注</label>
              <textarea id="history-import-note" class="input-field" rows="3" placeholder="可写导入说明、模型来源、补充信息..."></textarea>
            </div>
            <div class="history-import-modal__field history-import-modal__field--wide">
              <label for="history-import-tags">标签</label>
              <input id="history-import-tags" class="input-field" type="text" placeholder="逗号分隔，例如 imported, demo" />
            </div>
            <div class="history-import-modal__field history-import-modal__field--wide">
              <label for="history-import-ply">PLY 文件</label>
              <div class="history-import-dropzone" id="history-import-dropzone" tabindex="0" role="button" aria-label="拖拽或点击导入 PLY 文件">
                <div class="history-import-dropzone__title">拖拽 point_cloud.ply 到这里</div>
                <div class="history-import-dropzone__meta" id="history-import-dropzone-meta">或点击选择文件（仅 .ply）</div>
                <input id="history-import-ply" class="history-import-dropzone__input" type="file" accept=".ply" />
              </div>
            </div>
          </div>
          <div class="history-import-modal__hint">导入后的记录会直接出现在历史列表中；日志和参数暂时以黑色代码块占位。</div>
          <div class="history-import-modal__error" id="history-import-error" style="display:none;"></div>
          <div class="history-import-modal__actions">
            <button type="button" class="btn btn--outline" data-history-import-close="true">取消</button>
            <button type="submit" class="btn btn--primary" id="history-import-submit">导入</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function getHistoryRouteState() {
  const params = new URLSearchParams(window.location.search);
  const jobId = String(params.get("job") || "").trim();
  const tabRaw = String(params.get("tab") || "").trim();
  const tab = ["overview", "params", "logs", "viewer"].includes(tabRaw) ? tabRaw : "overview";
  const scene = String(params.get("scene") || "").trim();
  return { jobId, tab, scene };
}

function updateHistoryRouteState({ jobId = "", tab = "overview", scene = undefined } = {}, { replace = false } = {}) {
  const url = new URL(window.location.href);
  url.searchParams.set("page", "history");

  if (scene !== undefined) {
    if (scene) url.searchParams.set("scene", scene);
    else url.searchParams.delete("scene");
  }

  if (jobId) {
    url.searchParams.set("job", jobId);
    url.searchParams.set("tab", tab || "overview");
  } else {
    url.searchParams.delete("job");
    url.searchParams.delete("tab");
  }

  const nextUrl = `${url.pathname}?${url.searchParams.toString()}`;
  if (replace) {
    window.history.replaceState({ focusgsHistory: true }, "", nextUrl);
  } else {
    window.history.pushState({ focusgsHistory: true }, "", nextUrl);
  }
}

function buildHistoryV1Row(job, favorites = null) {
  const { cls, label } = getStatusMeta(job.status || job.state);
  const runName = escapeHtml(job.runName || job.sceneName || job.id);
  const sceneName = escapeHtml(job.sceneName || "—");
  const updatedAt = formatDate(job.updatedAt || job.createdAt);
  const createdAt = formatDate(job.createdAt);
  const modeLabel = escapeHtml(job.mode || "—");
  const hasIter = Number(job.currentIteration) > 0;
  const iterText = hasIter
    ? `${Math.max(0, Math.round(Number(job.currentIteration) || 0))} / ${Math.max(0, Math.round(Number(job.totalIterations) || 0))} iter`
    : "未开始迭代";
  const stageText = escapeHtml(job.stage || job.message || "");
  const pillClass = `status-pill--${escapeHtml(job.status || job.state || "queued")}`;
  const fav = favorites && job?.id ? favorites[String(job.id)] : null;
  const isFav = Boolean(fav);

  return `
    <div class="history-v1-row" role="button" tabindex="0" data-job-id="${escapeHtml(job.id)}">
      <span class="status-dot ${cls}" aria-label="${label}"></span>
      <div class="history-v1-row__main">
        <div class="history-v1-row__top">
          <div class="history-v1-row__title">
            <strong class="history-v1-row__name">${runName}</strong>
            <span class="history-v1-row__pill ${pillClass}">${label}</span>
          </div>
          <div class="history-v1-row__time" title="Updated">${updatedAt}</div>
        </div>
        <div class="history-v1-row__meta">
          <span>${sceneName}</span>
          <span class="history-v1-row__sep">·</span>
          <span>${modeLabel}</span>
          <span class="history-v1-row__sep">·</span>
          <span>${escapeHtml(iterText)}</span>
          ${stageText ? `<span class="history-v1-row__sep">·</span><span class="history-v1-row__stage">${stageText}</span>` : ""}
        </div>
        <div class="history-v1-row__sub">
          <span>Created ${createdAt}</span>
          ${job.duration ? `<span class="history-v1-row__sep">·</span><span>${escapeHtml(job.duration)}</span>` : ""}
        </div>
      </div>
      <div class="history-v1-row__actions">
        <button type="button" class="history-fav-toggle ${isFav ? "is-active" : ""}" data-fav-toggle="true" data-job-id="${escapeHtml(job.id)}" aria-label="${isFav ? "取消收藏" : "收藏"}" title="${isFav ? "已收藏" : "收藏"}">
          <span aria-hidden="true">${isFav ? "★" : "☆"}</span>
        </button>
        <div class="history-v1-row__chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>
  `;
}

function buildHistoryDrawerMarkup({ jobId, tab = "overview" } = {}) {
  return `
    <div class="history-drawer is-visible" id="history-drawer" aria-hidden="false">
      <div class="history-drawer__backdrop" data-history-drawer-close="true"></div>
      <div class="history-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="history-drawer-title">
        <div class="history-drawer__head">
          <div class="history-drawer__heading">
            <p class="history-drawer__eyebrow">JOB INSPECTOR</p>
            <h3 id="history-drawer-title">加载中...</h3>
            <div class="history-drawer__head-meta">
              <span class="history-drawer__status status-pill--queued">—</span>
              <span class="history-drawer__updated">—</span>
            </div>
          </div>
          <div class="history-drawer__head-actions">
            <a class="btn btn--xs btn--ghost" id="history-drawer-to-train" href="/?page=train">去训练页</a>
            <a class="btn btn--xs btn--ghost" id="history-drawer-resume" href="#" style="display:none;">断点续训</a>
            <button type="button" class="history-drawer__close" data-history-drawer-close="true" aria-label="关闭">×</button>
          </div>
        </div>

        <div class="history-drawer__tabs" role="tablist" aria-label="Job tabs">
          <button class="history-drawer__tab ${tab === "overview" ? "is-active" : ""}" type="button" role="tab" data-history-tab="overview">概览</button>
          <button class="history-drawer__tab ${tab === "params" ? "is-active" : ""}" type="button" role="tab" data-history-tab="params">参数</button>
          <button class="history-drawer__tab ${tab === "logs" ? "is-active" : ""}" type="button" role="tab" data-history-tab="logs">日志</button>
          <button class="history-drawer__tab ${tab === "viewer" ? "is-active" : ""}" type="button" role="tab" data-history-tab="viewer">预览</button>
        </div>

        <div class="history-drawer__body">
          <section class="history-drawer__tab-panel ${tab === "overview" ? "is-active" : ""}" data-history-tab-panel="overview"></section>
          <section class="history-drawer__tab-panel ${tab === "params" ? "is-active" : ""}" data-history-tab-panel="params"></section>
          <section class="history-drawer__tab-panel ${tab === "logs" ? "is-active" : ""}" data-history-tab-panel="logs"></section>
          <section class="history-drawer__tab-panel ${tab === "viewer" ? "is-active" : ""}" data-history-tab-panel="viewer"></section>
        </div>
      </div>
    </div>
  `;
}

function buildHistoryPlaceholderCode(text) {
  return `
    <div class="history-drawer__code">
      <pre class="code-log"><code>${escapeHtml(text)}</code></pre>
    </div>
  `;
}

function setupHistoryPageInteraction(scenes, defaultScene) {
  const root = document.querySelector(".studio-layout--history");
  if (!root || root.dataset.boundHistoryV1 === "true") return;
  root.dataset.boundHistoryV1 = "true";

  const searchEl = document.getElementById("history-search");
  const sceneSelect = document.getElementById("history-scene-select");
  const sortSelect = document.getElementById("history-sort-select");
  const statusChips = document.getElementById("history-status-chips");
  const countA = document.getElementById("history-v1-count");
  const countB = document.getElementById("history-v1-count-2");
  const listEl = document.getElementById("history-v1-list");
  const favListEl = document.getElementById("history-fav-list");
  const favCountEl = document.getElementById("history-fav-count");
  const favEmptyEl = document.getElementById("history-fav-empty");
  const favEditorEl = document.getElementById("history-fav-editor");
  const favAliasEl = document.getElementById("history-fav-alias");
  const favNoteEl = document.getElementById("history-fav-note");
  const favSaveBtn = document.getElementById("history-fav-save");
  const favRemoveBtn = document.getElementById("history-fav-remove");
  const modalRoot = document.getElementById("history-modal-root");

  const FAVORITES_STORAGE_KEY = "focusgs-history-favorites-v1";
  const HISTORY_IMPORT_STORAGE_KEY = "focusgs-history-import-new-scenes-v1";

  const state = {
    jobs: [],
    activeStatus: "all",
    search: "",
    scene: "",
    sort: "updated_desc",
    drawerJobId: "",
    drawerTab: "overview",
    drawerJob: null,
    drawerLogs: "",
    viewer: null,
    viewerJobId: "",
    favorites: {},
    favoriteOrder: [],
    activeFavoriteJobId: "",
    importDialogOpen: false,
  };

  function getSceneOptionsFromJobs(jobs = []) {
    const baseScenes = Array.isArray(scenes) ? scenes : [];
    const seen = new Map();
    for (const scene of baseScenes) {
      if (scene?.id) seen.set(String(scene.id), scene);
    }
    for (const job of jobs) {
      const sceneId = String(job?.sceneName || "").trim();
      if (!sceneId) continue;
      if (!seen.has(sceneId)) {
        seen.set(sceneId, { id: sceneId, name: sceneId });
      }
    }
    return Array.from(seen.values());
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return { favorites: {}, order: [] };
      const parsed = JSON.parse(raw);
      const items = parsed && typeof parsed === "object" ? parsed.items : null;
      const order = parsed && typeof parsed === "object" ? parsed.order : null;
      if (!items || typeof items !== "object") return { favorites: {}, order: [] };
      return {
        favorites: items,
        order: Array.isArray(order) ? order.map((id) => String(id)) : [],
      };
    } catch {
      return { favorites: {}, order: [] };
    }
  }

  function persistFavorites() {
    try {
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify({ v: 1, items: state.favorites, order: state.favoriteOrder }),
      );
    } catch {
      // ignore
    }
  }

  function ensureFavoriteOrder() {
    const existing = new Set(Object.keys(state.favorites || {}).map((id) => String(id)));
    const order = Array.isArray(state.favoriteOrder) ? state.favoriteOrder.map((id) => String(id)) : [];
    const normalized = [];
    order.forEach((id) => {
      if (existing.has(id) && !normalized.includes(id)) normalized.push(id);
    });
    existing.forEach((id) => {
      if (!normalized.includes(id)) normalized.push(id);
    });
    state.favoriteOrder = normalized;
  }

  function getJobById(jobId) {
    const id = String(jobId || "");
    return (Array.isArray(state.jobs) ? state.jobs : []).find((job) => String(job?.id || "") === id) || null;
  }

  function renderFavoriteEditor(jobId) {
    const id = String(jobId || "");
    state.activeFavoriteJobId = id;
    const fav = state.favorites[id] || null;
    if (!fav) {
      if (favEditorEl) favEditorEl.style.display = "none";
      if (favAliasEl) favAliasEl.value = "";
      if (favNoteEl) favNoteEl.value = "";
      return;
    }
    if (favEditorEl) favEditorEl.style.display = "";
    if (favAliasEl) favAliasEl.value = String(fav.alias || "");
    if (favNoteEl) favNoteEl.value = String(fav.note || "");
  }

  function buildFavoriteRow(job, favMeta, jobId, isActive) {
    const title = escapeHtml(favMeta?.alias || job?.runName || job?.sceneName || jobId || "—");
    const sub = escapeHtml(favMeta?.note || job?.sceneName || jobId || "");
    return `
      <button type="button" class="history-fav-item ${isActive ? "is-active" : ""}" data-fav-item="true" data-job-id="${escapeHtml(jobId)}">
        <strong>${title}</strong>
        <span>${sub}</span>
      </button>
    `;
  }

  function renderFavorites() {
    if (!favListEl) return;
    ensureFavoriteOrder();
    const ids = state.favoriteOrder.filter((id) => Boolean(state.favorites[id]));
    if (favCountEl) favCountEl.textContent = String(ids.length);
    if (favEmptyEl) favEmptyEl.style.display = ids.length ? "none" : "";
    if (!ids.length) {
      favListEl.innerHTML = "";
      if (favEditorEl) favEditorEl.style.display = "none";
      return;
    }

    const rows = ids.map((id) => {
      const job = getJobById(id);
      return buildFavoriteRow(job, state.favorites[id], id, id === state.activeFavoriteJobId);
    }).join("");
    favListEl.innerHTML = rows;

    // If current active favorite disappears, reset editor.
    if (state.activeFavoriteJobId && !state.favorites[state.activeFavoriteJobId]) {
      state.activeFavoriteJobId = "";
      renderFavoriteEditor("");
    }
  }

  function getHistoryImportSeenScenes() {
    try {
      const raw = localStorage.getItem(HISTORY_IMPORT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(parsed) ? parsed.map((x) => String(x)) : []);
    } catch {
      return new Set();
    }
  }

  function markHistoryImportSeen(sceneName) {
    const scene = String(sceneName || "").trim();
    if (!scene) return;
    try {
      const set = getHistoryImportSeenScenes();
      set.add(scene);
      localStorage.setItem(HISTORY_IMPORT_STORAGE_KEY, JSON.stringify(Array.from(set)));
    } catch {
      // ignore
    }
  }

  function setCounts(filteredCount, totalCount) {
    const text = Number.isFinite(filteredCount) && Number.isFinite(totalCount)
      ? `${filteredCount} / ${totalCount}`
      : "—";
    if (countA) countA.textContent = text;
    if (countB) countB.textContent = text;
  }

  function getHistorySceneOptionsHtml() {
    return getSceneOptionsFromJobs(state.jobs)
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.id)}</option>`)
      .join("");
  }

  function ensureSceneOptionsInSelect(selectEl) {
    if (!selectEl) return;
    const current = String(selectEl.value || "");
    selectEl.innerHTML = getSceneOptionsFromJobs(state.jobs)
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name || item.id)}</option>`)
      .join("");
    if (current) selectEl.value = current;
  }

  function getDefaultImportRunName(sceneName = "") {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const scene = String(sceneName || "scene").trim() || "scene";
    return `${scene}-import-${stamp}`;
  }

  function normalizeStatusFilter(key) {
    if (key === "running") return ["running", "queued", "cancelling"];
    if (key === "success") return ["success"];
    if (key === "failed") return ["failed"];
    if (key === "cancelled") return ["cancelled"];
    return null;
  }

  function getFilteredJobs() {
    let jobs = Array.isArray(state.jobs) ? [...state.jobs] : [];

    if (state.scene) {
      jobs = jobs.filter((job) => String(job.sceneName || "").toLowerCase() === String(state.scene).toLowerCase());
    }

    const statuses = normalizeStatusFilter(state.activeStatus);
    if (statuses) {
      jobs = jobs.filter((job) => statuses.includes(job.status || job.state));
    }

    const q = String(state.search || "").trim().toLowerCase();
    if (q) {
      jobs = jobs.filter((job) => {
        const hay = [
          job.runName,
          job.sceneName,
          job.id,
          job.mode,
          job.message,
          job.stage,
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    const sortKey = state.sort || "updated_desc";
    const sortBy = (field) => (left, right) => new Date(right?.[field] || 0).getTime() - new Date(left?.[field] || 0).getTime();
    if (sortKey === "created_desc") jobs.sort(sortBy("createdAt"));
    else jobs.sort(sortBy("updatedAt"));

    return jobs;
  }

  function renderList() {
    if (!listEl) return;
    const filtered = getFilteredJobs();
    setCounts(filtered.length, state.jobs.length);
    refreshHistorySceneOptions();
    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="history-v1-empty">
          <div class="history-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>暂无匹配的历史记录</span>
          </div>
        </div>
      `;
      return;
    }
    listEl.innerHTML = filtered.map((job) => buildHistoryV1Row(job, state.favorites)).join("");
  }

  async function fetchHistoryJobs(sceneFilter = "") {
    const url = new URL("/api/train/history", window.location.origin);
    if (sceneFilter) url.searchParams.set("scene", sceneFilter);
    const response = await fetch(url.toString(), { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !Array.isArray(payload.jobs)) {
      throw new Error(payload.message || "读取历史记录失败。");
    }
    return payload.jobs;
  }

  async function importHistoryRecord(formData) {
    const response = await fetch("/api/train/import", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.job) {
      throw new Error(payload.message || "导入失败。");
    }
    return payload.job;
  }

  async function fetchJob(jobId) {
    const response = await fetch(`/api/train/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok || !payload.job) {
      throw new Error(payload.message || "读取任务详情失败。");
    }
    return payload.job;
  }

  async function fetchJobLogs(jobId) {
    const response = await fetch(`/api/train/${encodeURIComponent(jobId)}/logs`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || "读取日志失败。");
    }
    return payload.logs || "";
  }

  function closePathDialog() {
    const existing = modalRoot?.querySelector("#history-path-modal");
    if (existing) existing.remove();
  }

  async function copyHistoryPath(pathValue) {
    if (!pathValue) return false;
    try {
      await navigator.clipboard.writeText(pathValue);
      return true;
    } catch {
      return false;
    }
  }

  function openHistoryPathDialog({ title, pathValue, note }) {
    if (!modalRoot) return;
    closePathDialog();
    modalRoot.insertAdjacentHTML("beforeend", buildHistoryPathDialog({ title, path: pathValue, note }));
  }

  function closeImportDialog() {
    const existing = modalRoot?.querySelector("#history-import-modal");
    if (existing) existing.remove();
    state.importFile = null;
    state.importDialogOpen = false;
  }

  function formatFileBytes(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return "—";
    const mb = n / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(2)} MB`;
  }

  function setImportDropzoneFile(file) {
    state.importFile = file || null;
    if (!modalRoot) return;
    const metaEl = modalRoot.querySelector("#history-import-dropzone-meta");
    const zone = modalRoot.querySelector("#history-import-dropzone");
    if (!metaEl || !zone) return;
    if (!file) {
      metaEl.textContent = "或点击选择文件（仅 .ply）";
      zone.classList.remove("has-file");
      return;
    }
    metaEl.textContent = `${file.name} · ${formatFileBytes(file.size)}`;
    zone.classList.add("has-file");
  }

  function wireImportDropzone() {
    if (!modalRoot) return;
    const zone = modalRoot.querySelector("#history-import-dropzone");
    const input = modalRoot.querySelector("#history-import-ply");
    if (!zone || !input) return;

    const stop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const isPly = (file) => {
      const name = String(file?.name || "").toLowerCase();
      return name.endsWith(".ply");
    };

    const pickFile = () => {
      try { input.click(); } catch { /* noop */ }
    };

    zone.addEventListener("click", (event) => {
      if (event.target && event.target.closest(".history-import-dropzone__input")) return;
      pickFile();
    });
    zone.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      pickFile();
    });

    ["dragenter", "dragover"].forEach((type) => {
      zone.addEventListener(type, (event) => {
        stop(event);
        zone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      zone.addEventListener(type, (event) => {
        stop(event);
        zone.classList.remove("is-dragover");
      });
    });

    zone.addEventListener("drop", (event) => {
      const file = event.dataTransfer?.files?.[0] || null;
      if (!file) return;
      if (!isPly(file)) {
        const err = modalRoot.querySelector("#history-import-error");
        if (err) {
          err.style.display = "block";
          err.textContent = "仅支持导入 .ply 文件。";
        }
        setImportDropzoneFile(null);
        return;
      }
      setImportDropzoneFile(file);
    });

    input.addEventListener("change", () => {
      const file = input.files?.[0] || null;
      setImportDropzoneFile(file);
    });
  }

  function openImportDialog() {
    if (!modalRoot) return;
    closeImportDialog();
    const defaultScene = state.scene || state.jobs?.[0]?.sceneName || "";
    const dialogSceneOptions = getSceneOptionsFromJobs(state.jobs)
      .map((item) => `<option value="${escapeHtml(item.id)}"${String(item.id) === String(defaultScene) ? " selected" : ""}>${escapeHtml(item.name || item.id)}</option>`)
      .join("");
    const defaultRunName = getDefaultImportRunName(defaultScene);
    modalRoot.insertAdjacentHTML("beforeend", buildHistoryImportDialog({
      sceneOptions: dialogSceneOptions,
      defaultScene,
      defaultRunName,
    }));
    wireImportDropzone();
    state.importDialogOpen = true;
  }

  function disposeDrawerViewer() {
    if (state.viewer) {
      try { state.viewer.stop?.(); } catch { /* noop */ }
      try { state.viewer.dispose?.(); } catch { /* noop */ }
      state.viewer = null;
      state.viewerJobId = "";
    }
    const holder = modalRoot?.querySelector("#history-drawer-viewer-holder");
    if (holder) holder.innerHTML = "";
  }

  function closeDrawer({ replace = false } = {}) {
    disposeDrawerViewer();
    state.drawerJobId = "";
    state.drawerJob = null;
    state.drawerLogs = "";
    if (modalRoot) modalRoot.innerHTML = "";
    updateHistoryRouteState({ jobId: "", tab: "overview", scene: state.scene }, { replace });
  }

  function refreshHistorySceneOptions() {
    ensureSceneOptionsInSelect(sceneSelect);
  }

  function setActiveDrawerTab(tabKey, { pushRoute = true } = {}) {
    const drawer = modalRoot?.querySelector("#history-drawer");
    if (!drawer) return;
    const tab = ["overview", "params", "logs", "viewer"].includes(tabKey) ? tabKey : "overview";
    state.drawerTab = tab;
    drawer.querySelectorAll("[data-history-tab]").forEach((el) => {
      el.classList.toggle("is-active", el.getAttribute("data-history-tab") === tab);
    });
    drawer.querySelectorAll("[data-history-tab-panel]").forEach((el) => {
      el.classList.toggle("is-active", el.getAttribute("data-history-tab-panel") === tab);
    });
    if (pushRoute && state.drawerJobId) {
      updateHistoryRouteState({ jobId: state.drawerJobId, tab, scene: state.scene });
    }
  }

  function renderDrawerContent(job, logs) {
    const drawer = modalRoot?.querySelector("#history-drawer");
    if (!drawer) return;

    const titleEl = drawer.querySelector("#history-drawer-title");
    const statusEl = drawer.querySelector(".history-drawer__status");
    const updatedEl = drawer.querySelector(".history-drawer__updated");
    const toTrainLink = drawer.querySelector("#history-drawer-to-train");
    const resumeLink = drawer.querySelector("#history-drawer-resume");

    const { label } = getStatusMeta(job.state);
    if (titleEl) titleEl.textContent = job.sceneName || job.id;
    if (statusEl) {
      statusEl.className = `history-drawer__status status-pill--${job.state || "queued"}`;
      statusEl.textContent = label;
    }
    if (updatedEl) updatedEl.textContent = `Updated ${formatDate(job.updatedAt || job.createdAt)}`;

    const sceneId =
      (Array.isArray(scenes) ? scenes : []).find((item) => String(item.id).toLowerCase() === String(job.sceneName || "").toLowerCase())?.id
      || state.scene
      || defaultScene?.id
      || "garden";

    if (toTrainLink) {
      toTrainLink.href = `/?page=train&scene=${encodeURIComponent(sceneId)}`;
    }

    const canResume = Boolean(job.hasCheckpoint) && ["success", "failed", "cancelled"].includes(job.state);
    if (resumeLink) {
      if (canResume) {
        resumeLink.style.display = "";
        resumeLink.href = `/?page=train&scene=${encodeURIComponent(sceneId)}&resume=${encodeURIComponent(job.id)}`;
      } else {
        resumeLink.style.display = "none";
        resumeLink.href = "#";
      }
    }

    const overviewPanel = drawer.querySelector('[data-history-tab-panel="overview"]');
    const paramsPanel = drawer.querySelector('[data-history-tab-panel="params"]');
    const logsPanel = drawer.querySelector('[data-history-tab-panel="logs"]');
    const viewerPanel = drawer.querySelector('[data-history-tab-panel="viewer"]');

    const tp = job.trainingProgress || {};
    const isImported = String(job.origin || "trained") === "imported";
    if (overviewPanel) {
      overviewPanel.innerHTML = `
        <div class="history-drawer__grid">
          <div class="history-drawer__kv">
            <span>名称</span>
            <strong>${escapeHtml(job.runName || job.sceneName || job.id || "—")}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>阶段</span>
            <strong>${escapeHtml(tp.phase || job.stage || "—")}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>消息</span>
            <strong>${escapeHtml(tp.detail || job.message || "—")}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>迭代</span>
            <strong>${escapeHtml(tp.currentIteration != null ? `${tp.currentIteration} / ${tp.totalIterations || "—"}` : "—")}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>loss</span>
            <strong>${tp.loss == null ? "—" : Number(tp.loss).toFixed(7)}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>speed</span>
            <strong>${escapeHtml(tp.speed || "—")}</strong>
          </div>
          <div class="history-drawer__kv">
            <span>eta</span>
            <strong>${escapeHtml(tp.eta || "—")}</strong>
          </div>
          <div class="history-drawer__kv history-drawer__kv--wide">
            <span>路径</span>
            <div class="history-drawer__paths">
              <div><em>workspace</em><code>${escapeHtml(job.workspacePath || "—")}</code></div>
              <div><em>output</em><code>${escapeHtml(job.modelPath || "—")}</code></div>
              <div><em>log</em><code>${escapeHtml(job.logPath || "—")}</code></div>
            </div>
            ${createHistoryPathActions(job)}
          </div>
        </div>
      `;
    }

    if (paramsPanel) {
      paramsPanel.innerHTML = isImported
        ? buildHistoryPlaceholderCode("(自定义导入记录：暂无训练超参数)")
        : `
        <div class="history-drawer__code">
          <pre class="code-log"><code id="history-drawer-params-code"></code></pre>
        </div>
      `;
      const codeEl = paramsPanel.querySelector("#history-drawer-params-code");
      if (codeEl) {
        const payload = {
          mode: job.mode,
          sceneName: job.sceneName,
          sourceStrategy: job.sourceStrategy,
          sourcePath: job.sourcePath,
          inputImageDir: job.inputImageDir,
          sparseRoot: job.sparseRoot,
          parameterValues: job.parameterValues || {},
          resumeFromIteration: job.resumeFromIteration || null,
          parentJobId: job.parentJobId || null,
        };
        codeEl.textContent = JSON.stringify(payload, null, 2);
      }
    }

    if (logsPanel) {
      logsPanel.innerHTML = isImported
        ? buildHistoryPlaceholderCode("(自定义导入记录：暂无训练日志)")
        : `
        <div class="history-drawer__code">
          <pre class="code-log history-drawer__log-code"><code id="history-drawer-logs-code"></code></pre>
        </div>
      `;
      const codeEl = logsPanel.querySelector("#history-drawer-logs-code");
      if (codeEl) {
        codeEl.textContent = logs || "暂无日志";
      }
    }

    if (viewerPanel) {
      viewerPanel.innerHTML = `
        <div class="history-drawer__viewer-shell">
          <div class="history-drawer__viewer-head">
            <h4>Viewer 预览</h4>
            <div class="history-drawer__viewer-sub">${job.preview?.iteration ? `iteration ${job.preview.iteration}` : "未生成 point_cloud"}</div>
          </div>
          <div class="history-drawer__viewer-body">
            <div id="history-drawer-viewer-holder" class="history-drawer__viewer-holder"></div>
            <div class="history-drawer__viewer-empty" id="history-drawer-viewer-empty" style="display:none;">
              未找到可预览的 point_cloud.ply。请确认训练已产出 point_cloud/iteration_x/point_cloud.ply。
            </div>
          </div>
        </div>
      `;
    }
  }

  async function ensureViewerLoaded(job) {
    if (!modalRoot) return;
    const holder = modalRoot.querySelector("#history-drawer-viewer-holder");
    const emptyEl = modalRoot.querySelector("#history-drawer-viewer-empty");
    if (!holder) return;

    if (!job?.preview?.url) {
      if (emptyEl) emptyEl.style.display = "block";
      holder.innerHTML = "";
      disposeDrawerViewer();
      return;
    }

    if (emptyEl) emptyEl.style.display = "none";

    if (state.viewer && state.viewerJobId === job.id) return;
    disposeDrawerViewer();

    const viewport = document.createElement("div");
    viewport.className = "history-drawer__viewer-viewport";
    holder.appendChild(viewport);

    const viewer = createViewer(viewport);
    state.viewer = viewer;
    state.viewerJobId = job.id;

    try {
      await viewer.addSplatScene(job.preview.url, {
        format: GaussianSplats3D.SceneFormat.Ply,
        splatAlphaRemovalThreshold: 5,
        showLoadingUI: true,
      });
      viewer.start?.();
    } catch (error) {
      disposeDrawerViewer();
      holder.innerHTML = "";
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.textContent = error instanceof Error ? error.message : "加载预览失败。";
      }
    }
  }

  function scrollLogsToBottom() {
    const logsPanel = modalRoot?.querySelector('[data-history-tab-panel="logs"]');
    const logCode = modalRoot?.querySelector(".history-drawer__log-code");
    if (!logsPanel || !logCode) return;
    window.requestAnimationFrame(() => {
      const target = logCode;
      target.scrollTop = target.scrollHeight;
      logsPanel.scrollTop = 0;
    });
  }

  async function openDrawer(jobId, tab = "overview", { replace = false } = {}) {
    if (!modalRoot) return;
    if (!jobId) return;

    if (state.drawerJobId && state.drawerJobId !== jobId) {
      disposeDrawerViewer();
    }

    state.drawerJobId = jobId;
    state.drawerTab = ["overview", "params", "logs", "viewer"].includes(tab) ? tab : "overview";
    modalRoot.innerHTML = buildHistoryDrawerMarkup({ jobId, tab: state.drawerTab });

    updateHistoryRouteState({ jobId, tab: state.drawerTab, scene: state.scene }, { replace });

    const drawer = modalRoot.querySelector("#history-drawer");
    const backdropClose = (event) => {
      if (event.target.closest("[data-history-drawer-close]")) {
        closeDrawer();
      }
    };

    drawer?.addEventListener("click", (event) => {
      const tabButton = event.target.closest("[data-history-tab]");
      if (tabButton) {
        const nextTab = tabButton.getAttribute("data-history-tab") || "overview";
        setActiveDrawerTab(nextTab);
        if (nextTab === "viewer" && state.drawerJob) {
          void ensureViewerLoaded(state.drawerJob);
        } else {
          // Reduce GPU pressure: if user leaves viewer tab, drop the viewer.
          disposeDrawerViewer();
        }
        return;
      }
      backdropClose(event);
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", onKeyDown, { once: true });

    try {
      const [job, logs] = await Promise.all([fetchJob(jobId), fetchJobLogs(jobId)]);
      state.drawerJob = job;
      state.drawerLogs = logs || "";
      renderDrawerContent(job, logs);
      setActiveDrawerTab(state.drawerTab, { pushRoute: false });
      if (state.drawerTab === "viewer") {
        void ensureViewerLoaded(job);
      } else if (state.drawerTab === "logs") {
        scrollLogsToBottom();
      }
    } catch (error) {
      const titleEl = modalRoot.querySelector("#history-drawer-title");
      if (titleEl) titleEl.textContent = "加载失败";
      const panel = modalRoot.querySelector('[data-history-tab-panel="overview"]');
      if (panel) {
        panel.innerHTML = `<div class=\"history-drawer__error\">${escapeHtml(error instanceof Error ? error.message : "读取任务失败。")}</div>`;
      }
    }
  }

  // Filters
  searchEl?.addEventListener("input", () => {
    state.search = searchEl.value || "";
    renderList();
  });

  sceneSelect?.addEventListener("change", async () => {
    state.scene = String(sceneSelect.value || "");
    updateHistoryRouteState({ jobId: state.drawerJobId, tab: state.drawerTab, scene: state.scene }, { replace: true });
    try {
      state.jobs = await fetchHistoryJobs(state.scene);
    } catch (error) {
      state.jobs = [];
      if (listEl) {
        listEl.innerHTML = `<div class=\"history-v1-error\">${escapeHtml(error instanceof Error ? error.message : "读取历史记录失败。")}</div>`;
      }
    }
    renderList();
  });

  sortSelect?.addEventListener("change", () => {
    state.sort = String(sortSelect.value || "updated_desc");
    renderList();
  });

  statusChips?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    const key = button.getAttribute("data-status") || "all";
    state.activeStatus = key;
    statusChips.querySelectorAll(".segment").forEach((el) => el.classList.toggle("active", el === button));
    renderList();
  });

  const importBtn = document.getElementById("history-import-btn");
  importBtn?.addEventListener("click", () => {
    openImportDialog();
  });

  listEl?.addEventListener("click", (event) => {
    const favToggle = event.target.closest("[data-fav-toggle]");
    if (favToggle) {
      event.preventDefault();
      event.stopPropagation();
      const jobId = String(favToggle.getAttribute("data-job-id") || "");
      const id = String(jobId || "").trim();
      if (!id) return;
      if (state.favorites[id]) {
        delete state.favorites[id];
        state.favoriteOrder = state.favoriteOrder.filter((x) => String(x) !== id);
        if (state.activeFavoriteJobId === id) state.activeFavoriteJobId = "";
      } else {
        state.favorites[id] = {
          alias: "",
          note: "",
          createdAt: new Date().toISOString(),
        };
        state.favoriteOrder = [id, ...state.favoriteOrder.filter((x) => String(x) !== id)];
        state.activeFavoriteJobId = id;
      }
      persistFavorites();
      renderList();
      renderFavorites();
      renderFavoriteEditor(state.activeFavoriteJobId);
      return;
    }
    const row = event.target.closest(".history-v1-row");
    if (!row) return;
    const jobId = row.getAttribute("data-job-id") || "";
    void openDrawer(jobId, "overview");
  });
  listEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest(".history-v1-row");
    if (!row) return;
    event.preventDefault();
    const jobId = row.getAttribute("data-job-id") || "";
    void openDrawer(jobId, "overview");
  });

  modalRoot?.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-history-drawer-close]");
    if (!closeTarget) return;
    closeDrawer();
  });

  modalRoot?.addEventListener("click", async (event) => {
    const importClose = event.target.closest("[data-history-import-close]");
    if (importClose) {
      closeImportDialog();
      return;
    }

    const importSubmit = event.target.closest("#history-import-submit");
    if (importSubmit) {
      // handled via form submit
      return;
    }

    const pathButton = event.target.closest("[data-history-path-target]");
    if (pathButton) {
      const pathValue = String(pathButton.dataset.path || "").trim();
      const target = String(pathButton.dataset.historyPathTarget || "path");
      const titleMap = {
        output: "结果目录",
        log: "日志目录",
        preview: "预览文件",
        workspace: "数据目录",
      };
      openHistoryPathDialog({
        title: titleMap[target] || "路径详情",
        pathValue,
        note: "复制路径后，可以在本地文件管理器里打开。",
      });
      return;
    }

    const pathClose = event.target.closest("[data-history-path-close]");
    if (pathClose) {
      closePathDialog();
      return;
    }

    const pathCopy = event.target.closest("[data-history-path-copy]");
    if (pathCopy) {
      const codeEl = modalRoot.querySelector("#history-path-value");
      const copied = await copyHistoryPath(codeEl?.textContent || "");
      window.alert(copied ? "路径已复制到剪贴板。" : "复制失败，请手动复制。");
      return;
    }
  });

  modalRoot?.addEventListener("submit", async (event) => {
    const form = event.target.closest("#history-import-form");
    if (!form) return;
    event.preventDefault();

    const errorEl = modalRoot.querySelector("#history-import-error");
    const submitBtn = modalRoot.querySelector("#history-import-submit");
    if (errorEl) {
      errorEl.style.display = "none";
      errorEl.textContent = "";
    }

    const runNameEl = modalRoot.querySelector("#history-import-run-name");
    const sceneSelectEl = modalRoot.querySelector("#history-import-scene-select");
    const newSceneEl = modalRoot.querySelector("#history-import-new-scene");
    const iterationEl = modalRoot.querySelector("#history-import-iteration");
    const noteEl = modalRoot.querySelector("#history-import-note");
    const tagsEl = modalRoot.querySelector("#history-import-tags");
    const plyEl = modalRoot.querySelector("#history-import-ply");

    const sceneName = String(newSceneEl?.value || sceneSelectEl?.value || "").trim();
    const runName = String(runNameEl?.value || "").trim();
    const iteration = String(iterationEl?.value || "").trim();
    const note = String(noteEl?.value || "").trim();
    const tags = String(tagsEl?.value || "").trim();
    const file = state.importFile || plyEl?.files?.[0] || null;

    if (!sceneName) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = "请填写场景名。";
      }
      return;
    }
    if (!runName) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = "请填写名称。";
      }
      return;
    }
    if (!file) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = "请先选择一个 PLY 文件。";
      }
      return;
    }

    const formData = new FormData();
    formData.append("payload", JSON.stringify({ sceneName, runName, iteration, note, tags }));
    formData.append("ply", file);

    try {
      if (submitBtn) {
        submitBtn.setAttribute("disabled", "true");
        submitBtn.textContent = "导入中...";
      }
      const job = await importHistoryRecord(formData);
      markHistoryImportSeen(job.sceneName);
      closeImportDialog();
      state.jobs = await fetchHistoryJobs(state.scene);
      renderList();
      if (job?.id) {
        void openDrawer(job.id, "overview", { replace: true });
      }
    } catch (error) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = error instanceof Error ? error.message : "导入失败。";
      }
    } finally {
      if (submitBtn) {
        submitBtn.removeAttribute("disabled");
        submitBtn.textContent = "导入";
      }
    }
  });

  favListEl?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-fav-item]");
    if (!item) return;
    const jobId = String(item.getAttribute("data-job-id") || "");
    if (!jobId) return;
    state.activeFavoriteJobId = jobId;
    renderFavorites();
    renderFavoriteEditor(jobId);
    void openDrawer(jobId, "overview");
  });

  favSaveBtn?.addEventListener("click", () => {
    const id = String(state.activeFavoriteJobId || "");
    if (!id || !state.favorites[id]) return;
    state.favorites[id] = {
      ...state.favorites[id],
      alias: String(favAliasEl?.value || "").trim(),
      note: String(favNoteEl?.value || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    persistFavorites();
    renderFavorites();
    renderList();
  });

  favRemoveBtn?.addEventListener("click", () => {
    const id = String(state.activeFavoriteJobId || "");
    if (!id || !state.favorites[id]) return;
    delete state.favorites[id];
    state.favoriteOrder = state.favoriteOrder.filter((x) => String(x) !== id);
    state.activeFavoriteJobId = "";
    persistFavorites();
    renderFavorites();
    renderFavoriteEditor("");
    renderList();
  });

  // Initial load from URL (scene/job/tab)
  (async () => {
    const route = getHistoryRouteState();
    state.scene = route.scene || "";
    state.drawerJobId = route.jobId || "";
    state.drawerTab = route.tab || "overview";

    if (sceneSelect) {
      sceneSelect.value = state.scene;
    }

    const favLoaded = loadFavorites();
    state.favorites = favLoaded.favorites || {};
    state.favoriteOrder = favLoaded.order || [];

    try {
      state.jobs = await fetchHistoryJobs(state.scene);
    } catch (error) {
      state.jobs = [];
      if (listEl) {
        listEl.innerHTML = `<div class=\"history-v1-error\">${escapeHtml(error instanceof Error ? error.message : "读取历史记录失败。")}</div>`;
      }
    }

    renderFavorites();
    renderList();

    if (route.jobId) {
      void openDrawer(route.jobId, route.tab || "overview", { replace: true });
    } else {
      updateHistoryRouteState({ jobId: "", tab: "overview", scene: state.scene }, { replace: true });
    }
  })();

  window.addEventListener("popstate", () => {
    const route = getHistoryRouteState();
    // If user navigates away from history page, we should cleanup.
    const page = new URLSearchParams(window.location.search).get("page") || "";
    if (page !== "history") {
      disposeDrawerViewer();
      state.drawerJobId = "";
      state.drawerJob = null;
      state.drawerLogs = "";
      state.drawerTab = "overview";
      if (modalRoot) modalRoot.innerHTML = "";
      return;
    }

    if (sceneSelect && route.scene !== state.scene) {
      state.scene = route.scene || "";
      sceneSelect.value = state.scene;
      void (async () => {
        try {
          state.jobs = await fetchHistoryJobs(state.scene);
        } catch {
          state.jobs = [];
        }
        renderList();
      })();
    }

    if (!route.jobId) {
      if (state.drawerJobId) {
        // Popstate already moved the URL back; just sync UI without pushing/replacing history again.
        disposeDrawerViewer();
        state.drawerJobId = "";
        state.drawerJob = null;
        state.drawerLogs = "";
        state.drawerTab = "overview";
        if (modalRoot) modalRoot.innerHTML = "";
      }
      return;
    }

    // Drawer should be open; sync job/tab.
    if (route.jobId !== state.drawerJobId) {
      void openDrawer(route.jobId, route.tab || "overview", { replace: true });
      return;
    }

    // Same job; just tab switch.
    if (route.tab && route.tab !== state.drawerTab) {
      setActiveDrawerTab(route.tab, { pushRoute: false });
      if (route.tab === "viewer" && state.drawerJob) {
        void ensureViewerLoaded(state.drawerJob);
      } else if (route.tab === "logs") {
        scrollLogsToBottom();
      } else {
        disposeDrawerViewer();
      }
    }
  });
}
