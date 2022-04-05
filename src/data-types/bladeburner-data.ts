export enum BladeburnerActionType {
	General,
	Contract,
	Operation,
	BlackOp
}

export function getBladeburnerActionTypeFromEnum(type : BladeburnerActionType) : string {
    switch (type) {
        case BladeburnerActionType.General: return "General";
        case BladeburnerActionType.Contract: return "Contract";
        case BladeburnerActionType.Operation: return "Operation";
        case BladeburnerActionType.BlackOp: return "BlackOp";
    }
}

export interface IBladeburnerAction {
	name : string;
	type : BladeburnerActionType;
}

export interface IBladeburnerBlackOpRank {
	name : string;
	rank : number;
}

export interface IBladeburnerActionInfo {
	name : string;
	return : number;
}

export interface IBladeburnerSkillUpgrade {
	name : string;
	limit : number;
	costMult : number;
}

export interface IBladeburnerSkills {
    name : string;
    level : number;
}

export interface IBladeburnerData {
	rank: number,
	stamina : number[];
	currentCity : string;
	currentAction : string;
    skillPoints : number;
    skills : IBladeburnerSkills[];
	lastUpdate : number;
    refreshPeriod : number;
}

export interface IBladeburnerActionAutolevel {
    name : string;
    autolevel : boolean;
}

export interface IBladeburnerActionCountRemaining {
    name : string;
    countRemaining : number;
}

export interface IBladeburnerActionCurrentLevel {
    name : string;
    currentLevel : number;
}

export interface IBladeburnerActionEstimatedSuccessChance {
    name : string;
    estimatedSuccessChance : [number, number];
}

export interface IBladeburnerActionMaxLevel {
    name : string;
    maxLevel : number;
}

export interface IBladeburnerActionRepGain {
    name : string;
    repGain : number;
}

export interface IBladeburnerActionTime {
    name : string;
    actionTime : number;
}

export interface IBladeburnerCityChaos {
	city : string;
	chaos : number;
}

export interface IBladeburnerCityPopulation {
    city : string;
    population : number;
}

export interface IBladeburnerSkillCost {
    name : string;
    cost : number;
}
