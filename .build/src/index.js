"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stemmy = exports.getJobsDefault = void 0;
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const mkdirp_1 = __importDefault(require("mkdirp"));
const tree_kill_1 = __importDefault(require("tree-kill"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const getJobsDefault = () => {
    const maxJobs = 4;
    const numMemories = Math.floor(os_1.default.freemem() / 2000000000);
    const numCpus = os_1.default.cpus().length;
    return Math.max(1, Math.min(Math.min(numCpus, numMemories), maxJobs));
};
exports.getJobsDefault = getJobsDefault;
const spawnAndWait = (command, args, opts = {}) => {
    return new Promise((resolve, reject) => {
        console.log('SPAWN AND WAIT', command, args, {
            cwd: opts.cwd,
        });
        const child = (0, child_process_1.spawn)(command, args, {
            cwd: opts.cwd,
        });
        process.on("SIGINT", () => {
            if (child.pid)
                (0, tree_kill_1.default)(child.pid);
        });
        process.on("exit", () => {
            if (child.pid)
                (0, tree_kill_1.default)(child.pid);
        });
        if (opts.onData)
            child.stdout.on("data", opts.onData);
        if (opts.onError)
            child.stderr.on("data", opts.onError);
        child.on("error", (error) => {
            reject(error);
        });
        child.on("exit", (code, signal) => {
            console.log('EXITING', code, signal);
            if (signal !== null) {
                reject(new Error(`Child process exited due to signal: ${signal}`));
            }
            else {
                resolve(code);
            }
        });
    });
};
const stemmy = async (opts) => {
    opts.onUpdate?.({
        task: 'Initializing...',
        percentComplete: 0,
    });
    const baseName = path_1.default
        .basename(opts.file)
        .replace(path_1.default.parse(opts.file).ext, "");
    const tmpDir = path_1.default.join(os_1.default.tmpdir(), "stemmy", baseName);
    mkdirp_1.default.sync(tmpDir);
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
        String(opts.jobs || (0, exports.getJobsDefault)()),
        "-o",
        tmpDir,
        "--mp3",
    ];
    await spawnAndWait(path_1.default.join(opts.demucs, "demucs-cxfreeze"), args, {
        onError: (data) => {
            const percentMatches = data.toString().match(/[0-9]+%/g);
            if (!percentMatches)
                return;
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
            const task = `Extracting ${tracks[currentPredictionIndex]} track...`;
            const percentComplete = totalPercent / nModels;
            opts.onUpdate?.({
                task,
                percentComplete,
                i: currentPredictionIndex,
                trackPercent,
            });
            if (trackPercent === 100)
                currentPredictionIndex++;
        },
    });
    opts.onUpdate?.({
        task: "Bouncing instrumental...",
        percentComplete: 0,
    });
    await spawnAndWait("ffmpeg", [
        "-i",
        path_1.default.join(tmpDir, "bass.mp3"),
        "-i",
        path_1.default.join(tmpDir, "drums.mp3"),
        "-i",
        path_1.default.join(tmpDir, "other.mp3"),
        "-filter_complex",
        "amix=inputs=3:normalize=0",
        path_1.default.join(tmpDir, "instrumental.mp3"),
    ]);
    const finalOutDir = path_1.default.join(opts.outDir, baseName);
    if (fs_extra_1.default.existsSync(finalOutDir)) {
        await fs_extra_1.default.rm(finalOutDir, { recursive: true, force: true });
    }
    await fs_extra_1.default.move(path_1.default.join(tmpDir, "mdx_extra_q", baseName), finalOutDir);
};
exports.stemmy = stemmy;
//# sourceMappingURL=index.js.map