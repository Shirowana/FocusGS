# FocusGS README

GitHub repository: `https://github.com/Shirowana/FocusGS.git`

## 当前项目是什么

`FocusGS` 当前是一个基于 `gaussian-splatting` 结果资产的浏览器 3D 场景展示项目。它可以读取 `MipNeRF360` 场景对应的 `.ply` 点云结果，并在网页中完成交互式查看。

当前这套项目的真实主线是：

- 前端展示：`gs-browser-viewer`
- 场景资产：`extracted/pretrained_models`
- 训练入口：`gaussian-splatting/train.py`

`MEGS-2` 已经放进工作区，但目前**不是**这个页面展示链路的主线，只作为后续方法替换或扩展的候选方向保留。

当前页面成品的形式是：

- 左侧：场景卡片列表
- 中间：3D Gaussian Splatting viewer
- 右侧：场景描述、模型路径、指标占位信息

当前可直接展示的场景有：

- `garden`
- `room`
- `bicycle`
- `bonsai`
- `counter`
- `kitchen`
- `stump`

最终成品可以理解为三部分：

1. 一个本地前端页面服务
2. 一组可直接加载的 `.ply` 场景资产
3. 一条“训练输出 -> 前端展示”的稳定接入路径

---

## GitHub 发布版说明

为了方便后续版本管理、代码浏览和仓库跳转，GitHub 发布版默认只保留下面这些内容：

- `gs-browser-viewer/` 的完整前端源码与小体积静态资源
- `MEGS-2/` 的核心算法源码快照与少量说明图片
- `gaussian-splatting/` 的核心算法源码快照与少量说明图片
- 顶层文档与启动脚本

GitHub 发布版默认**不上传**下面这些本地工作区内容：

- `extracted/` 中的数据集与预训练结果
- `test/` 中的新训练输出
- `logs/`、`node_modules/`、`dist/`、`build/`、`install/` 等派生产物
- 编译库、权重文件、点云结果、第三方子模块构建目录

需要特别注意：

- `gs-browser-viewer/public/assets/*` 仍然按本地开发约定指向模型结果，但这些模型资产默认不纳入 GitHub 发布版。
- 如果要在新机器上复现本地 viewer，仍需自行准备 `public/assets/<scene>/...` 对应的场景结果文件。

---

## 当前真实部署结构

下面只列当前真正参与主链路的目录和文件：

```text
FocusGS/
├── README.md
├── start_garden_browser_viewer.sh
├── gs-browser-viewer/
├── extracted/
│   ├── mipnerf360/
│   └── pretrained_models/
├── gaussian-splatting/
└── test/
```

各部分用途如下：

- `start_garden_browser_viewer.sh`
  当前最直接的前端启动脚本，本质上是在 `gs-browser-viewer/` 里执行 `npm run dev`。

- `gs-browser-viewer/`
  当前真实运行的前端项目，是一个 Vite 单页应用，负责场景列表、viewer 容器和右侧信息栏。

- `extracted/mipnerf360/`
  训练输入数据目录，里面是真实的场景图像和 COLMAP 稀疏重建结果。

- `extracted/pretrained_models/`
  当前前端真实使用的场景结果目录，里面有各个场景的 `point_cloud.ply`、`cameras.json`、`cfg_args` 等文件。

- `gaussian-splatting/`
  当前真实跑通的训练代码目录。要从零训练某个场景，当前主入口就是这里的 `train.py`。

- `test/`
  当前用于保存新训练结果的临时输出目录，例如 `garden_smoke_500_noviewer` 这类实验结果。

需要特别注意：

- `gs-browser-viewer/public/assets/*` 当前不是独立拷贝，而是指向 `extracted/pretrained_models/*` 的软链接。
- `MEGS-2/` 当前不作为页面展示主链路，但其核心源码会作为方法快照保留在 GitHub 仓库中。

---

## 前端当前真实调用了哪些文件

### 前端入口文件

当前前端真实入口是下面三个：

- `start_garden_browser_viewer.sh`
- `gs-browser-viewer/package.json`
- `gs-browser-viewer/src/main.js`

它们的职责分别是：

- `start_garden_browser_viewer.sh`
  进入 `gs-browser-viewer` 目录并执行 `npm run dev`。

- `gs-browser-viewer/package.json`
  定义前端服务脚本，当前真实端口是 `4173`。

- `gs-browser-viewer/src/main.js`
  启动前端流程：加载场景元数据、渲染页面、初始化 viewer、加载选中的 `.ply`。

### 页面展示关键文件

当前页面展示和模型加载真正依赖下面这些文件：

- `gs-browser-viewer/src/ui/renderApp.js`
  负责页面布局，包括顶部标题、左侧场景卡片、中间 viewer 容器、右侧信息栏。

- `gs-browser-viewer/src/config/loadScenes.js`
  从 `public/data/scenes.json` 读取场景元数据，并根据 URL 参数 `?scene=<id>` 选择当前场景。

- `gs-browser-viewer/src/viewer/createViewer.js`
  使用 `@mkkellogg/gaussian-splats-3d` 创建浏览器端 Gaussian Splatting viewer。

- `gs-browser-viewer/src/viewer/loadScene.js`
  调用 `viewer.addSplatScene(scene.modelPath, ...)`，把 `.ply` 模型资源真正加载进 viewer。

- `gs-browser-viewer/public/data/scenes.json`
  当前前端和模型资产之间最核心的配置文件。页面显示什么场景、加载哪个模型、展示什么说明，全部由这里决定。

### 前端服务端口

当前前端默认运行在：

```text
http://localhost:4173/
```

示例：

```text
http://localhost:4173/?scene=garden
http://localhost:4173/?scene=room
```

---

## 模型侧当前真实调用了哪些文件

### 展示侧实际使用的结果文件

当前页面展示真实使用的是：

```text
extracted/pretrained_models/<scene>/
├── point_cloud/
│   └── iteration_30000/
│       └── point_cloud.ply
├── cameras.json
├── cfg_args
└── input.ply
```

其中最关键的是：

- `point_cloud/iteration_30000/point_cloud.ply`
- `cameras.json`
- `cfg_args`

前端真正直接读取的是 `.ply` 文件；`cameras.json` 和 `cfg_args` 目前主要是随模型结果一起保留，便于后续分析和兼容其他 viewer。

### 训练侧当前真实跑通的入口

当前真正跑通过的训练入口是：

- `gaussian-splatting/train.py`

训练输入数据格式是：

```text
extracted/mipnerf360/<scene>/
├── images/
├── images_2/
├── images_4/
├── images_8/
└── sparse/0/
    ├── cameras.bin
    ├── images.bin
    └── points3D.bin
```

训练输出目录当前放在：

```text
test/<run_name>/point_cloud/iteration_xxx/point_cloud.ply
```

例如已经存在的真实输出：

```text
test/garden_smoke_500_noviewer/point_cloud/iteration_500/point_cloud.ply
```

说明：

- `MEGS-2/train.py` 目前不作为这份 README 的主线。
- 如果后续要切换主模型路线，再单独更新此文档即可。

---

## 前端与模型如何对接

这是当前项目最重要的联调协议。

### 当前对接方式

当前前端**不调用 Python API**，也**没有真实 HTTP 后端接口**。  
它本质上只依赖两样东西：

1. 静态模型文件
2. `scenes.json` 场景元数据

也就是说，当前接口本质不是“前后端接口”，而是：

**文件系统约定 + 前端配置约定**

### 模型资产协议

当前推荐的模型路径结构是：

```text
public/assets/<scene>/point_cloud/iteration_30000/point_cloud.ply
```

前端会从 `scenes.json` 中读取 `modelPath`，再把这个路径交给：

```js
viewer.addSplatScene(scene.modelPath, ...)
```

所以只要 `.ply` 文件路径正确，前端就能加载它。

### scenes.json 最小字段

当前一个场景最少应包含这些字段：

```json
{
  "id": "garden",
  "name": "Garden",
  "dataset": "MipNeRF360",
  "thumbnail": "/thumbnails/garden.svg",
  "modelPath": "/assets/garden/point_cloud/iteration_30000/point_cloud.ply",
  "description": "Outdoor garden scene reconstructed with Gaussian Splatting.",
  "iteration": 30000
}
```

当前项目还额外使用了：

- `tags`
- `metrics.psnr`
- `metrics.ssim`
- `metrics.lpips`

但后续如果只想保证最小联调链路，上面那 6 到 7 个字段已经足够。

### 后续前端重构时必须保持兼容的地方

未来即使把前端改成更简洁、更华丽的页面，也尽量不要破坏下面两件事：

1. `scenes.json` 仍然能提供场景元数据
2. viewer 仍然能读取 `modelPath` 指向的 `.ply`

换句话说，UI 可以重做，但下面这条链不要断：

```text
scenes.json -> selectedScene.modelPath -> viewer.addSplatScene(...)
```

---

## 如何启动当前项目

### 1. 打开前端 viewer

```bash
cd /home/shirowana/FocusGS
bash start_garden_browser_viewer.sh
```

浏览器访问：

```text
http://localhost:4173/?scene=garden
```

### 2. 启动当前真实训练命令

```bash
conda activate focus
cd /home/shirowana/FocusGS/gaussian-splatting

python train.py \
  -s /home/shirowana/FocusGS/extracted/mipnerf360/garden \
  -m /home/shirowana/FocusGS/test/garden_live \
  --eval \
  -i images_4 \
  --ip 127.0.0.1 \
  --port 6009
```

说明：

- `-s` 指向训练输入场景目录
- `-m` 指向训练输出目录
- `-i images_4` 表示使用降采样图像目录，更适合当前显存条件

### 3. 可选：实时查看训练过程

如果想打开官方 SIBR 实时训练 viewer，可在另一个终端运行：

```bash
MESA_GL_VERSION_OVERRIDE=4.5 MESA_GLSL_VERSION_OVERRIDE=450 \
/home/shirowana/FocusGS/gaussian-splatting/SIBR_viewers/install/bin/SIBR_remoteGaussian_app \
  --ip 127.0.0.1 \
  --port 6009 \
  -s /home/shirowana/FocusGS/extracted/mipnerf360/garden
```

这一步是可选的，主要用于实时观察训练状态。

---

## 如何把新训练结果接到前端

下面用已经真实生成过的例子说明：

```text
test/garden_smoke_500_noviewer/
└── point_cloud/
    └── iteration_500/
        └── point_cloud.ply
```

这说明训练输出目录和前端展示目录**不是同一个目录**，但它们的格式是兼容的。

### 接入方式 1：复制结果

```bash
cp -r /home/shirowana/FocusGS/test/garden_smoke_500_noviewer \
  /home/shirowana/FocusGS/gs-browser-viewer/public/assets/garden_new
```

然后在 `scenes.json` 中新增：

```json
{
  "id": "garden-new",
  "name": "Garden New",
  "dataset": "MipNeRF360",
  "thumbnail": "/thumbnails/garden.svg",
  "modelPath": "/assets/garden_new/point_cloud/iteration_500/point_cloud.ply",
  "description": "New training output from gaussian-splatting.",
  "iteration": 500,
  "tags": ["test"],
  "metrics": {
    "psnr": null,
    "ssim": null,
    "lpips": null
  }
}
```

### 接入方式 2：软链接结果

如果在本机 Linux / WSL 环境下开发，也可以继续使用软链接：

```bash
ln -s /home/shirowana/FocusGS/test/garden_smoke_500_noviewer \
  /home/shirowana/FocusGS/gs-browser-viewer/public/assets/garden_new
```

这种方式开发时很方便，但跨机器打包时要注意软链接可能失效。

---

## 给后续前端替换 AI 的上下文

如果后续要让 AI 或前端同学重做页面，请优先理解下面这些约束。

### 当前前端技术形态

- 当前前端是一个单页 Vite 项目
- 不是 Python 服务
- 没有真实后端 API
- 数据来自静态文件加载

### 当前页面可以换什么

下面这些都可以自由重做：

- 顶部栏样式
- 左侧场景卡片布局
- 右侧信息栏布局
- 整体配色、排版、动画
- 首页样式、工作台样式、画廊样式

### 当前页面不能轻易破坏什么

下面这些是当前联调最小兼容面：

- `public/data/scenes.json` 的读取逻辑
- `selectedScene.modelPath` 的解析逻辑
- `viewer.addSplatScene(scene.modelPath, ...)` 的加载链路

也就是说，后续前端即使完全换壳，依然应该保留这个最小协议：

```text
场景配置 -> 模型路径 -> 加载 .ply -> 在 viewer 中显示
```

### 如果以后真的切换到更复杂的前后端模式

当前这套结构很适合作为第一阶段：

- 模型结果先导出成静态 `.ply`
- 前端先直接读静态资源

如果以后需要更复杂的功能，例如：

- 在线选择训练结果
- 动态读取场景列表
- 展示训练日志或指标曲线

再考虑引入单独的后端接口即可。但目前这个项目还没有走到那一步。

---

## 当前真实接口清单

为了避免后续联调时猜错，当前真实接口明确如下：

- 前端入口命令：
  - `bash start_garden_browser_viewer.sh`

- 前端页面地址：
  - `http://localhost:4173/?scene=<id>`

- 场景元数据来源：
  - `gs-browser-viewer/public/data/scenes.json`

- 模型资产协议：
  - `public/assets/<scene>/point_cloud/iteration_30000/point_cloud.ply`

- 前端加载调用：
  - `viewer.addSplatScene(scene.modelPath, ...)`

- 训练输入协议：
  - `extracted/mipnerf360/<scene>/images* + sparse/0/*`

- 训练输出协议：
  - `test/<run_name>/point_cloud/iteration_xxx/point_cloud.ply`

---

## 后续扩展

后续如果要把当前主模型链路从 `gaussian-splatting` 切换到 `MEGS-2`，建议优先保持前端协议不变：

- 仍然导出 `.ply`
- 仍然通过 `scenes.json` 注册场景
- 仍然通过 `modelPath` 加载 viewer

这样前端可以继续复用，只替换模型生成端。
