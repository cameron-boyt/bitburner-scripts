import { Skill } from "../data-types/skill-data";
import { SleeveInformation, SleeveSkills } from "/../NetscriptDefinitions";
import { IScriptRun } from "/data-types/dodger-data";
import { FactionWorkType } from "/data-types/faction-data";

export enum SleeveTaskType {
    Synchronise = "Synchronise",
    ShockRecovery = "Shock Recovery",
    Crime = "Crime",
    FactionWork = "Faction Work",
    CompanyWork = "Company Work",
    Train = "Training",
    None = "Idle"
}

export interface ISleeve {
    number: number;
    stats: SleeveSkills;
    info: SleeveInformation;
    task: {
        type: SleeveTaskType;
        details: ISleeveTaskCrime | ISleeveTaskFactionWork | ISleeveTaskCompanyWork | ISleeveTaskTrain | null;
    };
}

export interface ISleeveTaskCrime {
    name: string;
    successChance: number;
    moneyPerSecond: number;
    karmaPerSecond: number;
    killsPerSecond: number;
    moneyGainLastTick: number;
}

export interface ISleeveTaskFactionWork {
    faction: string;
    factionWork: FactionWorkType;
    repGain: number;
}

export interface ISleeveTaskCompanyWork {
    company: string;
    repGain: number;
    moneyGainLastTick: number;
}

export interface ISleeveTaskTrain {
    location: string;
    skill: Skill;
    expGain: number;
    moneyGainLastTick: number;
}

export interface ISleeveData {
    currentFunds: number;
    sleeves: ISleeve[];
    refreshPeriod: number;
    lastUpdate: number;
}

export enum SleeveMode {
    ShockRecovery = "Shock Recovery",
    SyncHost = "Synchronise",
    GangFound = "Gang Founder",
    StatTrain = "Stat Training",
    StockAssist = "Stock Assist",
    RepGrind = "Reputation Grind",
    MoneyMake = "Money Make",
    PillPush = "Pill Push"
}

export interface ISleeveTaskAssignment {
    assigned: boolean;
    script?: IScriptRun;
}
