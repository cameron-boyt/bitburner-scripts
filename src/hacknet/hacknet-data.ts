/** Upgrades that can be purchased with hashes. */
export enum HashUpgrades {
	Money = "Sell for Money",
	CorpFunds = "Sell for Corporation Funds",
	ReduceMinSecurity = "Reduce Minimum Security",
	IncreaseMaxMoney = "Increase Maximum Money",
	ImproveStudy = "Improve Studying",
	ImproveGym = "Improve Gym Training",
	CorpResearch = "Exchange for Corporation Research",
	BladeburnerRank = "Exchange for Bladeburner Rank",
	BladeburnerSkill = "Exchange for Bladeburner SP",
	GenCodingContract = "Generate Coding Contract"
}

/** Purchase script action types. */
export enum HashAction {
	BuyNewNode,
	UpgradeCores ,
	UpgradeLevel,
	UpgradeRAM
}

export function getActionFromEnum(action : HashAction) : string {
    switch (action) {
        case HashAction.BuyNewNode: return "Buy new node"
        case HashAction.UpgradeCores: return "Upgrade cores"
        case HashAction.UpgradeLevel: return "Upgrade level"
        case HashAction.UpgradeRAM: return "Upgrade RAM"
    }
}

/** Hacknet purchase evaluation object type */
export interface IHashPurchase {
	type : HashAction;
	node : number;
	cost : number;
	return : number;
}

export interface IHacknetServer {
    index : number;
    cache : number;
    cores : number;
    level : number;
    ram : number;
    ramUsed : number;
    production : number;
    totalProduction : number;
    hashCapacity : number;
}

/** Object type to store information about current hacknet server states. */
export interface IHacknetData {
    servers : IHacknetServer[];
    currentHashes : number;
    currentFunds : number;
    overallProduction : number;
    overallTotalProduction : number;
    refreshPeriod : number;
    lastUpdate : number;
}
