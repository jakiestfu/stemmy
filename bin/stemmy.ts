#! /usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import download from "download";
import path from "path";
import pkg from "../package.json";
import { stemmy } from "@jakiestfu/stemmy";
import colors from "colors/safe";
import { SingleBar } from "cli-progress";
import os from "os";
import mkdirp from "mkdirp";
import rimraf from "rimraf";

const demucsUrl = () => {
  if (process.platform === "linux") {
    return "https://github.com/jakiestfu/stemmy/releases/download/stemmy-linux-bin-0.3.0/demucs-cxfreeze-linux.zip";
  }
  return `https://github.com/stemrollerapp/demucs-cxfreeze/releases/download/1.0.0/demucs-cxfreeze-1.0.0-${
    process.platform === "win32" ? "win" : "mac"
  }.zip`;
};

const models = [
  "https://dl.fbaipublicfiles.com/demucs/mdx_final/83fc094f-4a16d450.th",
  "https://dl.fbaipublicfiles.com/demucs/mdx_final/7fd6ef75-a905dd85.th",
  "https://dl.fbaipublicfiles.com/demucs/mdx_final/14fc6a69-a89dd0ee.th",
  "https://dl.fbaipublicfiles.com/demucs/mdx_final/464b36d7-e5a9386e.th",
  "https://raw.githubusercontent.com/facebookresearch/demucs/main/demucs/remote/mdx_extra_q.yaml",
];

const cli = new Command()
  .name(pkg.name.split("/")[1])
  .description(pkg.description)
  .version(pkg.version);

const defaultStemmyResourcesDir = path.join(process.cwd(), ".stemmy");

const bar = new SingleBar({
  format: `{task} [${colors.cyan("{bar}")}] {percentage}%`,
  barCompleteChar: "=",
  barIncompleteChar: "-",
});

cli
  .command("download")
  .description("Download demucs and models")
  .argument("[outputDir]", "Output directory")
  .action(async (providedOutputDir) => {
    const outputDir = providedOutputDir ?? defaultStemmyResourcesDir;

    console.log(`Downloading to ${outputDir}`);

    if (fs.existsSync(outputDir))
      await fs.rm(outputDir, { recursive: true, force: true });

    const tmpdir = path.join(os.tmpdir(), 'stemmy-dl');
    await mkdirp(tmpdir)

    const url = demucsUrl();
    const name = path.basename(url).replace(".zip", "");
    const demucsOutDir = path.join(outputDir, "demucs");
    
    console.log("Downloading demucs", url);
    await download(url, tmpdir, {
      extract: true,
      filename: "demucs.zip",
    });
    
    await mkdirp(demucsOutDir);
    fs.renameSync(path.join(tmpdir, name), path.join(demucsOutDir));
    
    await Promise.all(
      models.map((url) =>
        download(url, path.join(outputDir, "models")).then((buffer) => {
          console.log(`Downloaded ${path.basename(url)}`);
          return buffer;
        })
      )
    );

    rimraf.sync(tmpdir);
  });

cli
  .command("make")
  .description("Generate Stems")
  .argument("[inputFile]", "Audio file to convert to stems")
  .option("-o, --outDir <outDir>", "Output directory")
  .option("--cpu", "Use the CPU", false)
  .option(
    "-r, --resources-dir <resourcesDir>",
    "Stemmy resources directory",
    defaultStemmyResourcesDir
  )
  .action(async (file, opts) => {
    bar.start(100, 0, {
      task: "Initializing...",
    });

    const cwd = process.cwd();

    await stemmy({
      file,
      outDir: opts.outDir ?? path.join(cwd, ".stems"),
      demucs: path.join(opts.resourcesDir, "demucs"),
      models: path.join(opts.resourcesDir, "models"),
      cpu: opts.cpu,
      onUpdate: ({ task, percentComplete }) => {
        bar.update(percentComplete, {
          task,
        });
      },
      onError: () => {
        // console.error('ERROR', data.toString())
      },
      onComplete: (res) => {
        console.log("Stemmy is done", res);
        process.exit(0);
      },
      ffmpeg: "ffmpeg",
    });
  });

cli.parse();
