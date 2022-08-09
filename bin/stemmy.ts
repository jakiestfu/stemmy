#! /usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import download from "download";
import path from "path";
import pkg from "../package.json";
import { stemmy } from "@jakiestfu/stemmy";
import colors from "colors/safe";
import { SingleBar } from "cli-progress";

const demucs =
  "https://github.com/stemrollerapp/demucs-cxfreeze/releases/download/1.0.0/demucs-cxfreeze-1.0.0-mac.zip";

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
  format:
    `{task} [${colors.cyan('{bar}')}] {percentage}%`,
    barCompleteChar: '=',
    barIncompleteChar: '-',
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

    console.log("Downloading demucs...");
    await download(demucs, path.join(outputDir, "demucs"), {
      extract: true,
      filename: "demucs.zip",
    });

    await Promise.all(
      models.map((url) =>
        download(url, path.join(outputDir, "models")).then((buffer) => {
          console.log(`Downloaded ${path.basename(url)}`);
          return buffer;
        })
      )
    );
  });

cli
  .command("make")
  .description("Generate Stems")
  .argument("[inputFile]", "Audio file to convert to stems")
  .option("-o, --outDir <outDir>", "Output directory")
  .option(
    "-r, --resources-dir <resourcesDir>",
    "Stemmy resources directory",
    defaultStemmyResourcesDir
  )
  .action(async (file, opts) => {

    bar.start(100, 0, {
      task: "Initializing..."
    });

    const cwd = process.cwd();

    stemmy({
      file: path.join(cwd, file),
      outDir: opts.outDir ?? path.join(cwd, ".stems"),
      demucs: path.join(
        opts.resourcesDir,
        "demucs",
        "demucs-cxfreeze-1.0.0-mac"
      ),
      models: path.join(opts.resourcesDir, "models"),
      onUpdate: ({ task, percentComplete }) => {
        bar.update(percentComplete, {
          task,
        });
      },
    });
  });

cli.parse();
