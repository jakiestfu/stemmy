import path from "path";
import mkdirp from "mkdirp";
import fs from "fs-extra";
import sanitize from "sanitize-filename";
import os from "os";
import { capitalize, getJobsDefault, spawnAndWait } from "./lib";

type StemmyOptions = {
  file: string;
  models: string;
  outDir: string;
  demucs: string;
  ffmpeg: string
  jobs?: number;
  fast?: boolean;
  cpu?: boolean;
  command?: boolean;
  bin?: string;
  onLog?: (...args: unknown[]) => void,
  onUpdate?: (data: {
    task: string;
    percentComplete: number;
    i?: number;
    trackPercent?: number;
    status?: "known" | "unknown";
  }) => void;
  onError?: (data: Buffer) => void;
  onComplete?: (data: { directory: string; files: string[] }) => void;
  include?: Array<'instrumental' | 'original'>
};

export const stemmy = async (opts: StemmyOptions) => {
  opts.onUpdate?.({
    task: "Initializing",
    percentComplete: 0,
    status: "unknown",
  });
  const id = (Math.random() + 1).toString(36).substring(7);

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

  const includeInstrumental = opts.include?.includes('instrumental')
  const includeOriginal = opts.include?.includes('original')

  const modelName = opts.fast ? "83fc094f" : "mdx_extra_q";

  const modelOutputDir = path.join(tmpDir, modelName, "original");
  await mkdirp(modelOutputDir);

  const preparedInputPath = path.join(modelOutputDir, `original${extension}`);
  fs.copyFileSync(opts.file, preparedInputPath);

  let args = [
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
  if (opts.cpu) args = ["-d", "cpu", ...args]

  const allExist = tracks.every((track) =>
    fs.existsSync(path.join(modelOutputDir, `${track}.mp3`))
  );

  const demucsPath = opts.bin ?? path.join(opts.demucs, "demucs-cxfreeze")
  if (opts.command) {
    console.log(demucsPath, args);
  }

  if (!allExist)
    await spawnAndWait(demucsPath, args, {
      onError: (data) => {
        opts.onLog?.(data)
        
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

        const task = `Applying "${capitalize(
          tracks[currentPredictionIndex]
        )}" tensor model`;
        const percentComplete = totalPercent / nModels;

        opts.onUpdate?.({
          task,
          percentComplete,
          i: currentPredictionIndex,
          trackPercent,
          status: "known",
        });

        if (trackPercent === 100) {
          if ((currentPredictionIndex = tracks.length - 1)) {
            opts.onUpdate?.({
              task: "Generating tracks",
              percentComplete,
              i: currentPredictionIndex,
              trackPercent,
              status: "unknown",
            });
          } else currentPredictionIndex++;
        }
      },
    });

  if (includeInstrumental) {
    opts.onUpdate?.({
      task: "Bouncing Instrumental",
      percentComplete: 100,
      status: "unknown",
    });
  
    await spawnAndWait(opts.ffmpeg, [
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
  }

  const finalOutDir = path.join(opts.outDir, baseName);

  // Remove output dir
  if (fs.existsSync(finalOutDir))
    await fs.rm(finalOutDir, { recursive: true, force: true });

  // Move files over to output dir
  await fs.move(modelOutputDir, finalOutDir);

  // Remove temp dir
  await fs.rm(tmpDir, { recursive: true, force: true });

  let finalTracks = [
    ...tracks
  ]
  if (includeInstrumental) finalTracks = [...finalTracks, 'instrumental']
  if (includeOriginal) finalTracks = [...finalTracks, 'original']

  // Done
  opts.onComplete?.({
    directory: finalOutDir,
    files: finalTracks.map((track) =>
      path.join(finalOutDir, `${track}.mp3`)
    ),
  });
};
