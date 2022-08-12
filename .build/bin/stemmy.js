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
const demucs = "https://github.com/stemrollerapp/demucs-cxfreeze/releases/download/1.0.0/demucs-cxfreeze-1.0.0-mac.zip";
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
    format: `{task} [${safe_1.default.cyan('{bar}')}] {percentage}%`,
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
    if (fs_extra_1.default.existsSync(outputDir))
        await fs_extra_1.default.rm(outputDir, { recursive: true, force: true });
    console.log("Downloading demucs...");
    await (0, download_1.default)(demucs, path_1.default.join(outputDir, "demucs"), {
        extract: true,
        filename: "demucs.zip",
    });
    await Promise.all(models.map((url) => (0, download_1.default)(url, path_1.default.join(outputDir, "models")).then((buffer) => {
        console.log(`Downloaded ${path_1.default.basename(url)}`);
        return buffer;
    })));
});
cli
    .command("make")
    .description("Generate Stems")
    .argument("[inputFile]", "Audio file to convert to stems")
    .option("-o, --outDir <outDir>", "Output directory")
    .option("-r, --resources-dir <resourcesDir>", "Stemmy resources directory", defaultStemmyResourcesDir)
    .action(async (file, opts) => {
    bar.start(100, 0, {
        task: "Initializing..."
    });
    const cwd = process.cwd();
    await (0, stemmy_1.stemmy)({
        file,
        outDir: opts.outDir ?? path_1.default.join(cwd, ".stems"),
        demucs: path_1.default.join(opts.resourcesDir, "demucs", "demucs-cxfreeze-1.0.0-mac"),
        models: path_1.default.join(opts.resourcesDir, "models"),
        onUpdate: ({ task, percentComplete }) => {
            bar.update(percentComplete, {
                task,
            });
        },
        onError: () => {
        },
        onComplete: (res) => {
            console.log('Stemmy is done', res);
            process.exit(0);
        }
    });
});
cli.parse();
//# sourceMappingURL=stemmy.js.map