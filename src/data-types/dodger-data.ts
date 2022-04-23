export interface IScriptRun {
    script: string;
    args: unknown[];
}

export interface IScriptRunRequest {
    uid: string;
    script: string;
    args: unknown[];
}
