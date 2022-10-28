FROM python:3.9
WORKDIR /demucs

ADD ./docker/main.py .

RUN sudo apt-get update
RUN sudo apt-get install ffmpeg ffprobe -y
RUN pip3 install torch torchvision torchaudio demucs SoundFile cx-Freeze
RUN cxfreeze main.py --target-dir=dist --target-name=demucs-cxfreeze --packages=torch