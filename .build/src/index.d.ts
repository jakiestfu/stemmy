/// <reference types="node" />
declare type StemmyOptions = {
    file: string;
    models: string;
    outDir: string;
    demucs: string;
    ffmpeg: string;
    jobs?: number;
    fast?: boolean;
    cpu?: boolean;
    command?: boolean;
    bin?: string;
    onUpdate?: (data: {
        task: string;
        percentComplete: number;
        i?: number;
        trackPercent?: number;
        status?: "known" | "unknown";
    }) => void;
    onError?: (data: Buffer) => void;
    onComplete?: (data: {
        directory: string;
        files: string[];
    }) => void;
    include?: Array<'instrumental' | 'original'>;
};
export declare const stemmy: (opts: StemmyOptions) => Promise<void>;
export {};
