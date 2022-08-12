/// <reference types="node" />
export declare const getJobsDefault: () => number;
export declare const capitalize: (s: string) => string;
export declare const spawnAndWait: (command: string, args: Array<string>, opts?: {
    cwd?: string | undefined;
    onData?: ((data: Buffer) => void) | undefined;
    onError?: ((data: Buffer) => void) | undefined;
}) => Promise<unknown>;
