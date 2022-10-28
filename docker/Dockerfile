FROM python:3.9
WORKDIR /demucs

ADD ./docker/main.py .

RUN apt-get update
RUN apt-get install ffmpeg -y
RUN pip3 install torch torchvision torchaudio demucs sox cx-Freeze
RUN cxfreeze main.py --target-dir=dist --target-name=demucs-cxfreeze --packages=torch
RUN cp ./venv/Lib/site-packages/_soundfile_data ./dist/lib/_soundfile_data