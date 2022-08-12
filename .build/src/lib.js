"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnAndWait = exports.capitalize = exports.getJobsDefault = void 0;
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const tree_kill_1 = __importDefault(require("tree-kill"));
const getJobsDefault = () => {
    const maxJobs = 4;
    const numMemories = Math.floor(os_1.default.freemem() / 2000000000);
    const numCpus = os_1.default.cpus().length;
    return Math.max(1, Math.min(Math.min(numCpus, numMemories), maxJobs));
};
exports.getJobsDefault = getJobsDefault;
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
exports.capitalize = capitalize;
const spawnAndWait = (command, args, opts = {}) => {
    return new Promise((resolve, reject) => {
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
            if (signal !== null) {
                reject(new Error(`Child process exited due to signal: ${signal}`));
            }
            else {
                resolve(code);
            }
        });
    });
};
exports.spawnAndWait = spawnAndWait;
//# sourceMappingURL=lib.js.map