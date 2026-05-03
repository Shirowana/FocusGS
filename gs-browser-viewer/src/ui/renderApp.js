// src/ui/renderApp.js

let parallaxScrollListener = null;

// ---- 视差初始化 ----
function setupParallax() {
  if (parallaxScrollListener) {
    window.removeEventListener("scroll", parallaxScrollListener);
  }
  const heroVisual = document.querySelector(".hero-visual-card");
  const heroBg = document.querySelector(".hero-bg-glow");

  parallaxScrollListener = () => {
    if (!document.querySelector(".landing-page")) return;
    const scrollY = window.scrollY;
    if (heroVisual) heroVisual.style.transform = `translateY(${scrollY * 0.15}px)`;
    if (heroBg) heroBg.style.transform = `translateX(-50%) translateY(${scrollY * 0.3}px)`;
  };
  window.addEventListener("scroll", parallaxScrollListener);
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

const HOME_METHOD_BADGES = ["3DGS Core", "Memory-Efficient", "Web Demo"];

const HOME_METHOD_POINTS = [
  {
    title: "以 3DGS 作为重建与渲染主线",
    copy: "保留 Gaussian Splatting 在高保真场景表达与实时浏览上的优势，聚焦真实三维重建成果的展示。",
  },
  {
    title: "引入 MEGS-2 的低显存优化思路",
    copy: "通过更节省显存的策略，让训练与部署不再被高资源门槛完全限制，适配有限硬件条件。",
  },
  {
    title: "把训练结果接进浏览器工作台",
    copy: "从场景资产、结果管理到在线预览，FocusGS 让研究链路和可视化展示在一个页面中闭环。",
  },
];

const HOME_PIPELINE_STEPS = [
  {
    id: "prepare",
    step: "01",
    label: "Data Preparation",
    title: "数据准备",
    summary: "整理多视角图像、建立输入目录，并为后续 SfM 与训练流程准备统一格式。",
    note: "适合从图片目录或视频抽帧开始，强调输入清洗和场景组织。",
    mediaSrc: "",
    visual: "prepare",
  },
  {
    id: "train",
    step: "02",
    label: "Reconstruction Training",
    title: "重建训练",
    summary: "以 3D Gaussian Splatting 为核心，并引入 MEGS-2 的显存优化能力推进模型训练。",
    note: "核心目标是在有限显存下仍然保持高质量三维重建的可训练性。",
    mediaSrc: "",
    visual: "train",
  },
  {
    id: "show",
    step: "03",
    label: "Result Presentation",
    title: "结果展示",
    summary: "将训练输出接入浏览器端 viewer，在 Web 界面中完成交互式三维巡览与结果浏览。",
    note: "训练侧资产与展示侧页面通过静态结果和场景配置建立稳定联动。",
    mediaSrc: "",
    visual: "show",
  },
  {
    id: "history",
    step: "04",
    label: "History Recall",
    title: "历史回溯",
    summary: "回看不同训练输出、实验记录与结果版本，为横向比较和迭代追踪保留完整上下文。",
    note: "适合后续扩展成训练日志、指标曲线与结果对比入口。",
    mediaSrc: "",
    visual: "history",
  },
];

const HOME_GITHUB_LINK = "https://github.com/Shirowana/FocusGS.git";

let workflowAutoAdvanceTimer = null;
let workflowAutoAdvanceObserver = null;

function isVideoAsset(src = "") {
  return /\.(mp4|webm)$/i.test(src);
}

function renderResponsiveMedia({ src = "", alt = "", className = "", poster = "" }) {
  if (!src) return "";
  if (isVideoAsset(src)) {
    const posterAttr = poster ? ` poster="${poster}"` : "";
    return `<video class="${className}" src="${src}"${posterAttr} autoplay muted loop playsinline></video>`;
  }
  return `<img class="${className}" src="${src}" alt="${alt}" loading="lazy" />`;
}

function getScenePreviewMedia(scene) {
  return scene.previewMedia || scene.thumbnail;
}

function getScenePrimaryTag(scene) {
  return (scene.tags || []).find((tag) => tag !== "featured") || "scene";
}

function buildMethodBadges() {
  return HOME_METHOD_BADGES
    .map((badge) => `<span class="method-badge">${badge}</span>`)
    .join("");
}

function buildMethodPoints() {
  return HOME_METHOD_POINTS
    .map(
      (point) => `
        <article class="method-point">
          <h3>${point.title}</h3>
          <p>${point.copy}</p>
        </article>
      `,
    )
    .join("");
}

function buildMethodVisual() {
  return `
    <div class="method-visual">
      <div class="method-visual__frame">
        <div class="method-visual__header">
          <span>FocusGS / Method Overview</span>
          <strong>3DGS + MEGS-2</strong>
        </div>
        <div class="method-visual__diagram">
          <div class="method-node method-node--input">
            <em>Input</em>
            <strong>Multi-view Images</strong>
          </div>
          <div class="method-visual__arrow"></div>
          <div class="method-node method-node--opt">
            <em>Optimization</em>
            <strong>Memory-Aware Training</strong>
          </div>
          <div class="method-visual__arrow"></div>
          <div class="method-node method-node--viewer">
            <em>Output</em>
            <strong>Web Viewer</strong>
          </div>
        </div>
        <div class="method-visual__compare">
          <div class="method-compare-card">
            <span>Vanilla 3DGS</span>
            <div class="method-compare-bar method-compare-bar--high">
              <i></i>
            </div>
            <strong>Higher VRAM Pressure</strong>
          </div>
          <div class="method-compare-card method-compare-card--accent">
            <span>MEGS-2 Strategy</span>
            <div class="method-compare-bar method-compare-bar--low">
              <i></i>
            </div>
            <strong>More Training Headroom</strong>
          </div>
        </div>
      </div>
    </div>
  `;
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

function buildShowcaseFeature(scene) {
  const preview = getScenePreviewMedia(scene);
  const detailTags = [scene.dataset, `Iter ${scene.iteration / 1000}k`, getScenePrimaryTag(scene)];

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
        <a class="btn btn--outline showcase-stage__link" id="showcase-open-link" href="/?scene=${scene.id}">Open Workspace</a>
      </div>
      <p class="showcase-stage__desc" id="showcase-description">${scene.description}</p>
      <div class="showcase-stage__facts">
        ${detailTags
          .map(
            (tag, index) => `
              <div class="showcase-stage__fact">
                <span>${index === 0 ? "Dataset" : index === 1 ? "Checkpoint" : "Focus"}</span>
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

  document.querySelectorAll(".showcase-scene-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.sceneId === scene.id);
  });
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
  const showcaseGrid = document.getElementById("showcase-grid");
  if (!showcaseGrid) return;

  showcaseGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".showcase-scene-card");
    if (!card) return;

    const scene = scenes.find((item) => item.id === card.dataset.sceneId);
    if (!scene) return;

    updateShowcaseFeature(scene);
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
    }, 3800);
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
      const hasMetrics = task.metrics && task.status === "success";

      // 指标预览（仅 success 才展示）
      const metricsHtml = hasMetrics
        ? `
          <div class="history-detail__metrics">
            <span><em>PSNR</em>${task.metrics.psnr}</span>
            <span><em>SSIM</em>${task.metrics.ssim}</span>
            <span><em>LPIPS</em>${task.metrics.lpips}</span>
          </div>
        `
        : `<p class="history-detail__no-metric">无可用指标</p>`;

      return `
        <div class="history-item" data-id="${task.id}">
          <div class="history-item__row">
            <span class="status-dot ${cls}" title="${label}"></span>
            <div class="history-item__info">
              <strong class="history-item__name">${task.runName}</strong>
              <span class="history-item__meta">${task.iteration / 1000}k iter · ${task.duration || "—"}</span>
            </div>
            <span class="history-item__date">${formatDate(task.startTime)}</span>
            <button class="history-item__toggle" aria-label="展开详情">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <div class="history-item__detail">
            <div class="history-detail__inner">
              ${metricsHtml}
              <div class="history-detail__footer">
                <span class="history-detail__status status-pill--${task.status}">${label}</span>
                <button class="btn btn--xs btn--ghost" onclick="alert('加载此结果：${task.runName}（占位）')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  加载此结果
                </button>
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
  const list = document.querySelector(".history-list");
  if (!list) return;

  list.addEventListener("click", (e) => {
    // 点击整行（不含 btn--xs 的加载按钮）时触发展开
    const toggleBtn = e.target.closest(".history-item__toggle");
    const row = e.target.closest(".history-item__row");
    if (!toggleBtn && !row) return;
    // 如果点击的是"加载此结果"按钮，不触发展开
    if (e.target.closest(".btn--xs")) return;

    const item = e.target.closest(".history-item");
    if (!item) return;

    const isOpen = item.classList.contains("is-open");
    // 关闭所有已打开的项
    list.querySelectorAll(".history-item.is-open").forEach((el) => el.classList.remove("is-open"));
    // 切换当前项
    if (!isOpen) item.classList.add("is-open");
  });
}

// ---- 绑定工作台任务交互模拟 ----
function setupWorkspaceInteraction() {
  // 1. 高级参数折叠
  const advancedToggle = document.getElementById('advanced-toggle');
  const advancedPanel = document.getElementById('advanced-panel');
  if (advancedToggle && advancedPanel) {
    advancedToggle.addEventListener('click', () => {
      const isHidden = advancedPanel.style.display === 'none';
      advancedPanel.style.display = isHidden ? 'block' : 'none';
      advancedToggle.innerText = isHidden ? '收起高级参数' : '展开高级参数';
    });
  }

  // 2. 中间 Viewer/Log Tabs 切换
  const tabViewer = document.getElementById('tab-viewer');
  const tabLog = document.getElementById('tab-log');
  const viewStage = document.getElementById('view-stage');
  const logStage = document.getElementById('log-stage');

  function switchTab(mode) {
    if (!tabViewer || !tabLog) return;
    if (mode === 'viewer') {
      tabViewer.classList.add('active');
      tabLog.classList.remove('active');
      viewStage.style.display = 'block';
      logStage.style.display = 'none';
    } else {
      tabLog.classList.add('active');
      tabViewer.classList.remove('active');
      logStage.style.display = 'flex';
      viewStage.style.display = 'none';
    }
  }

  if (tabViewer) tabViewer.addEventListener('click', () => switchTab('viewer'));
  if (tabLog) tabLog.addEventListener('click', () => switchTab('log'));

  // 3. 表单控件交互补充 (Segment切换 & Upload点击)
  const segments = document.querySelectorAll('.segment');
  segments.forEach(btn => {
    btn.addEventListener('click', (e) => {
      segments.forEach(s => s.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  const dropzone = document.querySelector('.upload-dropzone');
  if (dropzone) {
    dropzone.addEventListener('click', () => {
      alert('已触发系统文件选择器（占位演示）');
    });
  }

  // 4. 模拟“开始重建”流程
  const btnSubmit = document.getElementById('btn-submit-task');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      // 切换到日志视图
      switchTab('log');
      
      // 更新状态徽章
      const logBadge = document.getElementById('log-status-badge');
      if (logBadge) logBadge.innerHTML = '<span class="status-dot status-dot--running"></span> 正在处理 · 第 1/4 阶段: 准备上传';

      // 模拟滚动输出 JSON 日志
      const codeBlock = document.getElementById('json-log-content');
      if (codeBlock) {
        codeBlock.innerHTML = '{\n  "status": "running",\n  "message": "Initializing task..."\n}';
        
        let step = 0;
        const interval = setInterval(() => {
          step++;
          if (step === 1) {
            codeBlock.innerHTML += '\n{\n  "stage": "upload",\n  "progress": "100%"\n}';
            updateTimeline(0, 'success');
            updateTimeline(1, 'running');
            if(logBadge) logBadge.innerHTML = '<span class="status-dot status-dot--running"></span> 第 2/4 阶段: 输入预处理';
          } else if (step === 2) {
            codeBlock.innerHTML += '\n{\n  "stage": "sfm",\n  "progress": "Extracting features..."\n}';
          } else if (step === 3) {
            codeBlock.innerHTML += '\n{\n  "stage": "sfm",\n  "progress": "COLMAP sparse reconstruction..."\n}';
            updateTimeline(1, 'success');
            updateTimeline(2, 'running');
            if(logBadge) logBadge.innerHTML = '<span class="status-dot status-dot--running"></span> 第 3/4 阶段: GS 训练';
          } else if (step === 4) {
            codeBlock.innerHTML += '\n{\n  "stage": "training",\n  "iteration": 7000,\n  "loss": 0.0412\n}';
          } else {
            clearInterval(interval);
          }
        }, 1500);
      }
    });
  }

  function updateTimeline(index, status) {
    const items = document.querySelectorAll('.timeline-item');
    if (items[index]) {
      items[index].className = `timeline-item is-${status}`;
    }
  }
}

// ============================================================
// 长首页渲染：展示项目亮点、预览图、画廊
// ============================================================
export function renderHomePage(scenes) {
  document.title = "FocusGS | 3D Gaussian Splatting Showcase";
  stopWorkflowAutoAdvance();

  const featuredScene = scenes[0] || null;
  const featuredVideoOrImg = featuredScene ? getScenePreviewMedia(featuredScene) : "";
  const sceneCount = scenes.length;
  const activeWorkflowStep = HOME_PIPELINE_STEPS[0];

  document.getElementById("app").innerHTML = `
    <div class="landing-page">
      <nav class="home-nav">
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
         <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换亮/暗色主题">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
         </button>
      </nav>

      <section class="hero-section">
        <div class="hero-bg-glow"></div>
        <div class="hero-content">
          <p class="eyebrow">FOCUSGS FRAMEWORK</p>
          <h1 class="hero-title">更省显存，更快走进 3DGS</h1>
          <p class="hero-subtitle">FocusGS 聚焦 3D Gaussian Splatting，并引入 MEGS-2 的内存优化能力，让高质量三维重建在有限硬件上也能顺畅运行。</p>
          <div class="hero-highlights">
            <span>3DGS Core</span>
            <span>MEGS-2 Strategy</span>
            <span>${sceneCount} Scenes Ready</span>
          </div>
          <div class="hero-actions">
            <a href="#showcase" class="btn btn--primary">查看成果展示</a>
            <a href="/?scene=${featuredScene?.id || "garden"}" class="btn btn--outline">进入工作台展示</a>
          </div>
        </div>
        <div class="hero-visual">
           <div class="hero-visual-card">
              ${renderResponsiveMedia({
                src: featuredVideoOrImg,
                alt: "Hero Preview",
                className: "hero-visual-card__asset",
                poster: featuredScene?.thumbnail || "",
              })}
              <div class="hero-visual-card__shade"></div>
              <div class="hero-visual-card__chip hero-visual-card__chip--top">Scene-ready viewer</div>
              <div class="hero-visual-card__chip hero-visual-card__chip--bottom">${featuredScene?.name || "Garden"} • ${featuredScene?.dataset || "MipNeRF360"}</div>
           </div>
        </div>
      </section>

      <section class="method-section" id="method">
        <div class="method-layout">
          <div class="method-copy">
            <p class="section-kicker">Method Overview</p>
            <h2>把 3DGS 主线、MEGS-2 优化与 Web 展示放在同一条链路里。</h2>
            <p class="method-lead">FocusGS 不是单纯的 viewer 包装层，而是围绕高质量三维重建建立的一套完整叙事：前端展示关注 3DGS 的最终可见效果，方法侧则借助 MEGS-2 的思路降低显存压力。</p>
            <div class="method-badges">
              ${buildMethodBadges()}
            </div>
            <div class="method-points">
              ${buildMethodPoints()}
            </div>
          </div>
          <div class="method-visual-shell">
            ${buildMethodVisual()}
          </div>
        </div>
      </section>

      <section id="showcase" class="showcase-section">
        <div class="section-header section-header--centered">
          <p class="section-kicker">Scene Showcase</p>
          <h2>七个场景，持续扩展的 3DGS 演示入口。</h2>
          <p>从预训练结果到后续新实验场景，FocusGS 让场景展示区保持可新增、可切换、可进入工作台的连续体验。</p>
        </div>
        <div class="showcase-shell">
          <div class="showcase-stage" id="showcase-feature">
            ${featuredScene ? buildShowcaseFeature(featuredScene) : ""}
          </div>
          <div class="showcase-grid" id="showcase-grid">
            ${buildShowcaseSceneCards(scenes, featuredScene?.id || "")}
          </div>
        </div>
      </section>

      <section class="workflow-section" id="workflow">
        <div class="section-header section-header--left">
          <p class="section-kicker">Workflow</p>
          <h2>从输入到回看，工作流应该是动态可读的。</h2>
          <p>四个单元沿着真实使用链路推进：准备输入、开展训练、进入展示、回看历史，让首页本身也像一个轻量演示台。</p>
        </div>
        <div class="workflow-shell" data-active-index="0">
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
            <p>从场景成果浏览到工作台式演示，这个首页负责建立第一印象，真正的三维巡览与实验链路则继续在 Studio Workspace 中展开。</p>
          </div>
          <div class="cta-actions cta-actions--stacked">
            <a class="btn btn--primary" href="/?scene=${featuredScene?.id || "garden"}">开始体验 / 进入工作台</a>
            <a class="btn btn--outline" href="${HOME_GITHUB_LINK}">GitHub</a>
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
export function renderWorkspacePage(scenes, selectedScene, history = []) {
  stopWorkflowAutoAdvance();
  document.title = `${selectedScene.name} | FocusGS Studio`;

  document.getElementById("app").innerHTML = `
    <div class="layout studio-layout">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar__left">
          <a href="/" class="back-home-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            FocusGS / 首页
          </a>
          <span class="divider"></span>
          <div class="topbar__title-wrapper">
             <p class="eyebrow">Studio Workspace</p>
             <h1>${selectedScene.name}</h1>
          </div>
        </div>
        <div class="topbar__meta">
          <span class="status-badge status--success">● Ready</span>
        </div>
        <div class="topbar__actions">
           <button class="btn btn--icon theme-toggle-btn" onclick="toggleTheme()" title="切换主题">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
           </button>
           <button class="btn btn--icon" title="重置视角功能占位" onclick="alert('重置视角占位')">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           </button>
           <button class="btn btn--icon" title="全屏功能占位" onclick="alert('全屏占位')">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
           </button>
        </div>
      </header>

      <!-- 左侧控制面板 -->
      <aside class="sidebar sidebar--left">
        <!-- 场景导览 -->
        <section class="panel action-panel">
          <h2>场景导览区</h2>
          <div class="scene-grid-small">
            ${buildSceneCards(scenes, selectedScene.id)}
          </div>
        </section>

        <!-- 任务入口：深度还原任务创建表单 -->
        <section class="panel task-create-panel">
          <h2>创建任务</h2>
          
          <div class="segmented-control">
            <button class="segment active">图片目录</button>
            <button class="segment">单个视频</button>
          </div>

          <div class="form-group">
            <label>场景名</label>
            <input type="text" class="input-field" placeholder="${selectedScene.id}" value="${selectedScene.id}" />
          </div>

          <div class="form-group">
            <label>选择一个图片目录</label>
            <div class="upload-dropzone">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
               <p>拖拽图片文件夹到这里，或点击选择目录。</p>
               <span>支持任何图像格式</span>
            </div>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" checked />
            <span>输入为竖屏拍摄时旋转图像</span>
          </label>

          <div class="advanced-section">
            <button type="button" class="btn btn--ghost w-100" id="advanced-toggle">收起高级参数</button>
            <div id="advanced-panel" style="display:block; margin-top:12px;">
              <div class="form-group">
                <label>batch_size</label>
                <input type="number" class="input-field" value="1" />
              </div>
            </div>
          </div>

          <button class="btn btn--primary w-100" id="btn-submit-task" style="margin-top: 16px;">开始重建</button>
        </section>

        <!-- 历史任务面板 -->
        <section class="panel history-panel">
          <div class="history-panel__header">
            <h2>历史训练记录</h2>
            <span class="history-count">${history.length} 条</span>
          </div>
          ${buildHistoryPanel(history)}
        </section>
      </aside>

      <!-- 中间主视图：Viewer 与日志切换 -->
      <main class="viewer-shell">
        <div class="viewer-tabs">
          <button class="viewer-tab active" id="tab-viewer">3D 渲染结果 (Viewer)</button>
          <button class="viewer-tab" id="tab-log">任务日志 (Task Log)</button>
        </div>

        <!-- 3D 渲染容器 -->
        <div class="viewer-stage" id="view-stage">
          <div class="viewer-overlay" id="status-overlay">
              <div class="viewer-spinner"></div>
              <span>Loading pretrained ${selectedScene.id} splats...</span>
          </div>
          <div class="viewer-status-text" id="status">Initiating Viewer...</div>
          <div id="viewer"></div>
        </div>

        <!-- 日志查看容器 (初始隐藏) -->
        <div class="log-stage" id="log-stage" style="display: none;">
          <div class="log-header">
            <div class="log-title">
              <strong>job.json</strong>
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

      <!-- 右侧信息与时间线面板 -->
      <aside class="sidebar sidebar--right">
        
        <!-- 阶段时间线 -->
        <section class="panel timeline-panel">
          <h2>阶段时间线</h2>
          <div class="timeline">
             <div class="timeline-item is-success">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                   <strong>准备上传</strong>
                   <p>已完成 · 耗时 1 秒</p>
                </div>
             </div>
             <div class="timeline-item is-pending">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                   <strong>输入预处理</strong>
                   <p>待执行 · COLMAP 稀疏建图</p>
                </div>
             </div>
             <div class="timeline-item is-pending">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                   <strong>GS 训练</strong>
                   <p>待执行</p>
                </div>
             </div>
             <div class="timeline-item is-pending">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                   <strong>结束渲染</strong>
                   <p>待执行</p>
                </div>
             </div>
          </div>
        </section>

        <section class="panel info-panel">
          <h2>场景简介</h2>
          <p class="desc">${selectedScene.description}</p>
          <div class="sys-item" style="margin-top:12px;">
              <span>数据集来源</span>
              <p style="color:var(--text-main);">${selectedScene.dataset}</p>
          </div>
          <div class="tag-row">${buildTagList(selectedScene.tags)}</div>
        </section>

        <section class="panel metrics-panel">
          <h2>指标 (Iteration ${selectedScene.iteration})</h2>
          <div class="metrics-grid">
             <div class="metric-item">
                 <span class="metric-label">PSNR</span>
                 <strong class="metric-val ${selectedScene.metrics?.psnr ? "" : "metric-tbd"}">${formatMetric(selectedScene.metrics?.psnr)}</strong>
             </div>
             <div class="metric-item">
                 <span class="metric-label">SSIM</span>
                 <strong class="metric-val ${selectedScene.metrics?.ssim ? "" : "metric-tbd"}">${formatMetric(selectedScene.metrics?.ssim)}</strong>
             </div>
             <div class="metric-item">
                 <span class="metric-label">LPIPS</span>
                 <strong class="metric-val ${selectedScene.metrics?.lpips ? "" : "metric-tbd"}">${formatMetric(selectedScene.metrics?.lpips)}</strong>
             </div>
          </div>
        </section>

        <section class="panel code-panel">
          <h2>结果说明</h2>
          <p>缩略图/对比图占位区</p>
        </section>

        <section class="panel help-panel">
          <h2>使用说明</h2>
          <ul class="control-list">
             <li><span class="control-key">Left Drag</span> <span>旋转轨道</span></li>
             <li><span class="control-key">Right Drag</span> <span>平移视角</span></li>
             <li><span class="control-key">Scroll</span> <span>缩放场景</span></li>
          </ul>
        </section>
      </aside>
    </div>
  `;

  // DOM 渲染完毕后绑定交互事件
  setTimeout(() => {
    setupHistoryInteraction();
    setupWorkspaceInteraction();
  }, 0);
}
