import path from "path";
import os from "os";
import { spawn } from "child_process";
import mkdirp from "mkdirp";
import treeKill from "tree-kill";
import fs from "fs-extra";
import sanitize from "sanitize-filename";

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
    // console.log("spawing", command, args);
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
  fast?: boolean;
  onUpdate?: (data: {
    task: string;
    percentComplete: number;
    i?: number;
    trackPercent?: number;
  }) => void;
  onError?: (data: Buffer) => void;
  onComplete?: (data: { directory: string; files: string[] }) => void;
};

export const stemmy = async (opts: StemmyOptions) => {
  opts.onUpdate?.({
    task: "Initializing...",
    percentComplete: 0,
  });
  const id = (Math.random() + 1).toString(36).substring(7)
  const extension = path.parse(opts.file).ext;

  const baseName = sanitize(path.basename(opts.file).replace(extension, ""));

  const tmpDir = path.join(os.tmpdir(), "stemmy", id);

  await mkdirp(tmpDir);

  const tracks = ["vocals", "bass", "drums", "other"];
  const nModels = tracks.length;
  let trackPercent = 0;
  let lastTrackPercent = 0;
  let totalPercent = 0;
  let currentPredictionIndex = 0;

  const modelName = opts.fast ? "83fc094f" : "mdx_extra_q";

  const modelOutputDir = path.join(tmpDir, modelName);
  await mkdirp(modelOutputDir);

  const preparedInputPath = path.join(modelOutputDir, `original${extension}`);
  fs.copyFileSync(opts.file, preparedInputPath);

  const args = [
    preparedInputPath,
    "-n",
    modelName,
    "--repo",
    opts.models,
    "-j",
    String(opts.jobs || getJobsDefault()),
    "-o",
    tmpDir,
    "--mp3",
  ];

  const allExist = tracks.every((track) =>
    fs.existsSync(path.join(modelOutputDir, `${track}.mp3`))
  );

  if (!allExist) {
    await spawnAndWait(path.join(opts.demucs, "demucs-cxfreeze"), args, {
      onError: (data) => {
        const percentMatches = data.toString().match(/[0-9]+%/g);
        if (!percentMatches) {
          opts.onError?.(data);
          return;
        }
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

        if (trackPercent === 100) {
          if ((currentPredictionIndex = tracks.length - 1)) {
            opts.onUpdate?.({
              task: "Writing files...",
              percentComplete,
              i: currentPredictionIndex,
              trackPercent,
            });
          } else currentPredictionIndex++;
        }
      },
    });
  }

  opts.onUpdate?.({
    task: "Bouncing instrumental...",
    percentComplete: 0,
  });

  await spawnAndWait("ffmpeg", [
    "-i",
    path.join(modelOutputDir, "bass.mp3"),
    "-i",
    path.join(modelOutputDir, "drums.mp3"),
    "-i",
    path.join(modelOutputDir, "other.mp3"),
    "-filter_complex",
    "amix=inputs=3:normalize=0",
    path.join(modelOutputDir, "instrumental.mp3"),
  ]);

  const finalOutDir = path.join(opts.outDir, baseName);
  
  if (fs.existsSync(finalOutDir))
    await fs.rm(finalOutDir, { recursive: true, force: true });

  await fs.move(modelOutputDir, finalOutDir);
  await fs.rm(tmpDir, { recursive: true, force: true });

  opts.onComplete?.({
    directory: finalOutDir,
    files: [...tracks, "instrumental", "original"].map((track) =>
      path.join(finalOutDir, `${track}.mp3`)
    ),
  });
};
