import { GangGenInfo, GangMemberInfo } from "@ns";

export const gangNames = ["Slum Snakes", "NiteSec", "Speakers for the Dead", "Tetrads", "The Black Hand", "The Dark Army", "The Syndicate"];

export const gangMemberNames = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Omicron",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
];

export enum GangSpecialTasks {
    Unassigned = "Unassigned",
    PowerGain = "Territory Warfare",
    ReduceWantedLevel = "Vigilante Justice",
    TrainHacking = "Train Hacking",
    TrainCombat = "Train Combat",
    TrainCharisma = "Train Charisma",
}

export interface IOtherGangData {
    power: number;
    territory: number;
    clashChance: number;
}

export interface IGangData {
    gangInfo: GangGenInfo;
    otherGangInfo: Record<string, IOtherGangData>;
    members: GangMemberInfo[];
    currentFunds: number;
    nextPowerTick: number;
    lastUpdate: number;
    refreshPeriod: number;
}

export interface IGangEquipment {
    type: string;
    cost: number;
}
