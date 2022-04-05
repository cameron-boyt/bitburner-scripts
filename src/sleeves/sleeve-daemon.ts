import { AugmentationStats, AugmentPair, BitNodeMultipliers, CrimeStats, NS, SleeveInformation, SleeveSkills, SleeveTask } from '@ns'
import { CrimeType } from '/data-types/crime-data.js';
import { getSleeveModeFromEnum, ISleeve, ISleeveData, ISleeveTaskAssignment, ISleeveTaskCompanyWork, ISleeveTaskCrime, ISleeveTaskFactionWork, ISleeveTaskTrain, SleeveMode, SleeveTaskType } from '/data-types/sleeve-data.js';
import { peekPort, PortNumber, purgePort, writeToPort } from '/libraries/port-handler.js';
import { genPlayer, IPlayerObject } from '/libraries/player-factory.js';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { getSkillFromEnum, Skill } from '/data-types/skill-data.js';
import { IStockData, symToCompany } from '/data-types/stock-data.js';
import { readBitnodeMultiplierData } from '/data/read-bitnodemult-data';
import { readAugmentData } from '/data/read-augment-data';
import { runDodgerScript, runDodgerScriptBulk } from '/helpers/dodger-helper';
import { calculateCrimeChance, getBestCrime, getCrimeData } from '/helpers/crime-helper';
import { IAugmentInfo } from '/libraries/constants';
import { getPlayerSensibleSkillApproximation, getSleeveSensibleSkillApproximation } from '/helpers/skill-helper';
import { getBestWorkType } from '/helpers/faction-helper';
import { getFactionWorkTypeFromEnum, getFactionWorkTypeFromString } from '/data-types/faction-data';
import { isTypeAugmentationStats } from '/data-types/type-guards';
import { IScriptRun } from '/data-types/dodger-data';

// Script logger
let logger : ScriptLogger;

// Script refresh period
const refreshPeriod = 8000;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
	["v", false],
	["verbose", false],
	["d", false],
	["debug", false],
	["wild", false],
	["sync", 75],
	["shock", 95],
	["gang", Infinity],
	["pill", Infinity],
	["stock", Infinity],
	["money", Infinity],
	["train", Infinity],
	["rep", Infinity]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

let wildSpending = false; // Allow purchasing upgrades with all available money

let syncThreshold = 75; // % to stop assigning the synchronise task
let shockThreshold = 95; // % to stop assinging the recovery task
let gangPriority = Infinity; // Priority of gang mode
let pillPriority = Infinity; // Priority of pill push mode
let stockPriority = Infinity; // Priority of stock mode
let moneyPriority = Infinity; // Priority of money mode
let trainPriority = Infinity; // Priority of stat train mode
let repPriority = Infinity; // Priority of rep gain mode

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Bitnode Multpliers */
let multipliers : BitNodeMultipliers;

/** Augmentation Information */
let augmentations : IAugmentInfo[] = [];

/** Owned player augmentations. */
let playerAugments : string[] = [];

/** Faction rep per faction joined by player */
let factionRep : { faction : string, rep : number }[] = [];

/** Sleeve data tracking object */
let sleeveData : ISleeveData;

/** Number of active Sleeves */
let numSleeves = 0;
/** Current information of active Sleeves */
let sleeveInfo : SleeveInformation[] = [];
/** Current stats of active Sleeves */
let sleeveStats : SleeveSkills[] = [];
/** Current task info of active Sleeves */
let sleeveTask : SleeveTask[] = [];
/** Purchasable augments for active Sleeves */
let sleeveAugments : AugmentPair[][] = [];
/** Mode priority order array */
let modePriority : SleeveMode[] = [];

/** Proportion of earnings to feed back into upgrading sleeves */
const fundsMultiplier = 0.9;

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
async function setupSleeveEnvironment(ns : NS) : Promise<void> {
	player = genPlayer(ns);
	multipliers = await readBitnodeMultiplierData(ns);
	augmentations = await readAugmentData(ns);

	numSleeves = 0;
	sleeveInfo = [];
	sleeveStats = [];
	sleeveTask = [];
	sleeveAugments = [];
	factionRep = [];

	sleeveData = {
		sleeves: [],
		currentFunds: 0,
		lastUpdate: performance.now(),
		refreshPeriod: refreshPeriod
	};

	modePriority = [
		SleeveMode.SyncHost,
		SleeveMode.ShockRecovery
	];

	const priorityAssignments = [
		{ mode: SleeveMode.GangFound, priority: gangPriority },
		{ mode: SleeveMode.PillPush, priority: pillPriority },
		{ mode: SleeveMode.StockAssist, priority: stockPriority },
		{ mode: SleeveMode.StatTrain, priority: trainPriority },
		{ mode: SleeveMode.MoneyMake, priority: moneyPriority },
		{ mode: SleeveMode.RepGrind, priority: repPriority }
	].sort((a, b) => (a.priority - b.priority) || (a.mode - b.mode));

	priorityAssignments.forEach((mode) => modePriority.push(mode.mode));
	logger.log(`Mode Priorities: ${modePriority.map(x => getSleeveModeFromEnum(x)).join(' > ')}`, { type: MessageType.info });

	numSleeves = await runDodgerScript<number>(ns, "/sleeves/dodger/getNumSleeves.js");
}

/*
 * ------------------------
 * > SLEEVE DATA UPDATE FUNCTION
 * ------------------------
*/

/**
 * Update data on all sleeves.
 * @param ns NS object parameter.
 */
async function updateSleeveData(ns : NS) : Promise<void> {
	await getBulkData(ns);

	for (let i = 0; i < numSleeves; i++) {
		const stats = sleeveStats[i];
		const info = sleeveInfo[i];
		const task = sleeveTask[i];

		if (sleeveData.sleeves.filter((sleeve) => sleeve.number === i).length === 0) {
			sleeveData.sleeves.push({
				number: i,
				stats: stats,
				info: info,
				task: { type: SleeveTaskType.None, details: null },
				lastScript: { script: "", args: [] }
			});
		}

		const sleeve = sleeveData.sleeves.find((s) => s.number === i) as ISleeve;

		sleeve.stats = stats;
		sleeve.info = info;

		switch (task.task) {
			case "Synchro":
				updateSleeveSynchroniseStats(sleeve);
				break;
			case "Recovery":
				updateSleeveRecoveryStats(sleeve);
				break;
			case "Gym":
				updateSleeveGymStats(sleeve, task);
				break;
			case "Class":
				updateSleeveStudyStats(sleeve, task);
				break;
			case "Crime":
				updateSleeveCrimeStats(sleeve, task, await getCrimeData(ns, task.crime));
				break;
			case "Faction":
				updateSleeveFactionWorkStats(sleeve, task, info);
				break;
			case "Company":
				updateSleeveCompanyWorkStats(sleeve, task, info);
				break;
		}
	}

	sleeveData.refreshPeriod = refreshPeriod;
	sleeveData.lastUpdate = performance.now();

	logger.log("Pushing data to port", { type: MessageType.debugHigh });
	purgePort(ns, PortNumber.SleeveData);
	await writeToPort<ISleeveData>(ns, PortNumber.SleeveData, sleeveData);
}

/*
 * ------------------------
 * > BULK DATA FUNCTIONs
 * ------------------------
*/

/**
 * [RAM DODGER]
 *
 * Get a bulk data object by calling the ram dodger script.
 * @param ns NS object parameter.
 */
async function getBulkData(ns : NS) : Promise<void> {
	const results = await runDodgerScriptBulk(ns, [
		{ script: "/sleeves/dodger/getInformation-bulk.js", args: [numSleeves] },
		{ script: "/sleeves/dodger/getSleeveStats-bulk.js", args: [numSleeves] },
		{ script: "/sleeves/dodger/getTask-bulk.js", args: [numSleeves] },
		{ script: "/sleeves/dodger/getSleevePurchasableAugs-bulk.js", args: [numSleeves] },
		{ script: "/singularity/dodger/getFactionRep-bulk.js", args: [JSON.stringify(player.factions.joinedFactions)] },
		{ script: "/singularity/dodger/getOwnedAugmentations.js", args: [] },
	]);

	sleeveInfo = results[0] as SleeveInformation[];
	sleeveStats = results[1] as SleeveSkills[];
	sleeveTask = results[2] as SleeveTask[];
	sleeveAugments = results[3] as AugmentPair[][];
	factionRep = results[4] as { faction : string, rep : number }[];
	playerAugments = results[5] as string[];
}

/**
 * Get a list of augmentations that can be purchased for a given sleeve.
 * @param sleeve Sleeve object.
 * @param augmentName Name of augment.
 * @returns List of augments that can be purchased for a given sleeve.
 */
function getPurchaseableAugmentsInfoForSleeve(sleeve : ISleeve, augmentName : string) : AugmentPair {
	const augmentData = sleeveAugments[sleeve.number];
	const augment = augmentData.find((aug) => aug.name === augmentName);
	if (!augment) {
		throw new Error(`Could not find augment data for sleeve ${sleeve.number}`);
	} else {
		return augment;
	}
}

/*
 * ------------------------
 * > SLEEVE TASK STAT UPDATE FUNCTIONS
 * ------------------------
*/

/**
 * Update sleeve data for performing a synchronise task.
 * @param sleeve Sleeves object.
 */
function updateSleeveSynchroniseStats(sleeve : ISleeve) : void {
	sleeve.task.type = SleeveTaskType.Synchronise;
	sleeve.task.details = null;
}

/**
 * Update sleeve data for performing a recovery task.
 * @param sleeve Sleeves object.
 */
function updateSleeveRecoveryStats(sleeve : ISleeve) : void {
	sleeve.task.type = SleeveTaskType.ShockRecovery;
	sleeve.task.details = null;
}

/**
 * Update sleeve data for performing a gym task.
 * @param sleeve Sleeves object.
 * @param task Sleeve task.
 */
function updateSleeveGymStats(sleeve : ISleeve, task : SleeveTask) : void {
	const skill = [
		{ skill: Skill.Agility, exp: sleeve.info.earningsForTask.workAgiExpGain },
		{ skill: Skill.Defense, exp: sleeve.info.earningsForTask.workDefExpGain },
		{ skill: Skill.Dexterity, exp: sleeve.info.earningsForTask.workDexExpGain },
		{ skill: Skill.Strength, exp: sleeve.info.earningsForTask.workStrExpGain }
	].sort((a, b) => b.exp - a.exp)[0];

	sleeve.task.type = SleeveTaskType.Train;
	const moneyLastTick = (sleeve.task.details === null
		? sleeve.info.earningsForTask.workMoneyGain
		: (sleeve.task.details as ISleeveTaskTrain).moneyGainLastTick
	);
	sleeveData.currentFunds += (sleeve.info.earningsForTask.workMoneyGain - moneyLastTick);
	sleeve.task.details = {
		location: task.location,
		skill: skill.skill,
		expGain: skill.exp,
		moneyGainLastTick: sleeve.info.earningsForTask.workMoneyGain
	};
}

/**
 * Update sleeve data for performing a class task.
 * @param sleeve Sleeves object.
 * @param task Sleeve task.
 */
function updateSleeveStudyStats(sleeve : ISleeve, task : SleeveTask) : void {
	const skill = [
		{ skill: Skill.Charisma, exp: sleeve.info.earningsForTask.workChaExpGain },
		{ skill: Skill.Hacking, exp: sleeve.info.earningsForTask.workHackExpGain }
	].sort((a, b) => b.exp - a.exp)[0];

	sleeve.task.type = SleeveTaskType.Train;
	const moneyLastTick = (sleeve.task.details === null
		? sleeve.info.earningsForTask.workMoneyGain
		: (sleeve.task.details as ISleeveTaskTrain).moneyGainLastTick
	);
	sleeveData.currentFunds += (sleeve.info.earningsForTask.workMoneyGain - moneyLastTick);
	sleeve.task.details = {
		location: task.location,
		skill: skill.skill,
		expGain: skill.exp,
		moneyGainLastTick: sleeve.info.earningsForTask.workMoneyGain
	};
}

/**
 * Update sleeve data for performing a crime task.
 * @param sleeve Sleeves object.
 * @param task Sleeve task.
 */
function updateSleeveCrimeStats(sleeve : ISleeve, task : SleeveTask, crime : CrimeStats | undefined) : void {
	if (!crime) return;
	const successChance = calculateCrimeChance(crime, sleeve.stats, sleeve.info.mult.crimeSuccess);

	sleeve.task.type = SleeveTaskType.Crime;
	const moneyLastTick = (sleeve.task.details === null
		? sleeve.info.earningsForTask.workMoneyGain
		: (sleeve.task.details as ISleeveTaskCrime).moneyGainLastTick
	);
	sleeveData.currentFunds += fundsMultiplier * (sleeve.info.earningsForTask.workMoneyGain - moneyLastTick);
	sleeve.task.details = {
		name: crime.name,
		successChance: successChance,
		moneyPerSecond: successChance * crime.money * sleeve.info.mult.crimeMoney / (crime.time / 1000),
		karmaPerSecond: successChance * crime.karma / (crime.time / 1000),
		killsPerSecond: successChance * crime.kills / (crime.time / 1000),
		moneyGainLastTick: sleeve.info.earningsForTask.workMoneyGain
	};
}

/**
 * Update sleeve data for performing a faction work task.
 * @param sleeve Sleeves object.
 * @param task Sleeve task.
 */
function updateSleeveFactionWorkStats(sleeve : ISleeve, task : SleeveTask, info : SleeveInformation) : void {
	sleeve.task.type = SleeveTaskType.FactionWork;
	sleeve.task.details = {
		faction: task.location,
		factionWork: getFactionWorkTypeFromString(task.factionWorkType),
		repGain: info.workRepGain
	};
}

/**
 * Update sleeve data for performing a company work task.
 * @param sleeve Sleeves object.
 * @param task Sleeve task.
 */
function updateSleeveCompanyWorkStats(sleeve : ISleeve, task : SleeveTask, info : SleeveInformation) : void {
	sleeve.task.type = SleeveTaskType.CompanyWork;
	const moneyLastTick = (sleeve.task.details === null
		? sleeve.info.earningsForTask.workMoneyGain
		: (sleeve.task.details as ISleeveTaskCompanyWork).moneyGainLastTick
	);
	sleeveData.currentFunds += fundsMultiplier * (sleeve.info.earningsForTask.workMoneyGain - moneyLastTick);
	sleeve.task.details = {
		company: task.location,
		repGain: info.workRepGain,
		moneyGainLastTick: sleeve.info.earningsForTask.workMoneyGain
	};
}

/*
 * ------------------------
 * > SLEEVE TASK COUNT FUNCTIONS
 * ------------------------
*/

/**
 * Test if a sleeve is doing a synchronise task.
 * @param sleeve Sleeve object.
 * @returns True if sleeve is doing a synchronise task; false otherwise.
 */
function isSleeveSynchronising(sleeve : ISleeve) : boolean {
	const doingSync = (sleeve.task.type === SleeveTaskType.Synchronise);
	if (doingSync) logger.log(`Sleeve ${sleeve.number} is already synchronising`, { type: MessageType.debugLow });
	return doingSync;
}

/**
 * Test if a sleeve is doing a recovery task.
 * @param sleeve Sleeve object.
 * @returns True if sleeve is doing a recovery task; false otherwise.
 */
function isSleeveRecovering(sleeve : ISleeve) : boolean {
	const doingRecovery = (sleeve.task.type === SleeveTaskType.ShockRecovery);
	if (doingRecovery) logger.log(`Sleeve ${sleeve.number} is already recovering`, { type: MessageType.debugLow });
	return doingRecovery;
}

/**
 * Test if a sleeve is comitting a certain crime.
 * @param sleeve Sleeve object.
 * @param crime Crime name.
 * @returns True if sleeve is doing comitting a certain crime; false otherwise.
 */
function isSleeveCommittingCrime(sleeve : ISleeve, crime : string) : boolean {
	if (sleeve.task.details === null) return false;
	const doingCrime = (sleeve.task.type === SleeveTaskType.Crime && (sleeve.task.details as ISleeveTaskCrime).name === crime);
	if (doingCrime) logger.log(`Sleeve ${sleeve.number} is already committing crime: ${crime}`, { type: MessageType.debugLow });
	return doingCrime;
}

/**
 * Test if a sleeve is working for a given faction.
 * @param sleeve Sleeve object.
 * @param faction Faction name.
 * @returns True if sleeve is working for a given faction; false otherwise.
 */
function isSleeveWorkingForFaction(sleeve : ISleeve, faction : string) : boolean {
	if (sleeve.task.details === null) return false;
	const doingWork = (sleeve.task.type === SleeveTaskType.FactionWork && (sleeve.task.details as ISleeveTaskFactionWork).faction === faction);
	if (doingWork) logger.log(`Sleeve ${sleeve.number} is already working for faction: ${faction}`, { type: MessageType.debugLow });
	return doingWork;
}

/**
 * Test if any sleeves are working for a specified faction.
 * @param faction Name of faction.
 * @returns True if no sleeves are working for the specified faction; false otherwise.
 */
 function zeroSleevesWorkingForFaction(faction : string) : boolean {
	return sleeveData.sleeves.every((sleeve) => (sleeve.task.details === null ? false : (sleeve.task.details as ISleeveTaskFactionWork).faction !== faction));
}

/**
 * Test if a sleeve is working for a given company.
 * @param sleeve Sleeve object.
 * @param company Company name.
 * @returns True if sleeve is working for a given company; false otherwise.
 */
function isSleeveWorkingForCompany(sleeve : ISleeve, company : string) : boolean {
	if (sleeve.task.details === null) return false;
	const doingWork = (sleeve.task.type === SleeveTaskType.CompanyWork && (sleeve.task.details as ISleeveTaskCompanyWork).company === company);
	if (doingWork) logger.log(`Sleeve ${sleeve.number} is working for ${company}`, { type: MessageType.debugLow });
	return doingWork;
}

/**
 * Test if no sleeves are working for a specified company.
 * @param company Company name.
 * @returns True if no sleeves are working for the specified company; false otherwise.
 */
function zeroSleevesWorkingForCompany(company : string) : boolean {
	return sleeveData.sleeves.every((sleeve) => (sleeve.task.details === null ? false : (sleeve.task.details as ISleeveTaskCompanyWork).company !== company));
}

/**
 * Test if a sleeve is doing a training task for a given skill.
 * @param sleeve Sleeve object.
 * @param skill Skill.
 * @returns True if sleeve is doing a training task for a given skill; false otherwise.
 */
function isSleeveIsTrainingSkill(sleeve : ISleeve, skill : Skill) : boolean {
	if (sleeve.task.details === null) return false;
	return (sleeve.task.details as ISleeveTaskTrain).skill === skill;
}

/**
 * Get the number of sleeves currently training a given skill.
 * @param skill Skill.
 * @returns Number of sleeves currently training a given skill.
 */
function getSleevesTrainingSkill(skill : Skill) : number {
	return sleeveData.sleeves.filter((sleeve) => (sleeve.task.details === null ? false : (sleeve.task.details as ISleeveTaskTrain).skill === skill)).length;
}

/*
 * ------------------------
 * > SLEEVE AUGMENTATION PURCHASE FUNCTIONS
 * ------------------------
*/

/**
 * Try and purchase augments for sleeves.
 * @param ns NS object parameter.
 */
async function tryBuySleeveAugments(ns : NS) : Promise<void> {
	const scripts = generatePurchaseAugmentScripts();
	const results = await runDodgerScriptBulk(ns, scripts);
	processPurchaseAugmentResults(scripts, results);
}

/**
 * Generate an array of scripts that will purchase augments for sleeves.
 * @returns Array of scripts to run to purchase augments for sleeves.
 */
function generatePurchaseAugmentScripts() : IScriptRun[] {
	const scripts : IScriptRun[] = [];

	let cumulativeCost = 0;

	sleeveData.sleeves.filter((sleeve) => canPurchaseAugmentsForSleeve(sleeve)).forEach((sleeve) => {
		const augmentData = sleeveAugments[sleeve.number].filter((augment) => {
			const data = augmentations.find(x => x.name === augment.name);
			return isTypeAugmentationStats(data) && isDesireableAug(data.stats);
		}).sort((a, b) => a.cost - b.cost);

		for (const augment of augmentData) {
			if (canMakePurchase(cumulativeCost + augment.cost)) {
				scripts.push({ script: "/sleeves/dodger/purchaseSleeveAug.js", args: [sleeve.number, augment.name] });
				cumulativeCost += augment.cost;
			} else {
				break;
			}
		}
	});

	return scripts;
}

/**
 * Test if augments can be purchased for a given sleeve.
 * @param sleeve Sleeve object.
 * @returns True if augments can be purchased for the sleeve; false otherwise.
 */
function canPurchaseAugmentsForSleeve(sleeve : ISleeve) : boolean {
	return sleeve.stats.shock <= 0;
}

/**
 * Test if an augment's stats increase any reputation, xp or level multipliers.
 * @param stats AugmentationStats object.
 * @returns True if the augment stats increase reputation gain, xp or level multipliers.
 */
function isDesireableAug(stats : AugmentationStats) : boolean {
	return !(
		!stats.agility_exp_mult && !stats.agility_mult &&
		!stats.charisma_exp_mult && !stats.charisma_mult &&
		!stats.defense_exp_mult && !stats.defense_mult &&
		!stats.dexterity_exp_mult && !stats.dexterity_mult &&
		!stats.hacking_exp_mult && !stats.hacking_mult &&
		!stats.strength_exp_mult && !stats.strength_mult &&
		!stats.company_rep_mult && !stats.faction_rep_mult
	);
}

/**
 * Test if a given cost is affordable
 * @param cost Total cost.
 * @returns True if the cost is affordable; false otherwise.
 */
function canMakePurchase(cost : number) : boolean {
	return (
		player.money >= cost &&
		(
			wildSpending
				? (player.money - cost >= 100e9)
				: (sleeveData.currentFunds >= cost)
		)
	);
}

/**
 * Process the results of the run scripts for assigning tasks.
 * @param scripts Array of scripts that were run.
 * @param results Results of said run scripts.
 */
 function processPurchaseAugmentResults(scripts : IScriptRun[], results : unknown[]) : void {
	for (let i = 0; i < results.length; i++) {
		const sleeve = sleeveData.sleeves[scripts[i].args[0] as number];
		const augment = getPurchaseableAugmentsInfoForSleeve(sleeve, scripts[i].args[1] as string);
		if (results[i]) {
			logger.log(`Purchased aug: ${augment.name} for Sleeve ${sleeve.number}`, { type: MessageType.info, sendToast: true, logToTerminal: true });
			sleeveData.currentFunds -= augment.cost;
		} else {
			logger.log(`Failed to purchase aug: ${augment.name} for Sleeve ${sleeve.number}`, { type: MessageType.fail, sendToast: true, logToTerminal: true });
		}
	}
}

/*
 * ------------------------
 * > SLEEVE MASTER TASK ASSIGNER FUNCTION
 * ------------------------
*/

/**
 * Try assign tasks to all sleeves based on selected mode priorities.
 * @param ns NS object parameter.
 */
async function tryAssignSleeveTasks(ns : NS) : Promise<void> {
	const scripts = await generateAssignTaskScripts(ns);
	const results = await runDodgerScriptBulk(ns, scripts);
	processAssignTaskResults(scripts, results)
}

/**
 * Generate an array of scripts that will assign tasks to sleeves.
 * @param ns NS object parameter.
 * @returns Array of scripts to run to assign tasks to sleeves.
 */
async function generateAssignTaskScripts(ns : NS) : Promise<IScriptRun[]> {
	logger.log("Generating task scripts", { type: MessageType.debugLow });
	const scripts : IScriptRun[] = [];

	for (const sleeve of sleeveData.sleeves) {
		logger.log(`Trying to assign task for sleeve ${sleeve.number}`, { type: MessageType.debugLow });
		for (const mode of modePriority) {
			const assignedTask = await tryAssignSleeveTaskInMode(ns, sleeve, mode);
			if (assignedTask.assigned) {
				if (assignedTask.script) {
					scripts.push(assignedTask.script);
				}
				break;
			}
		}
	}

	return scripts;
}

/*
 * ------------------------
 * > SLEEVE MODE ASSIGNER FUNCTION
 * ------------------------
*/

/**
 * Try get a task to assign a given sleeve based on the provided task mode.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @param mode Mode to set task in.
 * @returns True if a task was selected; false otherwise.
 */
async function tryAssignSleeveTaskInMode(ns : NS, sleeve : ISleeve, mode : SleeveMode) : Promise<ISleeveTaskAssignment> {
	switch (mode) {
		case SleeveMode.SyncHost: 		return tryAssignModeSync(sleeve);
		case SleeveMode.ShockRecovery: 	return tryAssignModeRecovery(sleeve);
		case SleeveMode.GangFound: 		return tryAssignModeGangFound(ns, sleeve);
		case SleeveMode.StockAssist: 	return tryAssignModeStockAssist(ns, sleeve);
		case SleeveMode.MoneyMake: 		return tryAssignModeMoneyMake(ns, sleeve);
		case SleeveMode.StatTrain: 		return tryAssignModeStatTrain(ns, sleeve);
		case SleeveMode.RepGrind: 		return tryAssignModeRepGrind(ns, sleeve);
		case SleeveMode.PillPush: 		return tryAssignModePillPush(ns, sleeve);
		default: 						throw new Error(`Unknown Sleeve Task Mode: ${mode}`);
	}
}

/*
 * ------------------------
 * > SLEEVE SYNC MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a synchronise mode task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
function tryAssignModeSync(sleeve : ISleeve) : ISleeveTaskAssignment {
	logger.log("Trying to assign task in 'Sync' mode", { type: MessageType.debugHigh });
	if (canAssignModeSync(sleeve)) {
		return doAssignModeSync(sleeve);
	} else {
		return { assigned: false };
	}
}

/**
 * Test if a synchronise task can be assigned to a given sleeve.
 * @param sleeve Sleeve object.
 * @returns True if a synchronise task can be assigned; false otherwise.
 */
function canAssignModeSync(sleeve : ISleeve) : boolean {
	if (sleeve.stats.sync >= syncThreshold) {
		logger.log(`Sleeve ${sleeve.number} is over the sync threshold - will not assign synchronise task`, { type: MessageType.debugHigh });
		return false;
	}

	return true;
}

/**
 * Assign a syncronise mode task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
function doAssignModeSync(sleeve : ISleeve) : ISleeveTaskAssignment {
	if (isSleeveSynchronising(sleeve)) {
		return { assigned: true };
	} else {
		return generateAssignTaskSynchroniseScript(sleeve)
	}
}

/*
 * ------------------------
 * > SLEEVE SHOCK RECOVERY MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a recovery mode task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeRecovery(sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Recovery' mode", { type: MessageType.debugHigh });
	if (canAssignModeRecovery(sleeve)) {
		return doAssignModeRecovery(sleeve);
	} else {
		return { assigned: false };
	}
}

/**
 * Test if a recovery task can be assigned to a given sleeve.
 * @param sleeve Sleeve object.
 * @returns True if a recovery task can be assigned; false otherwise.
 */
function canAssignModeRecovery(sleeve : ISleeve) : boolean {
	if (sleeve.stats.shock <= shockThreshold) {
		logger.log(`Sleeve ${sleeve.number} is under the shock threshold - will not assign recovery`, { type: MessageType.debugHigh });
		return false;
	}

	return true;
}

/**
 * Assign a recovery mode task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
 function doAssignModeRecovery(sleeve : ISleeve) : ISleeveTaskAssignment {
	if (isSleeveRecovering(sleeve)) {
		return { assigned: true };
	} else {
		return generateAssignTaskRecoveryScript(sleeve)
	}
}

/*
 * ------------------------
 * > SLEEVE GANG FOUND MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a gang mode task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeGangFound(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Gang Found' mode", { type: MessageType.debugHigh });
	if (canAssignModeGangFound()) {
		return doAssignModeGangFound(ns, sleeve);
	} else {
		return { assigned: false };
	}
}

/**
 * Test if a gang founding task can be assigned to a given sleeve.
 * @returns True if a recovery task can be assigned; false otherwise.
 */
function canAssignModeGangFound() : boolean {
	if (player.karma <= -54000) {
		logger.log(`Player has sufficient karma to join a gang - will not assign gang founding`, { type: MessageType.debugLow });
		return false;
	}

	return true;
}

/**
 * Assign a gang found task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function doAssignModeGangFound(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	if (sleeveRequiresTraningForGangFarm(sleeve)) {
		return doTrainingForGangFound(ns, sleeve);
	} else {
		const crime = await getBestCrime(ns, CrimeType.Karma, sleeve.stats);
		if (isSleeveCommittingCrime(sleeve, crime.name)) {
			return { assigned: true };
		} else {
			return generateAssignTaskCrimeScript(sleeve, crime);
		}
	}
}

/**
 * Test if a given sleeve has sufficient stats to engage in Homicide activities.
 * @param sleeve Sleeve object.
 * @returns True if the sleeve has sufficient stats; false otherwise.
 */
function sleeveRequiresTraningForGangFarm(sleeve : ISleeve) : boolean {
	const trainingRequired = (
		sleeve.stats.agility   < 13 ||
		sleeve.stats.defense   < 34 ||
		sleeve.stats.dexterity < 13 ||
		sleeve.stats.strength  < 34
	);
	if (trainingRequired) logger.log(`Sleeve ${sleeve.number} has insufficient stats to perform a gang founder task`, { type: MessageType.debugHigh });
	return trainingRequired;
}

/**
 * Try to set the sleeve to train for homicide.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns True if a training task was assigned; false otherwise.
 */
async function doTrainingForGangFound(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	if (sleeve.stats.agility   < 13) return generateAssignTaskTrainSkillScript(sleeve, Skill.Agility);
	if (sleeve.stats.defense   < 34) return generateAssignTaskTrainSkillScript(sleeve, Skill.Defense);
	if (sleeve.stats.dexterity < 13) return generateAssignTaskTrainSkillScript(sleeve, Skill.Dexterity);
	if (sleeve.stats.strength  < 34) return generateAssignTaskTrainSkillScript(sleeve, Skill.Strength);
	logger.log(`Something went wrong - we shouldn't be here`, { type: MessageType.error });
	return { assigned: false };
}

/*
 * ------------------------
 * > SLEEVE STOCK ASSIST MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a stock assist mode task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeStockAssist(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Stock Assist' mode", { type: MessageType.debugHigh });
	const companiesToWorkFor = await getCompaniesToWorkFor(ns);

	if (companiesToWorkFor.length > 0) {
		return doAssignModeStockAssist(ns, sleeve, companiesToWorkFor);
	} else {
		logger.log(`No companies to work for to assist stock growth - will not assign stock assist`, { type: MessageType.debugHigh });
	}

	return { assigned: false };
}

/**
 * Get a list of companies that sleeves can work for to aid in stock growth.
 * @param ns NS object parameter.
 * @returns A list of companies sleeves can work for.
 */
async function getCompaniesToWorkFor(ns : NS) : Promise<string[]> {
	const data = peekPort<IStockData>(ns, PortNumber.StockData);
	if (data) {
		const stocksWithLongHoldings = data.stocks.filter(x => x.longPos.shares > 0).sort((a, b) => (b.absReturn - a.absReturn));
		const companyNamesForStocks = stocksWithLongHoldings.map((stock) => (symToCompany.find(x => x.sym === stock.sym)?.company || "X")).filter(x => x !== "X");
		const companiesPlayerWorksFor = companyNamesForStocks.filter(x => player.jobs[x]);
		return companiesPlayerWorksFor;
	} else {
		return [];
	}
}

/**
 * Assign a stock assist task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function doAssignModeStockAssist(ns : NS, sleeve : ISleeve, companies : string[]) : Promise<ISleeveTaskAssignment> {
	for (const company of companies) {
		if (isSleeveWorkingForCompany(sleeve, company)) {
			return { assigned: true };
		} else if (zeroSleevesWorkingForCompany(company)) {
			return generateAssignTaskCompanyWorkScript(sleeve, company);
		}
	}

	return { assigned: false };
}

/*
 * ------------------------
 * > SLEEVE MONEY MAKE MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a money making mode task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeMoneyMake(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Money Make' mode", { type: MessageType.debugHigh });
	const crime = await getBestCrime(ns, CrimeType.Money, sleeve.stats, sleeve.info.mult.crimeSuccess, 0, 120);
	if (isSleeveCommittingCrime(sleeve, crime.name)) {
		return { assigned: true };
	} else {
		return generateAssignTaskCrimeScript(sleeve, crime);
	}
}

/*
 * ------------------------
 * > SLEEVE STAT TRAIN MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a stat training mode task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeStatTrain(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Stat Train' mode", { type: MessageType.debugHigh });
	const skillGoals = [
		{ skill: Skill.Agility, current: sleeve.stats.agility},
		{ skill: Skill.Charisma, current: sleeve.stats.charisma},
		{ skill: Skill.Defense, current: sleeve.stats.defense},
		{ skill: Skill.Dexterity, current: sleeve.stats.dexterity},
		{ skill: Skill.Hacking, current: sleeve.stats.hacking},
		{ skill: Skill.Strength, current: sleeve.stats.strength},
	];

	for (const goal of skillGoals) {
		if (goal.current < getSleeveSensibleSkillApproximation(sleeve, goal.skill)) {
			return generateAssignTaskTrainSkillScript(sleeve, goal.skill);
		}
	}

	return { assigned: false };
}

/*
 * ------------------------
 * > SLEEVE REPUTATION GRIND MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a reputation grind mode task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryAssignModeRepGrind(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Rep Grind' mode", { type: MessageType.debugHigh });
	const eligibileFactions = await getFactionsToWorkFor(ns);

	if (eligibileFactions.length > 0) {
		return doAssignModeRepGrind(sleeve, eligibileFactions);
	} else {
		logger.log(`No factions to work for to gain reputation - will not assign rep grind`, { type: MessageType.debugHigh });
	}

	return { assigned: false };
}

/**
 * Get a list of factions that sleeves can work for to gain reputation.
 * @returns A list of factions sleeves can work for.
 */
async function getFactionsToWorkFor(ns : NS) : Promise<string[]> {
	augmentations = await readAugmentData(ns);
	const factions = player.factions.joinedFactions.filter((faction) => {
		const factionData = factionRep.find(x => x.faction === faction);
		if (!factionData) return false;

		const maxRep = Math.max(...augmentations.filter((aug) => aug.factions.includes(faction)).map((aug) => aug.repReq));
		return factionData.rep < maxRep;
	});

	return factions;
}

/**
 * Assign a reputatation grind task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function doAssignModeRepGrind(sleeve : ISleeve, factions : string[]) : Promise<ISleeveTaskAssignment> {
	for (const faction of factions) {
		if (isSleeveWorkingForFaction(sleeve, faction)) {
			return { assigned: true };
		}
		if (zeroSleevesWorkingForFaction(faction)) {
			return generateAssignTaskFactionWorkScript(sleeve, faction);
		}
	}

	return { assigned: false };
}

/*
 * ------------------------
 * > SLEEVE PILL PUSHER MODE FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign a pill pusher task.
 * @param ns NS object parameter.
 * @param sleeve Sleeve object.
 * @returns True if a task was assigned; false otherwise.
 */
async function tryAssignModePillPush(ns : NS, sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	logger.log("Trying to assign task in 'Pill Push' mode", { type: MessageType.debugHigh });
	if (playerInFactionDaedelus()) {
		if (playerHasRedPillAugment()) {
			return generateAssignTaskTrainSkillScript(sleeve, Skill.Hacking);
		} else {
			return tryPushForRedPill(sleeve);
		}
	} else if (canTrainForDaedalus(ns)) {
		return generateAssignTaskTrainSkillScript(sleeve, Skill.Hacking);
	} else {
		return { assigned: false };
	}
}

/**
 * Test if the player is in the Daedalus faction.
 * @returns True if the player is in the Daedalus faction; false otherwise.
 */
function playerInFactionDaedelus() : boolean {
	return player.factions.joinedFactions.includes("Daedalus");
}

/**
 * Test if the player has the Red Pill augment installed.
 * @returns True if the player has the Rep Pill augment; false otherwise.
 */
function playerHasRedPillAugment() : boolean {
	return playerAugments.includes("The Red Pill");
}

/**
 * Try assign a pill pusher task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
async function tryPushForRedPill(sleeve : ISleeve) : Promise<ISleeveTaskAssignment> {
	if (isSleeveWorkingForFaction(sleeve, "Daedalus") && getSleeveWithHighestMultipliers() === sleeve.number) {
		return { assigned: true };
	} else if (zeroSleevesWorkingForFaction("Daedalus") && getSleeveWithHighestMultipliers() === sleeve.number) {
		return generateAssignTaskFactionWorkScript(sleeve, "Daedalus")
	} else {
		const multCombos = [
			{ skill: Skill.Hacking, mult: sleeve.info.mult.hackingExp },
			{ skill: Skill.Strength, mult: sleeve.info.mult.strengthExp },
			{ skill: Skill.Defense, mult: sleeve.info.mult.defenseExp },
			{ skill: Skill.Dexterity, mult: sleeve.info.mult.dexterityExp },
			{ skill: Skill.Agility, mult: sleeve.info.mult.agilityExp },
			{ skill: Skill.Charisma, mult: sleeve.info.mult.charismaExp }
		].sort((a, b) => b.mult - a.mult);

		let maximumPerSkill = 1;

		while (maximumPerSkill < 3) {
			for (const combo of multCombos) {
				if (getSleevesTrainingSkill(combo.skill) < maximumPerSkill ||
					(getSleevesTrainingSkill(combo.skill) === maximumPerSkill && isSleeveIsTrainingSkill(sleeve, combo.skill))){
					return generateAssignTaskTrainSkillScript(sleeve, combo.skill);
				}
			}

			maximumPerSkill++
		}

		// We shouldn't get here
		return { assigned: false };
	}
}

/**
 * Get the number of the Sleeve with the highest multiplier total.
 * @returns The sleeve number which has the highest total multipliers.
 */
function getSleeveWithHighestMultipliers() : number {
	return sleeveData.sleeves.sort((a, b) =>
		(b.info.mult.factionRep + b.info.mult.agility + b.info.mult.defense + b.info.mult.dexterity + b.info.mult.hacking + b.info.mult.strength + b.info.mult.charisma) -
		(a.info.mult.factionRep + a.info.mult.agility + a.info.mult.defense + a.info.mult.dexterity + a.info.mult.hacking + a.info.mult.strength + a.info.mult.charisma)
	)[0].number
}

/**
 * Test if training should be undergone to earn entry to the Daedalus faction.
 * @param ns NS object parameter.
 * @returns True if sleeves should train for Daedalus; false otherwise.
 */
function canTrainForDaedalus(ns : NS) : boolean {
	const sensibleHacking = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Hacking);
	return (
		playerAugments.length > multipliers.DaedalusAugsRequirement &&
		sensibleHacking >= 2500
	);
}

/*
 * ------------------------
 * > SLEEVE TASK SCRIPT GENERATION FUNCTIONS
 * ------------------------
*/

/**
 * Generate a script to assign a sleeve to do a synchronise task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
 function generateAssignTaskSynchroniseScript(sleeve : ISleeve) : ISleeveTaskAssignment {
	sleeve.task.details = null;

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToSynchronize.js", args: [sleeve.number] }
	};
}

/**
 * Generate a script to assign a sleeve to do a recovery task.
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
function generateAssignTaskRecoveryScript(sleeve : ISleeve) : ISleeveTaskAssignment {
	sleeve.task.details = null;

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToShockRecovery.js", args: [sleeve.number] }
	};
}

/**
 * Generate a script to assign a sleeve to do a crime task
 * @param sleeve Sleeve object.
 * @returns Script object to run to assign task.
 */
function generateAssignTaskCrimeScript(sleeve : ISleeve, crime : CrimeStats) : ISleeveTaskAssignment {
	const successChance = calculateCrimeChance(crime, sleeve.stats, sleeve.info.mult.crimeSuccess);
	sleeve.task.details = {
		name: crime.name,
		successChance: successChance,
		moneyPerSecond: successChance * crime.money * sleeve.info.mult.crimeMoney * multipliers.CrimeMoney / (crime.time / 1000),
		karmaPerSecond: successChance * crime.karma / (crime.time / 1000),
		killsPerSecond: successChance * crime.kills / (crime.time / 1000),
		moneyGainLastTick: 0
	};

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToCommitCrime.js", args: [sleeve.number, crime.name] }
	};
}

/**
 * Generate a script to assign a sleeve to do a train skill task.
 * @param sleeve Sleeve object.
 * @param skill Skill to train.
 * @returns Script object to run to assign task.
 */
async function generateAssignTaskTrainSkillScript(sleeve : ISleeve, skill : Skill) : Promise<ISleeveTaskAssignment> {
	if (isSleeveIsTrainingSkill(sleeve, skill)) {
		logger.log(`Sleeve ${sleeve.number} is already training ${getSkillFromEnum(skill)} at ${(sleeve.task.details as ISleeveTaskTrain).location}`, { type: MessageType.debugLow });
		return { assigned: true };
	} else {
		switch (skill) {
			case Skill.Agility:
			case Skill.Defense:
			case Skill.Dexterity:
			case Skill.Strength:
				return generateAssignTaskGymScript(sleeve, skill);

			case Skill.Charisma:
			case Skill.Hacking:
				return generateAssignTaskStudyScript(sleeve, skill);
		}
	}
}

/**
 * Generate a script to assign a sleeve to do a gym task.
 * @param sleeve Sleeve object.
 * @param skill Skill to train.
 * @returns Script object to run to assign task.
 */
async function generateAssignTaskGymScript(sleeve : ISleeve, skill : Skill) : Promise<ISleeveTaskAssignment> {
	sleeve.task.details = {
		location: "Powerhouse Gym",
		skill: skill,
		expGain: 0,
		moneyGainLastTick: 0
	};

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToGymWorkout.js", args: [sleeve.number, "Powerhouse Gym", getSkillFromEnum(skill)] }
	};
}

/**
 * Generate a script to assign a sleeve to do a class task
 * @param sleeve Sleeve object.
 * @param skill Skill to train.
 * @returns Script object to run to assign task.
 */
async function generateAssignTaskStudyScript(sleeve : ISleeve, skill : Skill) : Promise<ISleeveTaskAssignment> {
	sleeve.task.details = {
		location: "Rothman University",
		skill: skill,
		expGain: 0,
		moneyGainLastTick: 0
	};

	const course = (skill === Skill.Charisma ? "Leadership" : "Algorithms");

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToUniversityCourse.js", args: [sleeve.number, "Rothman University", course] }
	}
}


/**
 * Generate a script to assign a sleeve to do a faction work task.
 * @param sleeve Sleeve object.
 * @param faction Faction name.
 * @returns Script object to run to assign task.
 */
async function generateAssignTaskFactionWorkScript(sleeve : ISleeve, faction : string) : Promise<ISleeveTaskAssignment> {
	const workType = getBestWorkType(sleeve.stats, faction);
	sleeve.task.details = {
		faction: faction,
		factionWork: workType,
		repGain: 0,
		moneyGainLastTick: 0
	};

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToFactionWork.js", args: [sleeve.number, faction, getFactionWorkTypeFromEnum(workType)] }
	};
}

/**
 * Generate a script to assign a sleeve to do a company work task.
 * @param sleeve Sleeve object.
 * @param company Company name.
 * @returns Script object to run to assign task.
 */
async function generateAssignTaskCompanyWorkScript(sleeve : ISleeve, company : string) : Promise<ISleeveTaskAssignment> {
	sleeve.task.details = {
		company: company,
		repGain: 0,
		moneyGainLastTick: 0
	};

	return {
		assigned: true,
		script: { script: "/sleeves/dodger/setToCompanyWork.js", args: [sleeve.number, company] }
	};
}

/*
 * ------------------------
 * > SLEEVE TASK RESULT PROCESSING FUNCTIONS
 * ------------------------
*/

/**
 * Process the results of the run scripts for assigning tasks.
 * @param scripts Array of scripts that were run.
 * @param results Results of said run scripts.
 */
 function processAssignTaskResults(scripts : IScriptRun[], results : unknown[]) : void {
	for (let i = 0; i < results.length; i++) {
		switch (scripts[i].script) {
			case "/sleeves/dodger/setToSynchronize.js":
				processAssignTaskSynchronise(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToShockRecovery.js":
				processAssignTaskRecovery(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToCommitCrime.js":
				processAssignTaskCrime(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToGymWorkout.js":
				processAssignTaskGym(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToUniversityCourse.js":
				processAssignTaskStudy(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToFactionWork.js":
				processAssignTaskFactionWork(scripts[i], results[i]);
				break;

			case "/sleeves/dodger/setToCompanyWork.js":
				processAssignTaskCompanyWork(scripts[i], results[i]);
				break;
		}
	}
}

/**
 * Process the result from running the script to assign a sleeve recovery task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
 function processAssignTaskSynchronise(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	if (result as boolean) {
		logger.log(`Setting Sleeve ${sleeve} to synchronise with host`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to synchronise with host`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve recovery task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
function processAssignTaskRecovery(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	if (result as boolean) {
		logger.log(`Setting Sleeve ${sleeve} to recover from shock`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to recover from shock`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve recovery task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
function processAssignTaskCrime(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	const crime = script.args[1] as string;
	if (result) {
		logger.log(`Setting Sleeve ${sleeve} to commit crime: ${crime}`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to commit crime: ${crime}`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve company work task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
 function processAssignTaskGym(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	const location = script.args[1] as string;
	const skill = script.args[2] as string;
	if (result) {
		logger.log(`Setting Sleeve ${sleeve} to train ${skill} at ${location}`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to train ${skill} at ${location}`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve company work task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
 function processAssignTaskStudy(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	const location = script.args[1] as string;
	const skill = script.args[2] as string;
	if (result) {
		logger.log(`Setting Sleeve ${sleeve} to train ${skill} at ${location}`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to train ${skill} at ${location}`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve company work task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
function processAssignTaskFactionWork(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	const faction = script.args[1] as string;
	const workType = script.args[2] as string;
	if (result as boolean) {
		logger.log(`Setting Sleeve ${sleeve} to work for ${faction} doing ${workType} work`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to work for ${faction} doing ${workType} work`, { type: MessageType.fail });
	}
}

/**
 * Process the result from running the script to assign a sleeve company work task.
 * @param script Script run to assign task.
 * @param result Result of said run script.
 */
function processAssignTaskCompanyWork(script : IScriptRun, result : unknown) : void {
	const sleeve = script.args[0] as number;
	const company = script.args[1] as string;
	if (result as boolean) {
		logger.log(`Setting Sleeve ${sleeve} to work for ${company}`, { type: MessageType.info });
		sleeveData.sleeves[sleeve].lastScript = script;
	} else {
		logger.log(`Failed to set Sleeve ${sleeve} to work for ${company}`, { type: MessageType.fail });
	}
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "SLEEVE-DAE", "Sleeve Management Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];

	wildSpending = flags["wild"];

	syncThreshold = flags["sync"];
	shockThreshold = flags["shock"];

	gangPriority = flags["gang"];
	pillPriority = flags["pill"];
	stockPriority = flags["stock"];
	moneyPriority = flags["money"];
	trainPriority = flags["train"];
	repPriority = flags["rep"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`Sleeve Management Daemon Helper:\n`+
			`Description:\n` +
			`   Sleeve Deamon, courtesy of AdvancedTechno-2022. Have your sleeves manage themselves! Good at forming gangs.\n` +
			`   Mode priorities are in descending order (Priority 1 > 2 > ... > 99).\n` +
			`Usage:\n` +
			`   run /sleeves/sleeve-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help      : boolean |>> Prints this.\n` +
			`   -v or --verbose   : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug     : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   	  --wild      : boolean |>> Enables spending money on upgrades as soon as they can be afforded.\n` +
			`         --sync      : number  |>> Sets the % threshold to stop performing synchronise tasks.\n` +
			`         --shock     : number  |>> Sets the % threshold to stop performing recovery tasks.\n` +
			`         --gang      : number  |>> Sets the priority of mode: gang forming.\n` +
			`         --pill      : number  |>> Sets the priority of mode: pill pusher.\n` +
			`         --stock     : number  |>> Sets the priority of mode: stock assist.\n` +
			`         --money     : number  |>> Sets the priority of mode: money make.\n` +
			`         --rep       : number  |>> Sets the priority of mode: rep grind.\n` +
			`         --train     : number  |>> Sets the priority of mode: stat train.`
		);

		return;
	}

	await setupSleeveEnvironment(ns);

	logger.initialisedMessage(true, false);

	while (true) {
		await updateSleeveData(ns);
		await tryBuySleeveAugments(ns);
		await tryAssignSleeveTasks(ns);
		await ns.asleep(refreshPeriod);
	}
}
