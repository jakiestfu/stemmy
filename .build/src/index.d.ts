/// <reference types="node" />
declare type StemmyOptions = {
    file: string;
    models: string;
    outDir: string;
    demucs: string;
    jobs?: number;
    fast?: boolean;
    onUpdate?: (data: {
        task: string;
        percentComplete: number;
        i?: number;
        trackPercent?: number;
        status?: 'known' | 'unknown';
    }) => void;
    onError?: (data: Buffer) => void;
    onComplete?: (data: {
        directory: string;
        files: string[];
    }) => void;
};
export declare const stemmy: (opts: StemmyOptions) => Promise<void>;
export {};
