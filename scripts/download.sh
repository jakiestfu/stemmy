#!/usr/bin/env sh

DEMUCS_URL=https://github.com/stemrollerapp/demucs-cxfreeze/releases/download/1.0.0/demucs-cxfreeze-1.0.0-mac.zip
DEMUCS_NAME=$(basename $DEMUCS_URL)
MODELS="https://dl.fbaipublicfiles.com/demucs/mdx_final/83fc094f-4a16d450.th https://dl.fbaipublicfiles.com/demucs/mdx_final/7fd6ef75-a905dd85.th https://dl.fbaipublicfiles.com/demucs/mdx_final/14fc6a69-a89dd0ee.th https://dl.fbaipublicfiles.com/demucs/mdx_final/464b36d7-e5a9386e.th https://raw.githubusercontent.com/facebookresearch/demucs/main/demucs/remote/mdx_extra_q.yaml"

mkdir -p ./downloads
cd ./downloads   

if [ ! -f "$DEMUCS_NAME" ]; then
  curl -LO $DEMUCS_URL
  unzip $DEMUCS_NAME
  rm $DEMUCS_NAME
fi

mkdir -p ./models
cd ./models

for model in $MODELS; do
  if [ ! -f "$(basename $model)" ]; then
    curl -LO $model
  fi
done