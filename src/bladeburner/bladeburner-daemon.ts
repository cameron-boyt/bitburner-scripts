import { BladeburnerCurAction, NS } from '@ns'
import { IBladeburnerData, IBladeburnerActionInfo, IBladeburnerAction, IBladeburnerSkillUpgrade, IBladeburnerActionAutolevel, IBladeburnerActionCountRemaining, IBladeburnerActionCurrentLevel, IBladeburnerActionEstimatedSuccessChance, IBladeburnerActionMaxLevel, IBladeburnerActionRepGain, IBladeburnerActionTime, IBladeburnerCityChaos, IBladeburnerBlackOpRank, IBladeburnerSkills, IBladeburnerSkillCost, BladeburnerActionType, getBladeburnerActionTypeFromEnum, IBladeburnerCityPopulation } from '/data-types/bladeburner-data';
import { runDodgerScript, runDodgerScriptBulk } from '/helpers/dodger-helper';
import { CITIES } from '/libraries/constants';
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { PortNumber, purgePort, writeToPort } from '/libraries/port-handler';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';

// Script logger
let logger : ScriptLogger;

// Script refresh period
const refreshPeriod = 1000;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Bladeburner data tracking object */
let bladeburnerData : IBladeburnerData;

/** Names of general tasks. */
let generalActionNames : string[] = [];
/** Names of contract tasks. */
let contractNames : string[] = [];
/** Names of operation tasks. */
let operationNames : string[] = [];
/** Names of blackop tasks. */
let blackOpNames : string[] = [];

/** Rank required for each blackop task. */
let blackOpRank : IBladeburnerBlackOpRank[] = [];

/** Names of all Bladeburner tasks. */
const actionNames : IBladeburnerAction[] = [];

/** Bladeburner actions autolevel state. */
let actionsAutolevel : IBladeburnerActionAutolevel[] = [];
/** Bladeburner actions count remaining. */
let actionsCountRemaining : IBladeburnerActionCountRemaining[] = [];
/** Bladeburner actions current level. */
let actionsCurrentLevel : IBladeburnerActionCurrentLevel[] = [];
/** Bladeburner actions success chances. */
let actionsEstimatedSuccessChance : IBladeburnerActionEstimatedSuccessChance[] = [];
/** Bladeburner actions max level. */
let actionsMaxLevel : IBladeburnerActionMaxLevel[] = [];
/** Bladeburner actions rank gain. */
let actionsRepGain : IBladeburnerActionRepGain[] = [];
/** Bladeburner actions time. */
let actionsTime : IBladeburnerActionTime[] = [];

/** Highest Bladeburner aciton level. */
let highestLevel = 1;

/** Population per city. */
let cityPopulation : IBladeburnerCityPopulation[] = [];
/** Chaos per city. */
let cityChaos : IBladeburnerCityChaos[] = [];

/** Names of Bladeburner skills. */
let skillNames : string[] = [];
/** Bladeburner skill purchase costs. */
let skillCosts : IBladeburnerSkillCost[] = [];

/** Bladeburner skill limits and cost multipliers. */
const skillLimits : IBladeburnerSkillUpgrade[] = [
	{ name: "Blade's Intuition", limit: Infinity, costMult: 2 },
	{ name: "Cloak", limit: 25, costMult: 1 },
	{ name: "Short-Circuit", limit: 25, costMult: 1 },
	{ name: "Digital Observer", limit: Infinity, costMult: 2 },
	{ name: "Tracer", limit: 5, costMult: 1 },
	{ name: "Overclock", limit: 90, costMult: 1 },
	{ name: "Reaper", limit: Infinity, costMult: 2 },
	{ name: "Evasive System", limit: Infinity, costMult: 2 },
	{ name: "Datamancer", limit: 10, costMult: 15 },
	{ name: "Cyber's Edge", limit: 10, costMult: 150 },
	{ name: "Hands of Midas", limit: 10, costMult: 150 },
	{ name: "Hyperdrive", limit: Infinity, costMult: 255 }
];

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
async function setupEnvironment(ns : NS) : Promise<void> {
    player = genPlayer(ns);

	if (hasBladeburnerStats()) {
		const result = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/joinBladeburnerDivision.js");
		if (result) {
			logger.log("Successfully joined, or are already a member of, the Bladeburner Division", { type: MessageType.success });
		} else {
			logger.log("Failed to join the Bladeburner Division", { type: MessageType.fail });
		}
	} else {
		logger.log("Unable to join Bladeburners Division; please ensure you meet the combat requirements", {
			type: MessageType.fail,
			sendToast: true,
			logToTerminal: true
		});
		ns.exit();
		await ns.asleep(2000);
	}

	bladeburnerData = {
		rank: 0,
		stamina: [0, 0],
		currentCity: "",
		currentAction: "",
		skillPoints: 0,
		skills: [],
		lastUpdate: 0,
		refreshPeriod: refreshPeriod
	};

	const results = await runDodgerScriptBulk(ns, [
		{ script: "/bladeburner/dodger/getGeneralActionNames.js", args: [] },
		{ script: "/bladeburner/dodger/getContractNames.js", args: [] },
		{ script: "/bladeburner/dodger/getOperationNames.js", args: [] },
		{ script: "/bladeburner/dodger/getBlackOpNames.js", args: [] },
		{ script: "/bladeburner/dodger/getSkillNames.js", args: [] }
	]);

	generalActionNames = results[0] as string[];
	contractNames = results[1] as string[];
	operationNames = results[2] as string[];
	blackOpNames = results[3] as string[];
	skillNames = results[4] as string[];

	blackOpRank = await runDodgerScript<IBladeburnerBlackOpRank[]>(ns, "/bladeburner/dodger/getBlackOpRank-bulk.js", JSON.stringify(blackOpNames));

	generalActionNames.forEach((task) => actionNames.push({ name: task, type: BladeburnerActionType.General   }));
	contractNames.forEach((task) => 	 actionNames.push({ name: task, type: BladeburnerActionType.Contract  }));
	operationNames.forEach((task) => 	 actionNames.push({ name: task, type: BladeburnerActionType.Operation }));
	blackOpNames.forEach((task) => 		 actionNames.push({ name: task, type: BladeburnerActionType.BlackOp   }));
}

/**
 * Test if the player has the stats required to join Bladeburners.
 * @returns True if the Bladeburner stat requirements are met; false otherwise.
 */
function hasBladeburnerStats() : boolean {
	return (
		player.stats.agility >= 100 &&
		player.stats.defense >= 100 &&
		player.stats.dexterity >= 100 &&
		player.stats.strength >= 100
	);
}

/*
 * ------------------------
 * > BLADEBURNER DATA UPDATE FUNCTION
 * ------------------------
*/

/**
 * Update data about Bladeburner.
 * @param ns NS object parameter.
 */
 async function updateBladeburnerData(ns : NS) : Promise<void> {
	await getBulkData(ns);

	highestLevel = Math.max(...actionsCurrentLevel.map((level) => level.currentLevel));

	bladeburnerData.refreshPeriod = refreshPeriod;
	bladeburnerData.lastUpdate = performance.now();

	logger.log("Pushing data to port", { type: MessageType.debugHigh });
	purgePort(ns, PortNumber.BladeburnerData);
	await writeToPort<IBladeburnerData>(ns, PortNumber.BladeburnerData, bladeburnerData);
}

/*
 * ------------------------
 * > BULK DATA UPDATE FUNCTION
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
		{ script: "/bladeburner/dodger/getActionAutolevel-bulk.js", args: [JSON.stringify(actionNames)] },
		{ script: "/bladeburner/dodger/getActionCountRemaining-bulk.js", args: [JSON.stringify(actionNames)] },
		{ script: "/bladeburner/dodger/getActionCurrentLevel-bulk.js", args: [JSON.stringify(actionNames)] },
		{ script: "/bladeburner/dodger/getActionEstimatedSuccessChance-bulk.js", args: [JSON.stringify(actionNames)] },
		{ script: "/bladeburner/dodger/getActionMaxLevel-bulk.js", args: [JSON.stringify(actionNames)] },
		{ script: "/bladeburner/dodger/getActionRepGain-bulk.js", args: [JSON.stringify(actionNames), highestLevel] },
		{ script: "/bladeburner/dodger/getActionTime-bulk.js", args: [JSON.stringify(actionNames)] },

		{ script: "/bladeburner/dodger/getCityEstimatedPopulation-bulk.js", args: [JSON.stringify(CITIES)] },
		{ script: "/bladeburner/dodger/getCityChaos-bulk.js", args: [JSON.stringify(CITIES)] },

		{ script: "/bladeburner/dodger/getSkillUpgradeCost-bulk.js", args: [JSON.stringify(skillNames)] },

		{ script: "/bladeburner/dodger/getRank.js", args: [] },
		{ script: "/bladeburner/dodger/getStamina.js", args: [] },
		{ script: "/bladeburner/dodger/getCity.js", args: [] },
		{ script: "/bladeburner/dodger/getCurrentAction.js", args: [] },
		{ script: "/bladeburner/dodger/getSkillPoints.js", args: [] },
		{ script: "/bladeburner/dodger/getSkillLevel-bulk.js", args: [JSON.stringify(skillNames)] }
	]);

	actionsAutolevel = results[0] as IBladeburnerActionAutolevel[];
	actionsCountRemaining = results[1] as IBladeburnerActionCountRemaining[];
	actionsCurrentLevel = results[2] as IBladeburnerActionCurrentLevel[];
	actionsEstimatedSuccessChance = results[3] as IBladeburnerActionEstimatedSuccessChance[];
	actionsMaxLevel = results[4] as IBladeburnerActionMaxLevel[];
	actionsRepGain = results[5] as IBladeburnerActionRepGain[];
	actionsTime = results[6] as IBladeburnerActionTime[];

	cityPopulation = results[7] as IBladeburnerCityPopulation[];
	cityChaos = results[8] as IBladeburnerCityChaos[];

	skillCosts = results[9] as IBladeburnerSkillCost[];

	bladeburnerData.rank = results[10] as number;
	bladeburnerData.stamina = results[11] as number[];
	bladeburnerData.currentCity = results[12] as string;
	bladeburnerData.currentAction = (results[13] as BladeburnerCurAction).name;
	bladeburnerData.skillPoints = results[14] as number;
	bladeburnerData.skills = results[15] as IBladeburnerSkills[];
}

/*
 * ------------------------
 * > BLADEBURNER DATA GETTER FUNCTIONS
 * ------------------------
*/

/**
 * Get the type for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Type for given action.
 */
function getBladeburnerActionType(actionName : string) : BladeburnerActionType {
	const type = actionNames.find((action) => action.name === actionName);
	if (!type) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return type.type;
}

/**
 * Get the autolevel state for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Autolevel state for given action.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getBladeburnerActionAutolevel(actionName : string) : boolean {
	const autolevel = actionsAutolevel.find((action) => action.name === actionName);
	if (!autolevel) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return autolevel.autolevel;
}

/**
 * Get the action remaining count for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Action remaining count for given action.
 */
function getBladeburnerActionCountRemaining(actionName : string) : number {
	const countRemaining = actionsCountRemaining.find((action) => action.name === actionName);
	if (!countRemaining) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return countRemaining.countRemaining;
}

/**
 * Get the current level for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Current level for given action.
 */
function getBladeburnerActionCurrentLevel(actionName : string) : number {
	const currentLevel = actionsCurrentLevel.find((action) => action.name === actionName);
	if (!currentLevel) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return currentLevel.currentLevel;
}

/**
 * Get the estimated success chance for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Estimated success chance for given action.
 */
 function getBladeburnerActionEstimatedSuccessChance(actionName : string) : [number, number] {
	const successChance = actionsEstimatedSuccessChance.find((action) => action.name === actionName);
	if (!successChance) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return successChance.estimatedSuccessChance;
}

/**
 * Get the max level for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns max level for given action.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getBladeburnerActionMaxLevel(actionName : string) : number {
	const maxLevel = actionsMaxLevel.find((action) => action.name === actionName);
	if (!maxLevel) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return maxLevel.maxLevel;
}

/**
 * Get the rep/rank gain for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Rep/rank gain for given action.
 */
function getBladeburnerActionRepGain(actionName : string) : number {
	const repGain = actionsRepGain.find((action) => action.name === actionName);
	if (!repGain) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return repGain.repGain;
}

/**
 * Get the action time for a given Bladeburner action.
 * @param actionName Name of action.
 * @returns Action time for given action.
 */
function getBladeburnerActionTime(actionName : string) : number {
	const actionTime = actionsTime.find((action) => action.name === actionName);
	if (!actionTime) throw new Error(`Unable to find auto level state for bladeburner action: ${actionName}`);
	return actionTime.actionTime;
}

/**
 * Get the population for a given city.
 * @param cityName City name.
 * @returns Population for a given city.
 */
function getBladeburnerCityPopulation(cityName : string) : number {
	const population = cityPopulation.find((city) => city.city === cityName);
	if (!population) throw new Error(`Unable to find population for city: ${cityName}`);
	return population.population;
}

/**
 * Get the chaos for a given city.
 * @param cityName City name.
 * @returns Chaos for a given city.
 */
function getBladeburnerCityChaos(cityName : string) : number {
	const chaos = cityChaos.find((city) => city.city === cityName);
	if (!chaos) throw new Error(`Unable to find chaos for city: ${cityName}`);
	return chaos.chaos;
}

/**
 * Get the requried rank to perform a given BlackOp.
 * @param blackOpName BlackOp name.
 * @returns Rank to perform a given BlackOp.
 */
function getBladeburnerBlackOpRank(blackOpName : string) : number {
	const rank = blackOpRank.find((blackOp) => blackOp.name === blackOpName);
	if (!rank) throw new Error(`Unable to find rank for blackop: ${blackOpName}`);
	return rank.rank;
}

/**
 * Get the current level of a Bladeburner skill.
 * @param skillName Skill name.
 * @returns Bladeburner skill level.
 */
 function getBladeburnerSkillLevel(skillName : string) : number {
	const skillLevel = bladeburnerData.skills.find((skillLevel) => skillLevel.name === skillName);
	if (!skillLevel) throw new Error(`Unable to find current level for skill: ${skillName}`);
	return skillLevel.level;
}

/**
 * Get the cost to upgrade a Bladeburner skill.
 * @param skillName Skill name.
 * @returns Bladeburner skill upgrade cost.
 */
function getBladeburnerSkillCost(skillName : string) : number {
	const skillLevel = skillCosts.find((skillCost) => skillCost.name === skillName);
	if (!skillLevel) throw new Error(`Unable to find skill upgrade cost for skill: ${skillName}`);
	return skillLevel.cost;
}

/**
 * Get the cost multiplier for a Bladeburner skill.
 * @param skillName Skill name.
 * @returns Bladeburner skill cost multiplier.
 */
function getBladeburnerSkillCostMultiplier(skillName : string) : number {
	const skillMult = skillLimits.find((skillLimit) => skillLimit.name === skillName);
	if (!skillMult) throw new Error(`Unable to find skill upgrade cost multiplier for skill: ${skillName}`);
	return skillMult.costMult;
}

/**
 * Get the skill upgrade limit for a Bladeburner skill.
 * @param skillName Skill name.
 * @returns Bladeburner skill upgrade limit.
 */
function getBladeburnerSkillLimit(skillName : string) : number {
	const skillLimit = skillLimits.find((skillLimit) => skillLimit.name === skillName);
	if (!skillLimit) throw new Error(`Unable to find skill upgrade limit for skill: ${skillName}`);
	return skillLimit.limit;
}

/*
 * ------------------------
 * > BLADEBURNER CITY SWITCH CHECKER FUNCTIONS
 * ------------------------
*/

/**
 * Check if a Bladeburner city switch is required.
 * @param ns NS object parameter.
 */
async function checkCitySwitch(ns : NS) : Promise<void> {
	if (getBladeburnerCityPopulation(bladeburnerData.currentCity) < 500e6) {
		await trySwitchCity(ns);
	}
}

/**
 * Try to perform a Bladeburner city switch.
 * @param ns NS object parameter.
 */
async function trySwitchCity(ns : NS) : Promise<void> {
	for (const population of cityPopulation.sort((a, b) => b.population - a.population)) {
		if (population.population < 500e6) continue;
		const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/switchCity.js", population.city);
		if (result) {
			logger.log(`Bladeburner Agent travelled to city: ${population.city}`, { type: MessageType.info });
		} else {
			logger.log(`Bladeburner Agent failed to travel to city: ${population.city}`, { type: MessageType.fail });
		}
	}
}

/*
 * ------------------------
 * > SKILL UPGRADE PURCHASE FUNCTIONS
 * ------------------------
*/

/**
 * Try to buy Bladeburner skill upgrades.
 * @param ns NS object parameter.
 */
async function tryUpgradeBladeburnerSkills(ns : NS) : Promise<void> {
    logger.log("Trying to buy any available upgrades", { type: MessageType.debugLow });
	const skillTrueCosts = skillCosts.filter((skill) => canUpgradeSkill(skill.name)).map((skill) => { return {
		name: skill.name,
		trueCost: skill.cost * getBladeburnerSkillCostMultiplier(skill.name)
	}}).sort((a, b) => a.trueCost - b.trueCost);

	if (skillTrueCosts.length > 0) {
		const skillUpgrade = skillTrueCosts[0].name;
		await doUpgradeSkill(ns, skillUpgrade);
	}
}

/**
 * Test if a given skill can be upgraded.
 * @param skillName Skill name.
 * @returns True if the skill can be upgraded; false otherwise.
 */
function canUpgradeSkill(skillName : string) : boolean {
    logger.log(`Testing if upgrade ${skillName} can be upgraded`, { type: MessageType.debugHigh });
	return (
		getBladeburnerSkillLevel(skillName) < getBladeburnerSkillLimit(skillName) &&
		bladeburnerData.skillPoints >= getBladeburnerSkillCost(skillName)  &&
		(skillName !== "Overclock" || (skillName === "Overclock" && getBladeburnerActionEstimatedSuccessChance("Assassination")[0] >= 0.5))
	);
}

/**
 * Buy a given skill upgrade.
 * @param ns NS object parameter.
 * @param skillName Skill name.
 * @returns True if the skill upgrade was purchased; false otherwise.
 */
async function doUpgradeSkill(ns : NS, skillName : string) : Promise<boolean> {
    logger.log(`Trying to upgrade skill: ${skillName}`, { type: MessageType.debugHigh });
	const oldLevel = getBladeburnerSkillLevel(skillName);

	const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/upgradeSkill.js", skillName);
	if (result) {
		logger.log(`Upgraded Bladeburner Skill: ${skillName} (${oldLevel} --> ${oldLevel + 1})`, { type: MessageType.success, sendToast: true });
		return true;
	} else {
		logger.log(`Failed to upgrade Bladeburner Skill: ${skillName}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/*
 * ------------------------
 * > ACTION DETERMINATION FUNCTION
 * ------------------------
*/

/**
 * Determine the best action to take depending on the current Bladeburner situation, then do it.
 * @param ns NS object parameter.
 */
async function doBladeburnerAction(ns : NS) : Promise<void> {
    logger.log("Determining best action to perform", { type: MessageType.debugLow });
	if (testDoActionRecovery())			await doActionRecovery(ns);
	else if	(testDoActionAnalysis())	await doActionAnalysis(ns);
	else if (testDoActionDiplomacy())	await doActionDiplomacy(ns);
	else if (testDoActionBlackOps())	await doActionBlackOps(ns);
	else								await doActionBestAction(ns);
}

/*
 * ------------------------
 * > ACTION TEST FUNCTIONS
 * ------------------------
*/

/**
 * Determines whether performing recovery action is correct.
 * @returns True if covery is the correct action to take.
 */
 function testDoActionRecovery() : boolean {
    logger.log("Testing if recovery is the correct action", { type: MessageType.debugLow });
	return (
		bladeburnerData.currentAction === "Hyperbolic Regeneration Chamber"
			? bladeburnerData.stamina[0] <= bladeburnerData.stamina[1] * 0.9
			: bladeburnerData.stamina[0] <= bladeburnerData.stamina[1] / 2
	);
}

/**
 * Determines whether performing an analysis action is correct.
 * @returns True if an analysis action is the correct action to take.
 */
function testDoActionAnalysis() : boolean {
    logger.log("Testing if analysis is the correct action", { type: MessageType.debugLow });
	return actionsEstimatedSuccessChance.some((action) => (action.estimatedSuccessChance[1] - action.estimatedSuccessChance[0]) > 0.25);
}

/**
 * Determines whether performing the 'Diplomacy' action is correct.
 * @returns True if 'Diplomacy' is the correct action to take.
 */
function testDoActionDiplomacy() : boolean {
    logger.log("Testing if 'Diplomacy' is the correct action", { type: MessageType.debugLow });
	return (
		bladeburnerData.currentAction === "Diplomacy"
			? getBladeburnerCityChaos(bladeburnerData.currentCity) > 50
			: getBladeburnerCityChaos(bladeburnerData.currentCity) >= 100
	);
}

/**
 * Determines whether performing a BlackOps is correct.
 * @returns True if BlackOps is the correct action to take.
 */
function testDoActionBlackOps() : boolean {
    logger.log("Testing a BlackOps is the correct action", { type: MessageType.debugLow });
	const nextBlackOp = getNextBlackOp();
	if (!nextBlackOp) {
		logger.log("No more BlackOps to perform.", { type: MessageType.debugLow });
		return false;
	} else {
		return testCanActionBlackOp(nextBlackOp);
	}
}

/**
 * Get the name of the next BlackOp.
 * @returns The name of the next BlackOp; undefined if no blackops remaining.
 */
function getNextBlackOp() : string | undefined {
    logger.log("Getting name of next BlackOp", { type: MessageType.debugHigh });
	for (const op of blackOpNames) {
		if (getBladeburnerActionCountRemaining(op) > 0) return op;
	}

	return;
}

/**
 * Determines whether the player is able to attempt the given BlackOp.
 * @param blackOpName BlackOp name.
 * @returns True if the player should do the provided BlackOp.
 */
function testCanActionBlackOp(blackOpName : string) : boolean {
    logger.log(`Testing if player can perform BlackOp: ${blackOpName}`, { type: MessageType.debugHigh });
	if (bladeburnerData.rank < getBladeburnerBlackOpRank(blackOpName)) return false;
	const successChance = getBladeburnerActionEstimatedSuccessChance(blackOpName);
	return successChance[0] > 0.85;
}

/*
 * ------------------------
 * > ACTION PROCESS FUNCTIONS
 * ------------------------
*/

/**
 * Start an analysis action.
 * @param ns NS object parameter.
 */
async function doActionAnalysis(ns : NS) : Promise<void> {
	logger.log("Performing analysis action.", { type: MessageType.debugHigh });
	if (getBladeburnerActionEstimatedSuccessChance("Undercover Operation")[0] >= 0.5 && getBladeburnerActionCountRemaining("Tracking") > 0) {
		await tryStartAction(ns, "Undercover Operation");
	} else if (getBladeburnerActionEstimatedSuccessChance("Investigation")[0] >= 0.5 && getBladeburnerActionCountRemaining("Tracking") > 0) {
		await tryStartAction(ns, "Investigation");
	} else if (getBladeburnerActionEstimatedSuccessChance("Tracking")[0] >= 0.5 && getBladeburnerActionCountRemaining("Tracking") > 0) {
		await tryStartAction(ns, "Tracking",);
	} else {
		await tryStartAction(ns,"Field Analysis");
	}
}

/**
 * Start the action 'Hyperbolic Regeneration Chamber'.
 * @param ns NS object parameter.
 */
async function doActionRecovery(ns : NS) : Promise<void> {
	logger.log("Performing recovery action.", { type: MessageType.debugHigh });
	await tryStartAction(ns, "Hyperbolic Regeneration Chamber");
}

/**
 * Start the action 'Diplomacy'.
 * @param ns NS object parameter.
 */
async function doActionDiplomacy(ns : NS) : Promise<void> {
	logger.log("Performing diplomacy action.", { type: MessageType.debugHigh });
	await tryStartAction(ns, "Diplomacy");
}

/**
 * Start the next BlackOps.
 * @param ns NS object parameter.
 */
async function doActionBlackOps(ns : NS) : Promise<void> {
    logger.log("Performing next BlackOps operation", { type: MessageType.debugHigh });
	const nextBlackOp = getNextBlackOp();
	if (!nextBlackOp) throw new Error("Was unable to find next BlackOp to perform. Does the BlackOp checker work?");
	await tryStartAction(ns, nextBlackOp);
}

/**
 * Start the current best action.
 * @param ns NS object parameter.
 */
async function doActionBestAction(ns : NS) : Promise<void> {
    logger.log("Determining best contract or operation to perform", { type: MessageType.debugHigh });
	const bestAction = getBestAction();
	await tryStartAction(ns, bestAction.name);
}

/**
 * Get the name of the best contract/operation to perform.
 * @returns Best action or nothing if no action is good enough to be taken.
 */
function getBestAction() : IBladeburnerActionInfo {
    logger.log("Getting best contract/operation action", { type: MessageType.debugHigh });

	const possibleActions = actionNames.filter((action) =>
		action.type !== BladeburnerActionType.BlackOp &&
		getBladeburnerActionCountRemaining(action.name) > 0 &&
		getBladeburnerActionEstimatedSuccessChance(action.name)[0] > 0.35 &&
		(action.name === "Raid" ? getBladeburnerCityPopulation(bladeburnerData.currentCity) > 750e6 : true)
	);

	const bestAction = possibleActions.map((action) => { return {
		name: action.name,
		return: getBladeburnerActionRepGain(action.name) * getBladeburnerActionEstimatedSuccessChance(action.name)[0] / getBladeburnerActionTime(action.name)
	}}).reduce((a, b) => (a.return > b.return ? a : b));

	return bestAction;
}

/*
 * ------------------------
 * > ACTION START FUNCTIONS
 * ------------------------
*/

/**
 * Try to start a Bladeburner action.
 * @param ns NS object parameter.
 * @param actionName Action name
 */
async function tryStartAction(ns : NS, actionName : string) : Promise<void> {
    logger.log(`Trying to start action ${actionName}`, { type: MessageType.debugLow });

	const actionType = getBladeburnerActionTypeFromEnum(getBladeburnerActionType(actionName));
	const currentLevel = getBladeburnerActionCurrentLevel(actionName);
	const successChance = getBladeburnerActionEstimatedSuccessChance(actionName);

	const time = getTrueActionTime(ns, getBladeburnerActionTime(actionName));

	if (bladeburnerData.currentAction !== actionName) {
		const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/startAction.js", actionType, actionName)
		if (result) {
			logger.log(`Started action: ${actionType} > ${actionName} (Lv${currentLevel} @ ${(successChance[0]*100).toFixed(0)}%) | ETA: ${time}s`, { type: MessageType.info });
			await ns.asleep(time*1000);
		} else {
			logger.log(`Failed to start action: ${actionName}`, { type: MessageType.fail });
		}
	} else {
		logger.log(`Already performing action: ${actionName}`, { type: MessageType.debugLow });
		await ns.asleep(time*1000);
	}
}

/**
 * Convert bladeburner action time to "true" time in seconds, factoring in bonus time.
 * @param ns NS object parameter.
 * @param time Time in ms.
 * @returns True action time in seconds.
 */
function getTrueActionTime(ns : NS, time : number) : number {
	const bonusTime = ns.bladeburner.getBonusTime();
	const bonusTimeModifier = (bonusTime > 5000 ? 5 : 1);
	return Math.ceil((time / 1000) / bonusTimeModifier);
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "BLADE", "Bladeburner Daemon")

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf(
			`Bladeburner Daemon Helper:\n`+
			`Description:\n` +
			`   Who said you couldn't automate criminal justice? No one..? Well then be happy Bladeburner-daemon has your back!\n` +
			`Usage: run /bladeburner/bladeburner-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help    : boolean |>> Prints this.\n` +
			`   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.`
		);

		return;
	}

	await setupEnvironment(ns);

	logger.initialisedMessage(true, false);

	while (true) {
		await updateBladeburnerData(ns);
		await checkCitySwitch(ns);
		await tryUpgradeBladeburnerSkills(ns);
		await doBladeburnerAction(ns);
	}
}
