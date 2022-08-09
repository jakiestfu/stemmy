#!/usr/bin/env sh

#./downloads/demucs-cxfreeze-1.0.0-mac/demucs-cxfreeze ./resources/nephew.mp3 -n mdx_extra_q --repo ./downloads/models -j 2
# ffmpeg  -i ./separated/mdx_extra_q/nephew/bass.wav \
#         -i ./separated/mdx_extra_q/nephew/drums.wav \
#         -i ./separated/mdx_extra_q/nephew/other.wav \
#         -filter_complex amix=inputs=3:normalize=0 \
#         ./separated/mdx_extra_q/nephew/instrumental.wav