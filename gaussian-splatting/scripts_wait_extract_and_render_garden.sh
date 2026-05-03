#!/bin/bash
set -euo pipefail
export PATH="$HOME/miniconda3/bin:$PATH"
eval "$(conda shell.bash hook)"
conda activate focus
cd "$HOME/FocusGS"
mkdir -p extracted models_render_check logs

MODELS_ZIP="$HOME/FocusGS/downloads/models.zip"
M360_ZIP="$HOME/FocusGS/downloads/360_v2.zip"
MODELS_DIR="$HOME/FocusGS/extracted/pretrained_models"
M360_DIR="$HOME/FocusGS/extracted/mipnerf360"
REPO_DIR="$HOME/FocusGS/gaussian-splatting"

if [ ! -d "$MODELS_DIR" ]; then
  mkdir -p "$MODELS_DIR"
  unzip -q "$MODELS_ZIP" -d "$MODELS_DIR"
fi
if [ ! -d "$M360_DIR" ]; then
  mkdir -p "$M360_DIR"
  unzip -q "$M360_ZIP" -d "$M360_DIR"
fi

python - <<'PY'
import os
root=os.path.expanduser('~/FocusGS/extracted/pretrained_models')
for dirpath, dirnames, filenames in os.walk(root):
    if os.path.basename(dirpath)=='garden' and 'point_cloud' in dirnames:
        print(dirpath)
        break
PY

cd "$REPO_DIR"
python render.py -m "$HOME/FocusGS/extracted/pretrained_models/garden" -s "$HOME/FocusGS/extracted/mipnerf360/garden" --skip_train --quiet
