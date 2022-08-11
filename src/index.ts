import path from "path";
import os from "os";
import { spawn } from "child_process";
import mkdirp from "mkdirp";
import treeKill from "tree-kill";
import fs from "fs-extra";

export const getJobsDefault = () => {
  const maxJobs = 4;
  const numMemories = Math.floor(os.freemem() / 2000000000);
  const numCpus = os.cpus().length;
  return Math.max(1, Math.min(Math.min(numCpus, numMemories), maxJobs));
};

const spawnAndWait = (
  command: string,
  args: Array<string>,
  opts: {
    cwd?: string;
    onData?: (data: Buffer) => void;
    onError?: (data: Buffer) => void;
  } = {}
) => {
  return new Promise((resolve, reject) => {
    console.log('SPAWN AND WAIT', command, args, {
      cwd: opts.cwd,
    })

    const child = spawn(command, args, {
      cwd: opts.cwd,
    });

    process.on("SIGINT", () => {
      if (child.pid) treeKill(child.pid);
    });
    process.on("exit", () => {
      if (child.pid) treeKill(child.pid);
    });

    if (opts.onData) child.stdout.on("data", opts.onData);
    if (opts.onError) child.stderr.on("data", opts.onError);

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      console.log('EXITING', code, signal)
      if (signal !== null) {
        reject(new Error(`Child process exited due to signal: ${signal}`));
      } else {
        resolve(code);
      }
    });
  });
};

type StemmyOptions = {
  file: string;
  models: string;
  outDir: string;
  demucs: string;
  jobs?: number;
  onUpdate?: (data: {
    task: string;
    percentComplete: number;
    i?: number;
    trackPercent?: number;
  }) => void;
};

export const stemmy = async (opts: StemmyOptions) => {

  opts.onUpdate?.({
    task: 'Initializing...',
    percentComplete: 0,
  });

  const baseName = path
    .basename(opts.file)
    .replace(path.parse(opts.file).ext, "");

  const tmpDir = path.join(os.tmpdir(), "stemmy", baseName);
  mkdirp.sync(tmpDir);

  const tracks = ["vocals", "bass", "drums", "other"];
  const nModels = tracks.length;
  let trackPercent = 0;
  let lastTrackPercent = 0;
  let totalPercent = 0;
  let currentPredictionIndex = 0;

  const args = [
    opts.file,
    "-n",
    "mdx_extra_q",
    "--repo",
    opts.models,
    "-j",
    String(opts.jobs || getJobsDefault()),
    "-o",
    tmpDir,
    "--mp3",
  ];

  await spawnAndWait(path.join(opts.demucs, "demucs-cxfreeze"), args, {
    onError: (data) => {
      const percentMatches = data.toString().match(/[0-9]+%/g);
      if (!percentMatches) return;
      try {
        trackPercent = parseInt(percentMatches[0].replace("%", ""));
      } catch (e) {}

      const delta = trackPercent - lastTrackPercent;

      if (trackPercent !== lastTrackPercent) {
        lastTrackPercent = trackPercent;
        if (delta >= 0) totalPercent += delta;
      }

      const task = `Extracting ${tracks[currentPredictionIndex]} track...`;
      const percentComplete = totalPercent / nModels;

      opts.onUpdate?.({
        task,
        percentComplete,
        i: currentPredictionIndex,
        trackPercent,
      });

      if (trackPercent === 100) currentPredictionIndex++;
    },
  });

  opts.onUpdate?.({
    task: "Bouncing instrumental...",
    percentComplete: 0,
  });

  await spawnAndWait("ffmpeg", [
    "-i",
    path.join(tmpDir, "bass.mp3"),
    "-i",
    path.join(tmpDir, "drums.mp3"),
    "-i",
    path.join(tmpDir, "other.mp3"),
    "-filter_complex",
    "amix=inputs=3:normalize=0",
    path.join(tmpDir, "instrumental.mp3"),
  ]);

  const finalOutDir = path.join(opts.outDir, baseName);
  if (fs.existsSync(finalOutDir)) {
    await fs.rm(finalOutDir, { recursive: true, force: true });
  }
  await fs.move(path.join(tmpDir, "mdx_extra_q", baseName), finalOutDir);

  // console.log("Done!");
};
