export interface ICycleInfo {
    threads : number;
    startTime : number;
    executionTime : number;
    power : number;
}

export interface IWeakenCycle {
    w : ICycleInfo;
}

export interface IGrowCycle {
    g : ICycleInfo;
    wg : ICycleInfo;
}

export interface IHackCycle {
    h : ICycleInfo;
    wh : ICycleInfo;
    g : ICycleInfo;
    wg : ICycleInfo;
}

export interface IBatchInfo {
    uid : number;
    linkedEventId : number;
    processUids : number[];
    assignee : string;
    target : string;
    startingHackLevel : number;
    type : HackInstruction;
    levelTimeCutOff : number;
    reservedStartTime : number;
    reservedEndTime : number;
    cycles : number;
    cycleInfo : IWeakenCycle | IGrowCycle | IHackCycle
}

export enum HackMode {
    Normal,
    XPFarm,
    StockMarket,
    ShareAll
}

export function getModeFromEnum(mode : HackMode) : string {
    switch (mode) {
        case HackMode.Normal: return "Normal";
        case HackMode.XPFarm: return "XP Farm";
        case HackMode.StockMarket: return "Stock Market";
        case HackMode.ShareAll: return "Share All";
    }
}

export enum HackInstruction {
    Weaken,
    Grow,
    Hack,
    Share
}

export function getInstructionFromEnum(instruction : HackInstruction) : string {
    switch (instruction) {
        case HackInstruction.Weaken: return "Weaken";
        case HackInstruction.Grow: return "Grow";
        case HackInstruction.Hack: return "Hack";
        case HackInstruction.Share: return "Share";
    }
}
