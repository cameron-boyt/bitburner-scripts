export interface IScriptRun {
    script : string;
    args : (string | boolean | number)[];
}

export interface IScriptRunRequest {
    uid : string;
    script : string;
    args : (string | boolean | number)[];
}
