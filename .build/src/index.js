"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stemmy = void 0;
const path_1 = __importDefault(require("path"));
const mkdirp_1 = __importDefault(require("mkdirp"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const sanitize_filename_1 = __importDefault(require("sanitize-filename"));
const os_1 = __importDefault(require("os"));
const lib_1 = require("./lib");
const stemmy = async (opts) => {
    opts.onUpdate?.({
        task: "Initializing...",
        percentComplete: 0,
        status: 'unknown',
    });
    const id = (Math.random() + 1).toString(36).substring(7);
    const extension = path_1.default.parse(opts.file).ext;
    const baseName = (0, sanitize_filename_1.default)(path_1.default.basename(opts.file).replace(extension, ""));
    const tmpDir = path_1.default.join(os_1.default.tmpdir(), "stemmy", id);
    await (0, mkdirp_1.default)(tmpDir);
    const tracks = ["vocals", "bass", "drums", "other"];
    const nModels = tracks.length;
    let trackPercent = 0;
    let lastTrackPercent = 0;
    let totalPercent = 0;
    let currentPredictionIndex = 0;
    const modelName = opts.fast ? "83fc094f" : "mdx_extra_q";
    const modelOutputDir = path_1.default.join(tmpDir, modelName);
    await (0, mkdirp_1.default)(modelOutputDir);
    const preparedInputPath = path_1.default.join(modelOutputDir, `original${extension}`);
    fs_extra_1.default.copyFileSync(opts.file, preparedInputPath);
    const args = [
        preparedInputPath,
        "-n",
        modelName,
        "--repo",
        opts.models,
        "-j",
        String(opts.jobs || (0, lib_1.getJobsDefault)()),
        "-o",
        tmpDir,
        "--mp3",
    ];
    const allExist = tracks.every((track) => fs_extra_1.default.existsSync(path_1.default.join(modelOutputDir, `${track}.mp3`)));
    if (!allExist) {
        await (0, lib_1.spawnAndWait)(path_1.default.join(opts.demucs, "demucs-cxfreeze"), args, {
            onError: (data) => {
                const percentMatches = data.toString().match(/[0-9]+%/g);
                if (!percentMatches) {
                    opts.onError?.(data);
                    return;
                }
                try {
                    trackPercent = parseInt(percentMatches[0].replace("%", ""));
                }
                catch (e) { }
                const delta = trackPercent - lastTrackPercent;
                if (trackPercent !== lastTrackPercent) {
                    lastTrackPercent = trackPercent;
                    if (delta >= 0)
                        totalPercent += delta;
                }
                const task = `Applying "${(0, lib_1.capitalize)(tracks[currentPredictionIndex])}" tensor model...`;
                const percentComplete = totalPercent / nModels;
                opts.onUpdate?.({
                    task,
                    percentComplete,
                    i: currentPredictionIndex,
                    trackPercent,
                    status: 'known',
                });
                if (trackPercent === 100) {
                    if ((currentPredictionIndex = tracks.length - 1)) {
                        opts.onUpdate?.({
                            task: "Generating tracks...",
                            percentComplete,
                            i: currentPredictionIndex,
                            trackPercent,
                            status: 'unknown',
                        });
                    }
                    else
                        currentPredictionIndex++;
                }
            },
        });
    }
    opts.onUpdate?.({
        task: "Bouncing Instrumental...",
        percentComplete: 0,
        status: 'unknown',
    });
    await (0, lib_1.spawnAndWait)("ffmpeg", [
        "-i",
        path_1.default.join(modelOutputDir, "bass.mp3"),
        "-i",
        path_1.default.join(modelOutputDir, "drums.mp3"),
        "-i",
        path_1.default.join(modelOutputDir, "other.mp3"),
        "-filter_complex",
        "amix=inputs=3:normalize=0",
        path_1.default.join(modelOutputDir, "instrumental.mp3"),
    ]);
    const finalOutDir = path_1.default.join(opts.outDir, baseName);
    if (fs_extra_1.default.existsSync(finalOutDir))
        await fs_extra_1.default.rm(finalOutDir, { recursive: true, force: true });
    await fs_extra_1.default.move(modelOutputDir, finalOutDir);
    await fs_extra_1.default.rm(tmpDir, { recursive: true, force: true });
    opts.onComplete?.({
        directory: finalOutDir,
        files: [...tracks, "instrumental", "original"].map((track) => path_1.default.join(finalOutDir, `${track}.mp3`)),
    });
};
exports.stemmy = stemmy;
//# sourceMappingURL=index.js.map