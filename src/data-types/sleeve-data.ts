import { Skill } from "./skill-data";
import { SleeveInformation, SleeveSkills } from '/../NetscriptDefinitions';
import { IScriptRun } from '/data-types/dodger-data';
import { FactionWorkType } from '/data-types/faction-data';

export enum SleeveTaskType {
    Synchronise,
    ShockRecovery,
    Crime,
    FactionWork,
    CompanyWork,
    Train,
    None
}

export function getSleeveTaskTypeFromEnum(mode : SleeveTaskType) : string {
    switch (mode) {
        case SleeveTaskType.Synchronise: return "Synchronise";
        case SleeveTaskType.ShockRecovery: return "Shock Recovery";
        case SleeveTaskType.Crime: return "Crime";
        case SleeveTaskType.FactionWork: return "Faction Work";
        case SleeveTaskType.CompanyWork: return "Company Work";
        case SleeveTaskType.Train: return "Training";
        case SleeveTaskType.None: return "Idle";
    }
}

export interface ISleeve {
    number : number;
    stats : SleeveSkills;
    info : SleeveInformation;
    task : {
        type : SleeveTaskType;
        details : ISleeveTaskCrime | ISleeveTaskFactionWork | ISleeveTaskCompanyWork | ISleeveTaskTrain | null;
    };
    lastScript : IScriptRun;
}

export interface ISleeveTaskCrime {
    name : string;
    successChance : number;
    moneyPerSecond : number;
    karmaPerSecond : number;
    killsPerSecond : number;
    moneyGainLastTick : number;
}

export interface ISleeveTaskFactionWork {
    faction : string;
    factionWork : FactionWorkType;
    repGain : number;
}

export interface ISleeveTaskCompanyWork {
    company : string;
    repGain : number;
    moneyGainLastTick : number;
}

export interface ISleeveTaskTrain {
    location : string;
    skill : Skill;
    expGain : number;
    moneyGainLastTick : number;
}

export interface ISleeveData {
    currentFunds : number;
    sleeves : ISleeve[];
    refreshPeriod : number;
    lastUpdate : number;
}

export enum SleeveMode {
    ShockRecovery,
    SyncHost,
    GangFound,
    StatTrain,
    StockAssist,
    RepGrind,
    MoneyMake,
    PillPush
}

export function getSleeveModeFromEnum(mode : SleeveMode) : string {
    switch (mode) {
        case SleeveMode.SyncHost: return "Synchronise";
        case SleeveMode.ShockRecovery: return "Shock Recovery";
        case SleeveMode.GangFound: return "Found Gang";
        case SleeveMode.StockAssist: return "Stock Growth";
        case SleeveMode.MoneyMake: return "Money";
        case SleeveMode.StatTrain: return "Training";
        case SleeveMode.RepGrind: return "Reputation";
        case SleeveMode.PillPush: return "Pill Push";
    }
}

export interface ISleeveTaskAssignment {
    assigned : boolean;
    script? : IScriptRun;
}
