import { GangGenInfo, GangMemberAscension, GangMemberInfo } from '@ns';

export const gangNames = [
	"Slum Snakes",
	"NiteSec",
	"Speakers for the Dead",
	"Tetrads",
	"The Black Hand",
	"The Dark Army",
	"The Syndicate"
];

export const gangMemberNames = [
	"Alpha", "Beta", "Gamma", "Delta", "Epsilon",
	"Zeta", "Eta", "Theta", "Iota", "Kappa",
	"Lambda", "Mu", "Nu", "Xi", "Omicron",
	"Pi", "Rho", "Sigma", "Tau", "Upsilon",
	"Phi", "Chi", "Psi", "Omega"
];

export enum GangSpecialTasks {
	Unassigned = "Unassigned",
	PowerGain = "Territory Warfare",
	ReduceWantedLevel = "Vigilante Justice"
}

export interface IGangClashChance {
	name : string;
	chance : number;
}

export interface IOtherGangData {
	name : string;
	power : number;
	territory : number;
}

export interface IGangData {
	gangInfo : GangGenInfo;
	otherGangInfo : IOtherGangData[];
	clashChances : IGangClashChance[];
    members : GangMemberInfo[];
	currentFunds : number;
	nextPowerTick : number;
	lastUpdate : number;
	refreshPeriod : number;
}

export interface IGangEquipmentType {
	name : string;
	type : string;
}

export interface IGangEquipmentCost {
	name : string;
	cost : number;
}

export interface IGangAscensionResult {
	name : string;
	result : GangMemberAscension | undefined;
}

export interface IGangTaskAssign {
	member : string;
	task : string;
}

export interface IGangEquipmentOrder {
	member : string;
	equipment : string;
}
