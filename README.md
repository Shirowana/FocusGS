# FocusGS

`FocusGS` 当前主线已经整理为一套以 `MEGS-2` 为训练算法、以浏览器工作台为交互入口、以 `web-splat` 为演示 viewer 参考实现的本地工作区。

## 当前主线

- 前端：`frontend/gs-browser-viewer/`
- 本地训练 API：`backend/local-api/`
- 算法：`algorithms/MEGS-2/`
- viewer 源码参考：`viewers/web-splat/`
- 本地数据：`data/`
- 本地训练输出：`runs/`

`gaussian-splatting/` 已从当前仓库主线中移除。

## 目录结构

```text
FocusGS/
├── frontend/
│   └── gs-browser-viewer/
├── backend/
│   └── local-api/
├── algorithms/
│   └── MEGS-2/
├── viewers/
│   └── web-splat/
├── docs/
├── scripts/
├── data/      # 本地数据，不建议提交
└── runs/      # 本地训练结果，不建议提交
```

## 运行前端

```bash
cd /home/shirowana/FocusGS
bash scripts/start_garden_browser_viewer.sh
```

前端默认地址：

```text
http://localhost:4173/
```

示例：

```text
http://localhost:4173/?scene=garden
http://localhost:4173/?scene=room
```

## 当前代码链路

### 1. 页面展示

- 场景元数据：`frontend/gs-browser-viewer/public/data/scenes.json`
- 本地模型软链接：`frontend/gs-browser-viewer/public/assets/<scene>`
- 页面 UI：`frontend/gs-browser-viewer/src/ui/`
- viewer 加载逻辑：`frontend/gs-browser-viewer/src/viewer/`

### 2. 本地训练

- 本地 API：`backend/local-api/index.js`
- 算法入口：`algorithms/MEGS-2/train.py`
- 默认数据目录：`data/mipnerf360/`
- 运行期任务目录：`history/`

### 3. 数据与结果

- 预训练结果：`data/pretrained_models/`
- 新训练结果：`runs/`

## 说明

- `data/`、`runs/`、`history/`、`.runtime/` 都属于本地工作区内容，不是轻量源码快照的一部分。
- `frontend/gs-browser-viewer/public/assets/` 当前使用软链接指向 `data/pretrained_models/`。
- 根目录下的 `docs/` 保存整理文档、开发提示和待办说明。
