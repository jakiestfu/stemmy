export declare const getJobsDefault: () => number;
declare type StemmyOptions = {
    file: string;
    models: string;
    outDir: string;
    demucs: string;
    jobs?: number;
    onUpdate?: (data: {
        task: string;
        percentComplete: number;
    }) => void;
};
export declare const stemmy: (opts: StemmyOptions) => Promise<void>;
export {};
