export enum BladeburnerActionType {
    General = "General",
    Contract = "Contract",
    Operation = "Operation",
    BlackOp = "BlackOp",
}

export interface IBladeburnerAction {
    name: string;
    type: BladeburnerActionType;
}

export interface IBladeburnerActionInfo {
    type: BladeburnerActionType;
    autolevel: boolean;
    countRemaining: number;
    currentLevel: number;
    estimatedSuccessChance: [number, number];
    maxLevel: number;
    repGain: number;
    actionTime: number;
}

export interface IBladeburnerSkillInfo {
    cost: number;
    limit: number;
    costMult: number;
}

export interface IBladeburnerData {
    rank: number;
    stamina: number[];
    currentCity: string;
    currentAction: string;
    skillPoints: number;
    skills: Record<string, number>;
    lastUpdate: number;
    refreshPeriod: number;
}

export interface IBladeburnerCityInfo {
    population: number;
    chaos: number;
}
