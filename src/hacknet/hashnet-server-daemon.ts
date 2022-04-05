import { Hash } from 'crypto';
import { NS } from '../../NetscriptDefinitions'
import { IBladeburnerData } from '/data-types/bladeburner-data';
import { ICorpData } from '/data-types/corporation-data'
import { getActionFromEnum, HashAction, HashUpgrades, IHacknetData, IHashPurchase } from '/data-types/hacknet-data'
import { getAllServers } from '/helpers/server-helper';
import { genPlayer, IPlayerObject } from '/libraries/player-factory'
import { peekPort, PortNumber, purgePort, writeToPort } from '/libraries/port-handler'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js'
import { genServer, IServerObject } from '/libraries/server-factory';

// Script logger
let logger : ScriptLogger;

// Script refresh period
let refreshPeriod = 5000;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false],
    ["wild", false],
    ["hash-no-money", false],
	["hash-improve", false],
	["hash-improve-gym", false],
	["hash-improve-study", false],
	["hash-hacking", false],
	["hash-hacking-money", false],
	["hash-hacking-security", false],
	["hash-corp", false],
	["hash-corp-funds", false],
	["hash-corp-research", false],
	["hash-bladeburner", false],
	["hash-bladeburner-rank", false],
	["hash-bladeburner-skill", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

let wildSpending = false; // Allow purchasing upgrades with all available money

let hashNoMoney = false; // Should hashes NOT be spent on money
let hashImproveGym = false; // Should hashes be spent on improving gym effectiveness
let hashImproveStudy = false; // Should hashes be spent on improving study
let hashHackingMoney = false; // Should hashes be spent on increasing server money
let hashHackingSecurity = false; // Should hashes be spent on reducing server security
let hashCorpFunds = false; // Should hashes be spent on corporation funds
let hashCorpResearch = false; // Should hashes be spent on corporation research
let hashBladeburnerRank = false; // Should hashes be spent on bladeburner rank
let hashBladeburnerSkill = false; // Should hashes be spent on bladeburner skill points

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Hacknet server data object */
let hacknetData : IHacknetData;

/** Desirable hash upgrades to purchase */
let desireableUpgrades : HashUpgrades[] = [];

/** Maximum server cache */
let maxCache = 0;
/** Maximum server cores */
let maxCores = 0;
/** Maximum server level */
let maxLevel = 0;
/** Maximum server RAM */
let maxRam = 0;
/** Maximum number of servers */
let maxServers = 0;

/** Maximum debt */
const maximumDebt = -1e6;

/** Proportion of generated funds to go back into upgrading hacknet servers. */
const profitRatioForUpgrades = 0.9;

/** Maximum time for return of investment upgrades will be purchased for. */
const returnOfInvestmentThreshold = (3600 * 6); // 6 hours

/** All servers. */
let servers : IServerObject[];

/** Server to use server hash upgrades on. */
let hashServerTarget : IServerObject;

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
 function setupEnvironment(ns : NS) : void {
    player = genPlayer(ns);
    servers = getAllServers(ns).filter(x => x.slice(0, 6) !== "server" && x.slice(0, 7) !== "hacknet").map(x => genServer(ns, x));

	maxCache = ns.formulas.hacknetServers.constants().MaxCache;
	maxCores = ns.formulas.hacknetServers.constants().MaxCores;
	maxLevel = ns.formulas.hacknetServers.constants().MaxLevel;
	maxRam = ns.formulas.hacknetServers.constants().MaxRam;
	maxServers = ns.formulas.hacknetServers.constants().MaxServers;

	setDesiredHashUpgrades();

	hacknetData = {
		servers: [],
		currentHashes: 0,
		currentFunds: 0,
		overallProduction: 0,
		overallTotalProduction: 0,
		refreshPeriod: 0,
		lastUpdate: 0
	};

	purgePort(ns, PortNumber.HacknetData);
}

/*
 * ------------------------
 * > HASH VALUATION FUNCTION
 * ------------------------
*/

/**
 * Get the monetary value of a hash.
 * @param ns NS object parameter.
 * @returns Value of one (1) hash in $$$.
 */
function calculateHashValue(ns : NS) : number {
	return 1e6 / ns.hacknet.hashCost(HashUpgrades.Money);
}

/*
 * ------------------------
 * > HASHNET DATA UPDATE FUNCTIONS
 * ------------------------
*/

/**
 * Update data for each hacknet server.
 * @param ns NS object parameter.
 */
async function updateHacknetData(ns : NS) : Promise<void> {
	const previousTickProduction = hacknetData.overallTotalProduction;

	hacknetData.servers = [];
	for (let i = 0; i < ns.hacknet.numNodes(); i++) {
		const stats = ns.hacknet.getNodeStats(i);
		hacknetData.servers.push({
			index: i,
			cache: stats.cache,
			cores: stats.cores,
			level: stats.level,
			ram: stats.ram,
			ramUsed: stats.ramUsed,
			production: stats.production,
			totalProduction: stats.totalProduction,
			hashCapacity: stats.hashCapacity
		});
	}

	hacknetData.overallProduction = getCurrentProductionPerSecond();
	hacknetData.overallTotalProduction = getCurrentTotalProduction();

	const productionSinceLastTick = hacknetData.overallTotalProduction - previousTickProduction;
	const moneyProductionSinceLastTick = productionSinceLastTick * calculateHashValue(ns);

	hacknetData.currentHashes = ns.hacknet.numHashes();
	logger.log(`Production since last tick: ${ns.nFormat(productionSinceLastTick, '0.000a') + " hashes"} (${ns.nFormat(moneyProductionSinceLastTick, '$0.000a')})`, { type: MessageType.debugLow });
	logger.log(`Total stored funds: ${ns.nFormat(hacknetData.currentHashes, '0.000a') + " hashes"} (${ns.nFormat(hacknetData.currentFunds, '$0.000a')})`, { type: MessageType.debugLow });

	hashServerTarget = servers.filter((server) => server.isHackableServer).sort((a, b) => b.hackAttractiveness - a.hackAttractiveness)[0];

	hacknetData.lastUpdate = performance.now();
	hacknetData.refreshPeriod = refreshPeriod;
	purgePort(ns, PortNumber.HacknetData);
	await writeToPort<IHacknetData>(ns, PortNumber.HacknetData, hacknetData);
}

/**
 * Get the current sum of production per second of all nodes.
 * @returns Current production per second sum across all nodes.
 */
function getCurrentProductionPerSecond() : number {
	return hacknetData.servers.map((server) => server.production).reduce((a, b) => (a + b), 0);
}

/**
 * Get the current sum of total production of all nodes.
 * @returns Current total production sum across all nodes.
 */
function getCurrentTotalProduction() : number {
	return hacknetData.servers.map((server) => server.totalProduction).reduce((a, b) => (a + b), 0);
}

/**
 * Get the current sum of total production of all nodes.
 * @returns Current total production sum across all nodes.
 */
function getMaxHashCapacity() : number {
	return hacknetData.servers.map((server) => server.hashCapacity).reduce((a, b) => (a + b), 0);
}

/*
 * ------------------------
 * > SET WHICH UPGRADES TO SPEND HASHES ON FUNCTION
 * ------------------------
*/

/**
 * Set the upgrades to buy with hashes.
 */
function setDesiredHashUpgrades() : void {
	desireableUpgrades = [];

	hashNoMoney = hashNoMoney || (player.bitnodeN === 8);

	if (hashImproveGym) desireableUpgrades.push(HashUpgrades.ImproveGym);
	if (hashImproveStudy) desireableUpgrades.push(HashUpgrades.ImproveStudy);
	if (hashCorpFunds) desireableUpgrades.push(HashUpgrades.CorpFunds);
	if (hashCorpResearch) desireableUpgrades.push(HashUpgrades.CorpResearch);
	if (hashBladeburnerRank) desireableUpgrades.push(HashUpgrades.BladeburnerRank);
	if (hashBladeburnerSkill) desireableUpgrades.push(HashUpgrades.BladeburnerSkill);
	if (hashHackingMoney) desireableUpgrades.push(HashUpgrades.IncreaseMaxMoney);
	if (hashHackingSecurity) desireableUpgrades.push(HashUpgrades.ReduceMinSecurity);
}

/*
 * ------------------------
 * > HASHNET ACTION EVALUATOR FUNCTION
 * ------------------------
*/

/**
 * Determine the best next purchase to make.
 * @param ns NS object parameter.
 * @returns The best action to take, if there is one; nothing otherwise.
 */
function getBestAction(ns : NS) : IHashPurchase | void {
	let actions : IHashPurchase[] = [];

	if (canPurchaseNewServer()) actions.push(getServerPurchaseAction(ns));
	hacknetData.servers.forEach(server => actions.push(...getServerUpgradeActions(ns, server.index)));

	if (!wildSpending) actions = actions.filter((x) => x.cost / (x.return * calculateHashValue(ns)) <= returnOfInvestmentThreshold)

	if (actions.length > 0) {
		const actionsByValue = actions.sort((a, b) => (b.return / b.cost) - (a.return / a.cost));
		return actionsByValue[0];
	}
}

/*
 * ------------------------
 * > NEW SERVER PURCHASE EVALUATOR FUNCTIONS
 * ------------------------
*/

/**
 * Test if a new server can be purchased.
 * @returns True if a new server can be purchased; false otherwise.
 */
function canPurchaseNewServer() : boolean {
	return hacknetData.servers.length < maxServers;
}

/**
 * Get the action object for purchasing a new server.
 * @param ns NS object parameter.
 * @returns Action purchase object for purchasing a new server.
 */
function getServerPurchaseAction(ns : NS) : IHashPurchase {
	if (hacknetData.servers.length < 2) {
		return { type: HashAction.BuyNewNode, node: NaN, cost: ns.hacknet.getPurchaseNodeCost(), return: 1 };
	} else {
		const minCores = hacknetData.servers.map(x => x.cores).reduce((a, b) => Math.min(a, b));
		const minLevel = hacknetData.servers.map(x => x.level).reduce((a, b) => Math.min(a, b));
		const minRam = hacknetData.servers.map(x => x.ram).reduce((a, b) => Math.min(a, b));

		const totalCost = getTotalNewServerCost(ns, minCores, minLevel, minRam);
		const prodIncrease = ns.formulas.hacknetServers.hashGainRate(minLevel, 0, minRam, minCores, player.hacknet.productionMult);

		return { type: HashAction.BuyNewNode, node: NaN, cost: totalCost, return: prodIncrease };
	}
}

/**
 * Get the total cost of purchasing a new server and upgrading it to the provided stats.
 * @param ns NS object parameter.
 * @param cores Desired total cores.
 * @param levels Desired total levels.
 * @param ram Desired total RAM.
 * @returns Total cost for new server purchase plus all desired upgrades.
 */
function getTotalNewServerCost(ns : NS, cores : number, levels : number, ram : number) : number {
	return (
		ns.formulas.hacknetServers.hacknetServerCost(hacknetData.servers.length + 1, player.hacknet.purchaseCostMult) +
		ns.formulas.hacknetServers.coreUpgradeCost(1, cores - 1, player.hacknet.coresCostMult) +
		ns.formulas.hacknetServers.levelUpgradeCost(1, levels - 1, player.hacknet.levelCostMult) +
		ns.formulas.hacknetServers.ramUpgradeCost(1, Math.log(ram) / Math.log(2), player.hacknet.ramCostMult)
	);
}

/*
 * ------------------------
 * > NEW SERVER PURCHASE EVALUATOR FUNCTIONS
 * ------------------------
*/

/**
 * Get the action objects for purchasing an upgrade for the specified server.
 * @param ns NS object parameter.
 * @param index Number of the server to get upgrades for.
 * @returns Action purchase objects for upgrading a server
 */
function getServerUpgradeActions(ns : NS, index : number) : IHashPurchase[] {
	const upgradePurchases : IHashPurchase[] = [];

	if (canUpgradeServerCores(index)) 	upgradePurchases.push(getCoreUpgradePurchaseAction(ns, index));
	if (canUpgradeServerLevel(index)) 	upgradePurchases.push(getLevelUpgradePurchaseAction(ns, index));
	if (canUpgradeServerRam(index)) 	upgradePurchases.push(getRamUpgradePurchaseAction(ns, index));

	return upgradePurchases;
}

/*
 * ------------------------
 * > UPGRADE SERVER CORES EVALUATOR FUNCTIONS
 * ------------------------
*/

/**
 * Test if a server's number of cores can be upgraded.
 * @param index Number of the server to upgrade.
 * @returns True if the upgrade can be purchased; false otherwise.
 */
function canUpgradeServerCores(index : number) : boolean {
	return hacknetData.servers[index].cores < maxCores;
}

/**
 * Get the action object for upgrading a server's number of cores
 * @param ns NS object parameter.
 * @param index Number of the server to upgrade.
 * @returns Action purchase object for upgrading cores.
 */
function getCoreUpgradePurchaseAction(ns : NS, index : number) : IHashPurchase {
	const stats = hacknetData.servers[index];
	const cost = ns.hacknet.getCoreUpgradeCost(index, 1)
	const currentProd = stats.production;
	const newProd = ns.formulas.hacknetServers.hashGainRate(stats.level, stats.ramUsed, stats.ram, stats.cores + 1, player.hacknet.productionMult);
	const prodIncrease = newProd - currentProd;
	return { type: HashAction.UpgradeCores, node: index, cost: cost, return: prodIncrease };
}

/*
 * ------------------------
 * > UPGRADE SERVER LEVEL EVALUATOR FUNCTIONS
 * ------------------------
*/

/**
 * Test if a server's level can be upgraded.
 * @param index Number of the server to upgrade.
 * @returns True if the upgrade can be purchased; false otherwise.
 */
function canUpgradeServerLevel(index : number) : boolean {
	return hacknetData.servers[index].level < maxLevel;
}

/**
 * Get the action object for upgrading a server's level.
 * @param ns NS object parameter.
 * @param index Number of the server to upgrade.
 * @returns Action purchase object for upgrading level.
 */
function getLevelUpgradePurchaseAction(ns : NS, index : number) : IHashPurchase {
	const stats = hacknetData.servers[index];
	const currentProd = stats.production;
	const newProd = ns.formulas.hacknetServers.hashGainRate(stats.level + 1, stats.ramUsed, stats.ram, stats.cores, player.hacknet.productionMult);
	const prodIncrease = newProd - currentProd;
	return { type: HashAction.UpgradeLevel, node: index, cost: ns.hacknet.getLevelUpgradeCost(index, 1), return: prodIncrease };
}

/*
 * ------------------------
 * > UPGRADE SERVER RAM EVALUATOR FUNCTIONS
 * ------------------------
*/

/**
 * Test if a server's RAM can be upgraded.
 * @param index Number of the server to upgrade.
 * @returns True if the upgrade can be purchased; false otherwise.
 */
function canUpgradeServerRam(index : number) : boolean {
	return hacknetData.servers[index].ram < maxRam;
}

/**
 * Get the action object for upgrading a server's RAM.
 * @param ns NS object parameter.
 * @param index Number of the server to upgrade.
 * @returns Action purchase object for upgrading RAM.
 */
function getRamUpgradePurchaseAction(ns : NS, index : number) : IHashPurchase {
	const stats = hacknetData.servers[index];
	const currentProd = stats.production;
	const newProd = ns.formulas.hacknetServers.hashGainRate(stats.level, stats.ramUsed, Math.pow(2, (Math.log(stats.ram) / Math.log(2)) + 1), stats.cores, player.hacknet.productionMult);
	const prodIncrease = newProd - currentProd;
	return { type: HashAction.UpgradeRAM, node: index, cost: ns.hacknet.getRamUpgradeCost(index, 1), return: prodIncrease };
}

/*
 * ------------------------
 * > HACKNET SERVER UPGRADE FUNCTIONS
 * ------------------------
*/

/**
 * Try to purchase an upgrade for the hacknet servers by determining the best action to take.
 * @param ns NS object parameter.
 */
function tryDoHacknetUpgrade(ns : NS) : void {
	const action = getBestAction(ns);
	if (action) {
		logger.log(
			`Action --> ${getActionFromEnum(action.type)} ${action.type === HashAction.BuyNewNode ? "" : "for server " + action.node + " "}` +
			`costing ${ns.nFormat(action.cost, '$0.000a')}`, { type: MessageType.debugLow }
		);
		logger.log(`ROI --> ${action.cost / (action.return * calculateHashValue(ns))} seconds`, { type: MessageType.debugLow });

		tryDoAction(ns, action);
	} else {
		logger.log(`No available actions to take`, { type: MessageType.debugHigh });
	}
}

/**
 * Try to do the provided action.
 * @param ns NS object parameter.
 * @param action Action object to do.
 * @returns True if the action was performed successfully; false otherwise.
 */
function tryDoAction(ns : NS, action : IHashPurchase) : boolean {
	if (canPurchaseUpgrade(action.cost)) {
		switch (action.type) {
			case HashAction.BuyNewNode: return tryDoBuyNewServer(ns, action);
			case HashAction.UpgradeCores: return tryDoUpgradeServerCores(ns, action);
			case HashAction.UpgradeLevel: return tryDoUpgradeServerLevel(ns, action);
			case HashAction.UpgradeRAM: return tryDoUpgradeServerRam(ns, action);
		}
	} else {
		logger.log(`Unable to afford purchase`, { type: MessageType.debugHigh });
		return false;
	}
}

/**
 * Test if the player can afford an upgrade action.
 * @param cost Cost of action.
 * @returns True if the player can afford the action; false otherwise.
 */
function canPurchaseUpgrade(cost : number) : boolean {
	return (
		player.money >= cost &&
		(
			wildSpending
				? (player.money - cost >= 100e9)
				: (hacknetData.currentFunds - cost >= maximumDebt)
		)
	);
}

/**
 * Try to purchase an new hacknet server.
 * @param ns NS object parameter.
 * @param action Action purchase object.
 * @returns True if purchase was successful; false otherwise.
 */
function tryDoBuyNewServer(ns : NS, action : IHashPurchase) : boolean {
	const oldServerCount = hacknetData.servers.length - 1;
	if (ns.hacknet.purchaseNode() >= 0) {
		logger.log(`Bought new Hacknet Server (#${oldServerCount + 1})`, { type: MessageType.success, sendToast: true });
		hacknetData.currentFunds -= action.cost;
		return true;
	} else {
		logger.log(`Failed to purchase new Hacknet Server (#${oldServerCount + 1})`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/**
 * Try to purchase more cores for a hacknet server.
 * @param ns NS object parameter.
 * @param action Action purchase object.
 * @returns True if purchase was successful; false otherwise.
 */
function tryDoUpgradeServerCores(ns : NS, action : IHashPurchase) : boolean {
	const oldCores = hacknetData.servers[action.node].cores;
	if (ns.hacknet.upgradeCore(action.node, 1)) {
		logger.log(`Bought Cores upgrade (${oldCores} >> ${oldCores + 1}) for Server #${action.node}`, { type: MessageType.success, sendToast: true });
		hacknetData.currentFunds -= action.cost;
		return true;
	} else {
		logger.log(`Failed to purchase Cores upgrade (${oldCores} >> ${oldCores + 1}) for Server #${action.node}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/**
 * Try to purchase a level for a hacknet server.
 * @param ns NS object parameter.
 * @param action Action purchase object.
 * @returns True if purchase was successful; false otherwise.
 */
function tryDoUpgradeServerLevel(ns : NS, action : IHashPurchase) : boolean {
	const oldLevel = hacknetData.servers[action.node].level;
	if (ns.hacknet.upgradeLevel(action.node, 1)) {
		logger.log(`Bought Level upgrade (${oldLevel} >> ${oldLevel + 1}) for Server #${action.node}`, { type: MessageType.success, sendToast: true });
		hacknetData.currentFunds -= action.cost;
		return true;
	} else {
		logger.log(`Failed to purchase Level upgrade (${oldLevel} >> ${oldLevel + 1}) for Server #${action.node}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/**
 * Try to purchase more RAM for a hacknet server.
 * @param ns NS object parameter.
 * @param action Action purchase object.
 * @returns True if purchase was successful; false otherwise.
 */
function tryDoUpgradeServerRam(ns : NS, action : IHashPurchase) : boolean {
	const oldRam = hacknetData.servers[action.node].ram;
	if (ns.hacknet.upgradeRam(action.node, 1)) {
		logger.log(`Bought RAM upgrade (${oldRam} >> ${oldRam * 2}) for Server #${action.node}`, { type: MessageType.success, sendToast: true });
		hacknetData.currentFunds -= action.cost;
		return true;
	} else {
		logger.log(`Failed to purchase RAM upgrade (${oldRam} >> ${oldRam * 2}) for Server #${action.node}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/*
 * ------------------------
 * > HASHNET CACHE UPGRADE CHECKER FUNCTION
 * ------------------------
*/

/**
 * Check if it would be sensible to purchase a cache upgrade, then do it.
 * @param ns NS object parameter.
 */
 function checkCacheUpgradeRequired(ns : NS) : void {
	if (hacknetData.servers.length > 0 && isCacheUpgradeRequired()) {
		logger.log(`Cache upgrade is required`, { type: MessageType.warning });
		tryDoCacheUpgrade(ns);
	} else {
		logger.log(`Cache upgrade not required`, { type: MessageType.debugHigh });
	}
}

/**
 * Test if a cache upgrade is required.
 * @returns True if a cache upgrade is required; false otherwise.
 */
function isCacheUpgradeRequired() : boolean {
	return hacknetData.currentHashes >= getMaxHashCapacity() / 2 && hacknetData.servers.some(x => x.cache < maxCache);
}

/**
 * Try to do a cache upgrade action.
 * @param ns NS object parameter.
 * @returns True if the action was performed successfully; false otherwise.
 */
function tryDoCacheUpgrade(ns : NS) : boolean {
	const server = getServerWithMinCache();
	const cost = ns.hacknet.getCacheUpgradeCost(server, 1);

	if (player.money >= cost) {
		return tryDoUpgradeServerCache(ns, server, cost);
	} else {
		logger.log(`Unable to afford purchase`, { type: MessageType.debugHigh });
		return false;
	}
}

/**
 * Get the server with the lowest hash capacity.
 * @returns Server number that has the lowest hash capacity.
 */
function getServerWithMinCache() : number {
	return hacknetData.servers.reduce((a, b) => (a.hashCapacity > b.hashCapacity ? b : a)).index;
}

/**
 * Try to purchase a cache upgrade for a hacknet server.
 * @param ns NS object parameter.
 * @param index Server number to purchase upgrade for.
 * @param cost Cost of upgrade.
 * @returns True if purchase was successful; false otherwise.
 */
 function tryDoUpgradeServerCache(ns : NS, index : number, cost : number) : boolean {
	const oldLevel = hacknetData.servers[index].cache;
	const oldCapacity = hacknetData.servers[index].hashCapacity;
	if (ns.hacknet.upgradeCache(index, 1)) {
		logger.log(`Bought Cache upgrade (${oldLevel} >> ${oldLevel + 1} Capacity: ${oldCapacity} >> ${oldCapacity * 2}) for Server #${index}`, { type: MessageType.success, sendToast: true });
		hacknetData.currentFunds -= cost;
		return true;
	} else {
		logger.log(`Failed to buy Cache upgrade (${oldLevel} >> ${oldLevel + 1} Capacity: ${oldCapacity} >> ${oldCapacity * 2}) for Server #${index}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/*
 * ------------------------
 * > HASH PROCESSING FUNCTION
 * ------------------------
*/

/**
 * Process the available hashes the hacknet servers have produced.
 * @param ns NS object parameter.
 */
function processAvailableHashes(ns : NS) : void {
	for (const up of desireableUpgrades) {
		if (canPurchaseHashUpgrade(ns, up)) {
			trySpendHashesOnUpgrade(ns, up);
			break;
		}
	}

	trySpendRemainingHashes(ns);
}

/**
 * Test if a given hash upgrade can be purchased.
 * @param ns NS object.
 * @param upgrade Hash upgrade.
 * @returns True if the hash upgrade can be purchased; false otherwise.
 */
function canPurchaseHashUpgrade(ns : NS, upgrade: HashUpgrades) : boolean {
	return canAffordHashUpgrade(ns, upgrade) && hashUpgradeRequirementsMet(ns, upgrade);
}

/**
 * Test if a given hash upgrade can be purchased.
 * @param ns NS object parameter
 * @param upgrade Hash upgrade to purchase.
 * @returns True if the hash upgrade can be purchased; false otherwise.
 */
function canAffordHashUpgrade(ns : NS, upgrade : HashUpgrades) : boolean {
	return hacknetData.currentHashes >= ns.formulas.hacknetServers.hashUpgradeCost(upgrade, ns.hacknet.getHashUpgradeLevel(upgrade));
}

/**
 * Test if a given upgrade's requirements for purchase is met.
 * @param ns NS object parameter.
 * @param upgrade Upgrade type.
 * @returns True if the upgrade type purchase requirement is met; false otherwise.
 */
function hashUpgradeRequirementsMet(ns : NS, upgrade : HashUpgrades) : boolean {
	switch (upgrade) {
		case HashUpgrades.BladeburnerRank:
		case HashUpgrades.BladeburnerSkill: {
			const data = peekPort<IBladeburnerData>(ns, PortNumber.BladeburnerData);
			if (data) {
				return data.lastUpdate >= performance.now() - 30000;
			} else {
				return false;
			}
		}

		case HashUpgrades.CorpFunds: {
			const corpData = peekPort<ICorpData>(ns, PortNumber.CorpData);
			if (corpData) {
				return corpData.lastUpdate >= performance.now() - 30000;
			} else {
				return false;
			}
		}

		case HashUpgrades.CorpResearch: {
			const corpData = peekPort<ICorpData>(ns, PortNumber.CorpData);
			if (corpData) {
				return corpData.lastUpdate >= performance.now() - 30000 && corpData.divisions.length > 1;
			} else {
				return false;
			}
		}

		default: return true;
	}
}

/**
 * Try to purchase the given hash upgrade.
 * @param ns NS object parameter
 * @param upgrade Hash upgrade to purchase.
 * @returns True if the upgrade was purchased successfully; false otherwise.
 */
function trySpendHashesOnUpgrade(ns : NS, upgrade : HashUpgrades) : boolean {
	const oldLevel = ns.hacknet.getHashUpgradeLevel(upgrade);
	const cost = ns.hacknet.hashCost(upgrade);

	const result = ((upgrade === HashUpgrades.IncreaseMaxMoney || upgrade === HashUpgrades.ReduceMinSecurity)
		? ns.hacknet.spendHashes(upgrade, hashServerTarget.hostname)
		: ns.hacknet.spendHashes(upgrade)
	);

	if (result) {
		logger.log(`Bought Hash Upgrade [${upgrade}] (${oldLevel} >> ${oldLevel + 1})`, { type: MessageType.success, sendToast: true });
		hacknetData.currentHashes -= cost;
		return true;
	} else {
		logger.log(`Failed to buy Hash Upgrade [${upgrade}] (${oldLevel} >> ${oldLevel + 1})`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/**
 * Try to spend the remaining stored hashes or wait for a better upgrade to become affordable.
 * @param ns NS object parameter
 */
function trySpendRemainingHashes(ns : NS) : void {
	for (const up of desireableUpgrades) {
		if (hashUpgradeRequirementsMet(ns, up) && ns.hacknet.hashCost(up) / hacknetData.overallProduction <= 150) {
			logger.log(`Able to buy upgrade [${up}] in less than 150 seconds worth of production`, { type: MessageType.debugLow });
			return;
		}
	}

	if (!hashNoMoney) spendHashesOnMoney(ns);
}

/**
 * Spend all remaining hashes on money.
 * @param ns NS object parameter.
 */
function spendHashesOnMoney(ns : NS) : void {
	let hashesSpent = 0;
	while (ns.hacknet.numHashes() >= 4) {
		ns.hacknet.spendHashes(HashUpgrades.Money);
		hacknetData.currentHashes -= 4;
		hacknetData.currentFunds += 4 * calculateHashValue(ns) * profitRatioForUpgrades;
		hashesSpent += 1;
	}

	if (hashesSpent > 0) {
		logger.log(`Spent ${4 * hashesSpent} hashes on ${ns.nFormat(hashesSpent * 1e6, '$0.000a')}`, { type: MessageType.info });
	}
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "HASHNET", "Hashnet Server Management Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
	wildSpending = flags["wild"];
	hashNoMoney = flags["hash-no-money"];
	hashImproveGym = flags["hash-improve-gym"]|| flags["hash-improve"];
	hashImproveStudy = flags["hash-improve-study"]|| flags["hash-improve"];
	hashHackingMoney = flags["hash-hacking-money"]|| flags["hash-hacking"];
	hashHackingSecurity = flags["hash-hacking-secutiry"]|| flags["hash-hacking"];
	hashCorpFunds = flags["hash-corp-funds"] || flags["hash-corp"];
	hashCorpResearch = flags["hash-corp-research"] || flags["hash-corp"];
	hashBladeburnerRank = flags["hash-bladeburner-rank"] || flags["hash-bladeburner"];
	hashBladeburnerSkill = flags["hash-bladeburner-skill"] || flags["hash-bladeburner"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	if (wildSpending) refreshPeriod = 1000;

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`Hashnet Management Daemon\n`+
			`Description:\n` +
			`   Manages the purchasing and upgrading of hashnet servers and spending their produced hashes.\n` +
			`Usage:\n` +
			`   run /hacknet/hashnet-server-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help    			   : boolean |>> Prints this.\n` +
			`   -v or --verbose 			   : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   		       : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   	  --wild   		      	   : boolean |>> Enables spending money on upgrades as soon as they can be afforded.\n` +
			`         --hash-no-money          : boolean |>> Prevents spending hashes on money.\n` +
			`         --hash-improve           : boolean |>> Enables spending hashes on training improvement upgrades.\n` +
			`         --hash-improve-gym       : boolean |>> Enables spending hashes on improving gym training.\n` +
			`         --hash-improve-study     : boolean |>> Enables spending hashes on improving study training.\n` +
			`         --hash-hacking           : boolean |>> Enables spending hashes on server hacking upgrades.\n` +
			`         --hash-hacking-money     : boolean |>> Enables spending hashes on increasing server money.\n` +
			`         --hash-hacking-security  : boolean |>> Enables spending hashes on decreasing server security.\n` +
			`         --hash-corp              : boolean |>> Enables spending hashes on all corporation upgrades.\n` +
			`         --hash-corp-funds        : boolean |>> Enables spending hashes on corporation funds.\n` +
			`         --hash-corp-research     : boolean |>> Enables spending hashes on corporation research points.\n` +
			`         --hash-bladeburner       : boolean |>> Enables spending hashes on all Bladeburner upgrades.\n` +
			`         --hash-bladeburner-rank  : boolean |>> Enables spending hashes on Bladeburner rank.\n` +
			`         --hash-bladeburner-skill : boolean |>> Enables spending hashes on Bladeburner skill points.`
		);

		return;
	}

	setupEnvironment(ns);

    logger.initialisedMessage(true, false);

	while (true) {
		await updateHacknetData(ns);
		tryDoHacknetUpgrade(ns);
		checkCacheUpgradeRequired(ns);
		processAvailableHashes(ns);
		await ns.asleep(refreshPeriod);
	}

	/**
	 * Add functinality to spend hashes on increaseing server money + decreasing server min security
	 */
}
