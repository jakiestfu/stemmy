import os from "os";
import { spawn } from "child_process";
import treeKill from "tree-kill";

export const getJobsDefault = () => {
  const maxJobs = 4;
  const numMemories = Math.floor(os.freemem() / 2000000000);
  const numCpus = os.cpus().length;
  return Math.max(1, Math.min(Math.min(numCpus, numMemories), maxJobs));
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const spawnAndWait = (
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
      console.log('SIG INT, KILLING CHILD')
      if (child.pid) treeKill(child.pid);
    });
    process.on("exit", () => {
      console.log('EXIT, KILLING CHILD')
      if (child.pid) treeKill(child.pid);
    });

    if (opts.onData) child.stdout.on("data", opts.onData);
    if (opts.onError) child.stderr.on("data", opts.onError);

    child.on("error", (error) => {
      console.log('ERROR', error)
      reject(error);
    });

    child.on("exit", (code, signal) => {
      console.log('EXIT', {code, signal})
      if (signal !== null) {
        reject(new Error(`Child process exited due to signal: ${signal}`));
      } else {
        resolve(code);
      }
    });
  });
};
