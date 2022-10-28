#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_extra_1 = __importDefault(require("fs-extra"));
const download_1 = __importDefault(require("download"));
const path_1 = __importDefault(require("path"));
const package_json_1 = __importDefault(require("../package.json"));
const stemmy_1 = require("../src");
const safe_1 = __importDefault(require("colors/safe"));
const cli_progress_1 = require("cli-progress");
const os_1 = __importDefault(require("os"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const rimraf_1 = __importDefault(require("rimraf"));
const demucsUrl = () => {
    if (process.platform === "linux") {
        return "https://github.com/jakiestfu/stemmy/releases/download/stemmy-linux-bin-0.3.0/demucs-cxfreeze-linux.zip";
    }
    return `https://github.com/stemrollerapp/demucs-cxfreeze/releases/download/1.0.0/demucs-cxfreeze-1.0.0-${process.platform === "win32" ? "win" : "mac"}.zip`;
};
const models = [
    "https://dl.fbaipublicfiles.com/demucs/mdx_final/83fc094f-4a16d450.th",
    "https://dl.fbaipublicfiles.com/demucs/mdx_final/7fd6ef75-a905dd85.th",
    "https://dl.fbaipublicfiles.com/demucs/mdx_final/14fc6a69-a89dd0ee.th",
    "https://dl.fbaipublicfiles.com/demucs/mdx_final/464b36d7-e5a9386e.th",
    "https://raw.githubusercontent.com/facebookresearch/demucs/main/demucs/remote/mdx_extra_q.yaml",
];
const cli = new commander_1.Command()
    .name(package_json_1.default.name.split("/")[1])
    .description(package_json_1.default.description)
    .version(package_json_1.default.version);
const defaultStemmyResourcesDir = path_1.default.join(process.cwd(), ".stemmy");
const bar = new cli_progress_1.SingleBar({
    format: `{task} [${safe_1.default.cyan("{bar}")}] {percentage}%`,
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
    if (fs_extra_1.default.existsSync(outputDir))
        await fs_extra_1.default.rm(outputDir, { recursive: true, force: true });
    const tmpdir = path_1.default.join(os_1.default.tmpdir(), 'stemmy-dl');
    await (0, mkdirp_1.default)(tmpdir);
    const url = demucsUrl();
    const name = path_1.default.basename(url).replace(".zip", "");
    const demucsOutDir = path_1.default.join(outputDir, "demucs");
    console.log("Downloading demucs", url);
    await (0, download_1.default)(url, tmpdir, {
        extract: true,
        filename: "demucs.zip",
    });
    await (0, mkdirp_1.default)(demucsOutDir);
    fs_extra_1.default.renameSync(path_1.default.join(tmpdir, name), path_1.default.join(demucsOutDir));
    await Promise.all(models.map((url) => (0, download_1.default)(url, path_1.default.join(outputDir, "models")).then((buffer) => {
        console.log(`Downloaded ${path_1.default.basename(url)}`);
        return buffer;
    })));
    rimraf_1.default.sync(tmpdir);
});
cli
    .command("make")
    .description("Generate Stems")
    .argument("[inputFile]", "Audio file to convert to stems")
    .option("-o, --outDir <outDir>", "Output directory")
    .option("--cpu", "Use the CPU", false)
    .option("-r, --resources-dir <resourcesDir>", "Stemmy resources directory", defaultStemmyResourcesDir)
    .action(async (file, opts) => {
    bar.start(100, 0, {
        task: "Initializing...",
    });
    const cwd = process.cwd();
    await (0, stemmy_1.stemmy)({
        file,
        outDir: opts.outDir ?? path_1.default.join(cwd, ".stems"),
        demucs: path_1.default.join(opts.resourcesDir, "demucs"),
        models: path_1.default.join(opts.resourcesDir, "models"),
        cpu: opts.cpu,
        onUpdate: ({ task, percentComplete }) => {
            bar.update(percentComplete, {
                task,
            });
        },
        onError: () => {
        },
        onComplete: (res) => {
            console.log("Stemmy is done", res);
            process.exit(0);
        },
        ffmpeg: "ffmpeg",
    });
});
cli.parse();
//# sourceMappingURL=stemmy.js.map