import { BitNodeMultipliers, GangGenInfo, GangMemberAscension, GangMemberInfo, GangTaskStats, NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { PortNumber, purgePort, writeToPort } from '/libraries/port-handler.js';
import { gangMemberNames, gangNames, GangSpecialTasks, IGangAscensionResult, IGangClashChance, IGangData, IGangEquipmentCost, IGangEquipmentOrder, IGangEquipmentType, IGangTaskAssign, IOtherGangData } from '/data-types/gang-data';
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { readBitnodeMultiplierData } from '/data/read-bitnodemult-data';
import { runDodgerScript, runDodgerScriptBulk } from '/helpers/dodger-helper';
import { calculateMoneyGain, calculateRespectGain, calculateWantedLevelGain, calculateXpGain } from '/helpers/gang-helper';
import { isNumber } from '/data-types/type-guards';
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
    ["wild", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

let wildSpending = false; // Allow purchasing upgrades with all available money

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Bitnode Multpliers */
let multipliers : BitNodeMultipliers;

/** Gang state data object */
let gangData : IGangData;

/* Gang task list. */
let taskInfo : GangTaskStats[];

/* Gang equipment names. */
let equipmentNames : string[];
/* Gang equipment types. */
let equipmentTypes : IGangEquipmentType[] = [];
/* Gang equipment costs. */
let equipmentCosts : IGangEquipmentCost[] = [];

/* Gang member ascension results. */
let ascensionResults : { name : string, result : GangMemberAscension | undefined }[] = [];

/** Proportion of generated funds to go back into upgrading gang members. */
const profitRatioForUpgrades = 0.9;

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
	multipliers = await readBitnodeMultiplierData(ns);

	const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/inGang.js");
	if (!result) {
		if (player.karma <= -54000 || player.bitnodeN === 2) {
			await tryJoinGang(ns);
		} else {
			logger.log("Not in gang - aborting execution", { type: MessageType.error, sendToast: true });
			ns.exit();
			await ns.asleep(1000);
		}
	}

	const results = await runDodgerScriptBulk(ns, [
		{ script: "/gangs/dodger/getGangInformation.js", args: [] },
		{ script: "/gangs/dodger/getOtherGangInformation.js", args: [] },
		{ script: "/gangs/dodger/getTaskNames.js", args: [] },
		{ script: "/gangs/dodger/getEquipmentNames.js", args: [] }
	]);

	const gangInfo = results[0] as GangGenInfo;
	const otherGangInfo = results[1] as IOtherGangData[]
	const tasks = results[2] as string[];
	equipmentNames = results[3] as string[];

	gangData = {
		gangInfo: gangInfo,
		otherGangInfo: otherGangInfo,
		members: [],
		clashChances: [],
		nextPowerTick: 0,
		lastUpdate: performance.now(),
		currentFunds: 0,
		refreshPeriod: refreshPeriod
	};

	const moreresults = await runDodgerScriptBulk(ns, [
		{ script: "/gangs/dodger/getTaskStats-bulk.js", args: [JSON.stringify(tasks)] },
		{ script: "/gangs/dodger/getEquipmentType-bulk.js", args: [JSON.stringify(equipmentNames)] }
	]);

	taskInfo = moreresults[0] as GangTaskStats[];
	equipmentTypes = moreresults[1] as IGangEquipmentType[];
}

/*
 * ------------------------
 * > GANG JOIN FUNCTION
 * ------------------------
*/

/**
 * Try to join a gang.
 * @param ns NS object parameter.
 */
async function tryJoinGang(ns : NS) : Promise<void> {
	if (player.factions.joinedFactions.includes("Speakers For The Dead")) {
		const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Speakers For The Dead");
		if (!result) throw new Error("Failed to join gang with faction: Speakers For The Dead");
	} else if (player.factions.joinedFactions.includes("Slum Snakes")) {
		const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Slum Snakes");
		if (!result) throw new Error("Failed to join gang with faction: Slum Snakes");
	} else {
		const factionInvites = await runDodgerScript<string[]>(ns, "/singularity/dodger/checkFactionInvitations.js");
		if (factionInvites.includes("Slum Snakes")) {
			const factionJoinResult = await runDodgerScript<boolean>(ns, "/singularity/dodger/joinFaction.js", "Slum Snakes");
			if (factionJoinResult) {
				await runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Slum Snakes");
			} else {
				throw new Error("Unable to join any faction in order to create a gang.");
			}
		}
	}
}

/*
 * ------------------------
 * > GANG DATA UPDATE FUNCTION
 * ------------------------
*/

/**
 * Update data on all things gang
 * @param ns NS object parameter.
 */
async function updateGangData(ns : NS) : Promise<void> {
	await getBulkData(ns);

	const mult = (ns.gang.getBonusTime() >= 10 ? 10 : 1);
	const moneyGained = mult * (gangData.gangInfo.moneyGainRate * 5) * ((performance.now() - gangData.lastUpdate) / 1000);
	gangData.currentFunds += profitRatioForUpgrades * moneyGained;

	gangData.lastUpdate = performance.now();

	logger.log("Pushing data to port", { type: MessageType.debugHigh });
	purgePort(ns, PortNumber.GangData);
	await writeToPort<IGangData>(ns, PortNumber.GangData, gangData)
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
	const memberNames = await runDodgerScript<string[]>(ns, "/gangs/dodger/getMemberNames.js");

	const results = await runDodgerScriptBulk(ns, [
		{ script: "/gangs/dodger/getGangInformation.js", args: [] },
		{ script: "/gangs/dodger/getMemberInformation-bulk.js", args: [JSON.stringify(memberNames)] },
		{ script: "/gangs/dodger/getOtherGangInformation.js", args: [] },
		{ script: "/gangs/dodger/getChanceToWinClash-bulk.js", args: [JSON.stringify(gangNames)] },
		{ script: "/gangs/dodger/getEquipmentCost-bulk.js", args: [JSON.stringify(equipmentNames)] },
		{ script: "/gangs/dodger/getAscensionResult-bulk.js", args: [JSON.stringify(memberNames)] }
	]);

	gangData.gangInfo = results[0] as GangGenInfo;
	gangData.members = results[1] as GangMemberInfo[];
	gangData.otherGangInfo = results[2] as IOtherGangData[];
	gangData.clashChances = results[3] as IGangClashChance[];

	equipmentCosts = results[4] as IGangEquipmentCost[];

	ascensionResults = results[5] as IGangAscensionResult[];
}

/*
 * ------------------------
 * > GANG INFO GETTER FUNCTIONS
 * ------------------------
*/

/**
 * Get the current power of a gang.
 * @param gangName Name of gang.
 * @returns Power of gang.
 */
// function getGangPower(gangName : string) : number {
// 	const power = otherGangInfo.find((x) => x.name === gangName)?.power;
// 	if (power) {
// 		return power;
// 	} else {
// 		throw new Error(`Could not find power for gang: ${gangName}.`);
// 	}
// }

/**
 * Get the current territory of a gang.
 * @param gangName Name of gang.
 * @returns Territory of gang.
 */
function getGangTerritory(gangName : string) : number {
	const territory = gangData.otherGangInfo.find((x) => x.name === gangName)?.territory;
	if (isNumber(territory)) {
		return territory;
	} else {
		throw new Error(`Could not find territory for gang: ${gangName}.`);
	}
}

/**
 * Get the current clash win chance against a gang.
 * @param gangName Name of gang.
 * @returns Clash win chance against a gang.
 */
function getGangClashChance(gangName : string) : number {
	const chance = gangData.clashChances.find((x) => x.name === gangName)?.chance;
	if (isNumber(chance)) {
		return chance;
	} else {
		throw new Error(`Could not find clash chance for gang: ${gangName}.`);
	}
}

/*
 * ------------------------
 * > EQUIPMENT INFO GETTER FUNCTIONS
 * ------------------------
*/

/**
 * Get the type of a piece of gang equipment.
 * @param equipmentName Name of equipment.
 * @returns Type of equipment.
 */
function getGangEquipmentType(equipmentName : string) : string {
	const type = equipmentTypes.find((x) => x.name === equipmentName)?.type;
	if (type) {
		return type;
	} else {
		throw new Error(`Could not find equiment type for equipment item: ${equipmentName}.`);
	}
}

/**
 * Get the cost of a piece of gang equipment.
 * @param equipmentName Name of equipment.
 * @returns Cost of equipment.
 */
function getGangEquipmentCost(equipmentName : string) : number {
	const cost = equipmentCosts.find((x) => x.name === equipmentName)?.cost;
	if (cost) {
		return cost;
	} else {
		throw new Error(`Could not find equiment cost for equipment item: ${equipmentName}.`);
	}
}

/*
 * ------------------------
 * > GANG MEMBER NAME CREATOR FUNCTION
 * ------------------------
*/

/**
 * Construct and return a random name.
 * @returns A random name.
 * */
function getGangMemberName() : string {
	for (const name of gangMemberNames) {
		if (!gangData.members.map((m) => m.name).includes(name)) return name;
	}

	return "???";
}

/*
 * ------------------------
 * > GANG MEMBER RECRUIMENT FUNCTIONS
 * ------------------------
*/

/**
 * Try to recruit new gang members.
 * @param ns NS object parameter.
 */
async function tryRecruitMembers(ns : NS) : Promise<void> {
	const canRecruit = await canRecruitGangMember(ns);
	if (canRecruit) await tryRecruitGangMember(ns);
}

/**
 * Test if a new gang member can be recruited.
 * @param ns NS object parameter.
 * @returns True if a new member can be recruited; false otherwise.
 */
async function canRecruitGangMember(ns : NS) : Promise<boolean> {
	const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/canRecruitMember.js");
	return result;
}

/**
 * Try to recruit a new member.
 * @param ns NS object parameter.
 * @returns True if a new member was recruited; false otherwise.
 */
async function tryRecruitGangMember(ns : NS) : Promise<boolean> {
	const name = getGangMemberName();
	const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/recruitMember.js", name);
	if (result) {
		logger.log(`Recruited new gang member: ${name}`, { type: MessageType.success, sendToast: true });
	} else {
		logger.log(`Failed to recruit new gang member`, { type: MessageType.fail, sendToast: true });
	}
	return result;
}

/*
 * ------------------------
 * > GANG MEMBER ASCENSION FUNCTIONS
 * ------------------------
*/

/**
 * Try to ascend gang members.
 * @param ns NS object parameter.
 */
async function tryAscendMembers(ns : NS) : Promise<void> {
	const scripts = generateAscensionScripts();
	const results = await runDodgerScriptBulk(ns, scripts);
	processAscensionResults(scripts, results);
}

/**
 * Generate an array of scripts that will ascend gang members if eligible.
 * @returns Array of scripts to run to ascend gang members.
 */
function generateAscensionScripts() : IScriptRun[] {
	const scripts : IScriptRun[] = [];

	gangData.members.filter((member) => canAscendMember(member)).forEach((member) => {
		scripts.push({ script: "/gangs/dodger/ascendMember.js", args: [member.name] });
	});

	return scripts;
}

/**
 * Test if a given gang member can be ascended.
 * @param member Gang member.
 * @returns True if the gang member can be ascended; false otherwise.
 */
function canAscendMember(member : GangMemberInfo) : boolean {
	const ascendResult = ascensionResults.find((x) => x.name === member.name)?.result;
	if (!ascendResult) return false;
	if (gangData.gangInfo.isHacking) {
		const avgAscMult = (member.cha_asc_mult + member.hack_asc_mult) / 2;
		const ascMin = Math.max(1.1, 1.6 - Math.sqrt(avgAscMult / 200));
		return ascendResult.cha > ascMin && ascendResult.hack > ascMin
	} else {
		const avgAscMult = (member.cha_asc_mult + member.def_asc_mult + member.dex_asc_mult + member.str_asc_mult) / 4;
		const ascMin = Math.max(1.1, 1.6 - Math.sqrt(avgAscMult / 200));
		return ascendResult.cha > ascMin && ascendResult.def > ascMin && ascendResult.dex > ascMin && ascendResult.str > ascMin;
	}
}

/**
 * Process the results of the run scripts for ascending gang members.
 * @param scripts Array of scripts that were run.
 * @param results Results of said run scripts.
 */
function processAscensionResults(scripts : IScriptRun[], results : unknown[]) : void {
	for (let i = 0; i < results.length; i++) {
		if (results[i]) {
			logger.log(`Ascended gang member ${scripts[i].args[0]}`, { type: MessageType.success, sendToast: true });
		} else {
			logger.log(`Failed to ascend gang member ${scripts[i].args[0]}`, { type: MessageType.fail, sendToast: true });
		}
	}
}

/*
 * ------------------------
 * > GANG TASK ASSIGNER FUNCTIONS
 * ------------------------
*/

/**
 * Try to assign gang member tasks.
 * @param ns NS object parameter.
 */
async function tryAssignTasks(ns : NS) : Promise<void> {
	const script = generateAssignTaskScript();
	if (script) {
		const result = await runDodgerScript<boolean[]>(ns, script.script, ...script.args);
		processAssignTaskResults(script, result);
	}
}

/**
 * Generate a script that will assign tasks.
 * @returns Script to run to assign tasks to gang members.
 */
function generateAssignTaskScript() : IScriptRun | undefined {
	const taskAssigns : IGangTaskAssign[] = [];

	gangData.members.forEach((member) => {
		const task = getTaskToAssign(member);
		if (member.task === task ) {
			logger.log(`Member ${member.name} is already performing task: ${task}`, { type: MessageType.debugLow });
		} else {
			taskAssigns.push({ member: member.name, task: task });
		}
	});

	if (taskAssigns.length > 0) {
		const script = { script: "/gangs/dodger/setMemberTask-bulk.js", args: [JSON.stringify(taskAssigns)] };
		return script;
	} else {
		return;
	}
}

/**
 * Try to assign a task to a given gang member.
 * @param member Gang member.
 * @returns True if the given task was successfully assigned; false otherwise.
 */
function getTaskToAssign(member : GangMemberInfo) : string {
	if (shouldAssignTrainHacking(member))  return "Train Hacking";
	if (shouldAssignTrainCharisma(member)) return "Train Charisma";
	if (shouldAssignTrainCombat(member))   return "Train Combat";
	if (shouldAssignReduceWanted()) 	   return GangSpecialTasks.ReduceWantedLevel;

	const task = getBestTask(member);
	return task;
}

/**
 * Test if train hacking task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train hacking should be assigned; false otherwise.
 */
function shouldAssignTrainHacking(member : GangMemberInfo) : boolean {
	return member.hack < 20;
}

/**
 * Test if train charisma task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train charisma should be assigned; false otherwise.
 */
function shouldAssignTrainCharisma(member : GangMemberInfo) : boolean {
	return member.cha < 20;
}

/**
 * Test if train combat task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train combat should be assigned; false otherwise.
 */
function shouldAssignTrainCombat(member : GangMemberInfo) : boolean {
	return member.agi < 20 || member.def < 20 || member.dex < 20 || member.str < 20;
}

/**
 * Test if the reduce wanted task should be assigned to this gang member.
 * @returns True if the reduce wanted task should be assigned; false otherwise.
 */
function shouldAssignReduceWanted() : boolean {
	return gangData.gangInfo.wantedLevel > 100 && gangData.gangInfo.wantedPenalty < 0.8;
}

/**
 * Decide which task is best for a member to perform given the current gang state.
 * @param member Gang member.
 * @returns Name of best task to perform for a given gang member.
 */
function getBestTask(member : GangMemberInfo) : string {
	if 		(shouldAssignXpTask(member)) 		return getBestXpTask(member);
	else if (shouldAssignRespectTask(member))   return getBestRespectTask(member);
	else  								   		return getBestMoneyTask(member);
}

/**
 * Test if a power task should be assigned.
 * @param member Gang member.
 * @returns True if a power task should be assigned; false otherwise.
 */
function shouldAssignXpTask(member : GangMemberInfo) : boolean {
	return (
		member.def < 1500
	);
}

/**
 * Test if a respect task should be assigned.
 * @returns True if a respect task should be assigned; false otherwise.
 */
function shouldAssignRespectTask(member : GangMemberInfo) : boolean {
	return (
		member.earnedRespect < 1e7 ||
		gangData.members.length < 12 ||
		getDiscount() < 1.67 ||
		player.money >= 1e12
	);
}

/**
 * Calculate the gang equipment discount multiplier.
 * @returns Discount multiplier for gang equipment.
 */
function getDiscount() : number {
    const power = gangData.gangInfo.power;
    const respect = gangData.gangInfo.respect;

    const respectLinearFac = 5e6;
    const powerLinearFac = 1e6;

    const discount = Math.pow(respect, 0.01) + respect / respectLinearFac + Math.pow(power, 0.01) + power / powerLinearFac - 1;
    return Math.max(1, discount);
}

/**
 * Get the best xp task to perform for a given gang member.
 * @param member Gang member.
 * @returns Name of best xp task to perform.
 */
function getBestXpTask(member : GangMemberInfo) : string {
	const possibleTasks = taskInfo
	.filter((task) =>
		(task.isHacking && gangData.gangInfo.isHacking) || (task.isCombat && !gangData.gangInfo.isHacking) &&
		calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2 &&
		task.defWeight > 0
	)
	.sort((a, b) =>
		calculateXpGain(member, b) - calculateXpGain(member, a)
	);

	if (possibleTasks.length > 0) {
		return possibleTasks[0].name;
	} else {
		throw new Error(`Could not find an xp task to assign to member: ${member.name}`);
	}
}

/**
 * Get the best respect task to perform for a given gang member.
 * @param member Gang member.
 * @returns Name of best respect task to perform.
 */
function getBestRespectTask(member : GangMemberInfo) : string {
	const possibleTasks = taskInfo
	.filter((task) =>
		((task.isHacking && gangData.gangInfo.isHacking) || (task.isCombat && !gangData.gangInfo.isHacking)) &&
		calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2
	)
	.sort((a, b) =>
		calculateRespectGain(gangData.gangInfo, member, b, multipliers) - calculateRespectGain(gangData.gangInfo, member, a, multipliers)
	);

	if (possibleTasks.length > 0) {
		return possibleTasks[0].name;
	} else {
		throw new Error(`Could not find a respect task to assign to member: ${member.name}`);
	}
}

/**
 * Get the best money task to perform for a given gang member.
 * @param member Gang member.
 * @returns Name of best money task to perform.
 */
function getBestMoneyTask(member : GangMemberInfo) : string {
	const possibleTasks = taskInfo
	.filter((task) =>
		((task.isHacking && gangData.gangInfo.isHacking) || (task.isCombat && !gangData.gangInfo.isHacking)) &&
		calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2
	)
	.sort((a, b) =>
		calculateMoneyGain(gangData.gangInfo, member, b, multipliers) - calculateMoneyGain(gangData.gangInfo, member, a, multipliers)
	);

	if (possibleTasks.length > 0) {
		return possibleTasks[0].name;
	} else {
		throw new Error(`Could not find a money task to assign to member: ${member.name}`);
	}
}

/**
 * Process the results of the run script for assigning tasks.
 * @param scripts Script that was run.
 * @param results Results of said run script.
 */
function processAssignTaskResults(script : IScriptRun, results : unknown[]) : void {
	const args : IGangTaskAssign[] = JSON.parse(script.args[0] as string);

	for (let i = 0; i < results.length; i++) {
		if (results[i]) {
			logger.log(`Set member ${args[i].member} to task ${args[i].task}`, { type: MessageType.info })
		} else {
			logger.log(`Failed to set member ${args[i].member} to task ${args[i].task}`, { type: MessageType.fail });
		}
	}
}

/*
 * ------------------------
 * > GANG EQUIPMENT PURCHASING FUNCTIONS
 * ------------------------
*/

/**
 * Try to purchase equipment.
 * @param ns NS object parameter.
 */
async function tryPurchaseEquipment(ns : NS) : Promise<void> {
	const script = generatePurchaseEquipmentScript();
	if (script) {
		const result = await runDodgerScript<boolean[]>(ns, script.script, ...script.args);
		processPurchaseEquipmentResults(script, result);
	}
}

/**
 * Generate a script that will purchase equipment.
 * @returns Script to run to purchase equipment to gang members.
 */
function generatePurchaseEquipmentScript() : IScriptRun | undefined {
	const equipmentOrders : IGangEquipmentOrder[] = [];

	let cumulativeCost = 0;

	gangData.members.forEach((member) => {
		const unownedEquipment = equipmentNames.filter((equipment) => ![...member.upgrades, ...member.augmentations].includes(equipment));

		unownedEquipment.forEach((equipment) => {
			const cost = getGangEquipmentCost(equipment);
			if (canPurchaseEquipment(cumulativeCost + cost)) {
				equipmentOrders.push({ member: member.name, equipment: equipment });
				cumulativeCost += cost;
			}
		});
	});

	if (equipmentOrders.length > 0) {
		const script = { script: "/gangs/dodger/purchaseEquipment-bulk.js", args: [JSON.stringify(equipmentOrders)] };
		return script;
	} else {
		return;
	}
}

/**
 * Test if a given piece of equipment can be purchased.
 * @param cost Gang equipment cost.
 * @returns True if the equipment can be purchased, false otherwise.
 */
function canPurchaseEquipment(cost : number) : boolean {
	return (
		player.money >= cost &&
		(
			wildSpending
				? (player.money - cost >= 100e9)
				: (gangData.currentFunds >= cost)
		)
	);
}

/**
 * Process the results of the run script for purchasing equipment.
 * @param script Script that was run.
 * @param results Results of said run script.
 */
function processPurchaseEquipmentResults(script : IScriptRun, results : unknown[]) : void {
	const args : IGangEquipmentOrder[] = JSON.parse(script.args[0] as string);

	for (let i = 0; i < results.length; i++) {
		const member = args[i].member as string;
		const equipment = args[i].equipment as string;
		const cost = getGangEquipmentCost(equipment);
		const type = getGangEquipmentType(equipment);
		if (results[i]) {
			gangData.currentFunds -= cost;
			logger.log(`Purchased ${type}: ${equipment} for gang member ${member}`, { type: MessageType.info });
		} else {
			logger.log(`Failed to purchase ${type}: ${equipment} for gang member ${member}`, { type: MessageType.fail });
		}
	}
}

/*
 * ------------------------
 * > GANG CLASH ACTIVATION FUNCTION
 * ------------------------
*/

/**
 * Set gang clash state.
 * @param ns NS object parameter.
 */
async function setGangClashState(ns : NS) : Promise<boolean> {
	const state = gangNames.filter((gang) => gang !== gangData.gangInfo.faction && getGangTerritory(gang) > 0).every((gang) => getGangClashChance(gang) >= 0.55);
	await runDodgerScript(ns, "/gangs/dodger/setTerritoryWarfare.js", state);
	return state;
}

/*
 * ------------------------
 * > GANG TERRITORY TICK MANIPULATION FUNCTIONS
 * ------------------------
*/

/**
 * Test if a power task should be assigned.
 * @returns True if a power task should be assigned; false otherwise.
 */
 function shouldPerformPowerTickManipulation() : boolean {
	return (
		gangData.gangInfo.power < 15000 ||
		gangNames.filter((gang) => gang !== gangData.gangInfo.faction && getGangTerritory(gang) > 0).some((gang) => getGangClashChance(gang) < 0.85)
	);
}

/**
 * Wait until the next Gang power/territory tick threshold (~10% before the tick occurs).
 * @param ns NS object parameter.
 */
async function waitUntilNextPowerTickThreshold(ns : NS) : Promise<void> {
	const sleepTime = gangData.nextPowerTick - performance.now();
	await ns.asleep(sleepTime);
}

/**
 * Switch all gang members to the Territory Warfare task.
 * @param ns NS object parameter.
 */
async function switchAllToTerritoryWarefare(ns : NS, onlyHighDef : boolean) : Promise<void> {
	const taskAssigns : IGangTaskAssign[] = [];

	gangData.members.filter((member) => ((onlyHighDef || gangData.gangInfo.territoryClashChance > 0) ? member.def >= 1500 : true))
	.forEach((member) =>
		taskAssigns.push({ member: member.name, task: GangSpecialTasks.PowerGain })
	);

	const script = { script: "/gangs/dodger/setMemberTask-bulk.js", args: [JSON.stringify(taskAssigns)] };

	await runDodgerScript<boolean[]>(ns, script.script, ...script.args);

	logger.log(`Swapping all Gang Members to ${GangSpecialTasks.PowerGain}`, { type: MessageType.info });
}

/**
 * Wait until the next Gang power/territory tick occurs.
 * @param ns NS object parameter.
 */
async function waitForPowerTick(ns : NS) : Promise<void> {
	while (true) {
		let newPower = await runDodgerScript<IOtherGangData[]>(ns, "/gangs/dodger/getOtherGangInformation.js");
		if (gangData.otherGangInfo.some((gang) => gang.power !== newPower.find((oGang) => oGang.name === gang.name)?.power)) {
			break;
		} else {
			await ns.asleep(ns.gang.getBonusTime() > 1000 ? 25 : 250);
		}
	}

	gangData.nextPowerTick = performance.now() + (ns.gang.getBonusTime() > 10 ? 500 : 18000);
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "GANG", "Gang Management Daemon");

    // Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
	wildSpending = flags["wild"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`Gang Management Daemon Helper\n`+
			`Description:\n` +
			`   Tired of being a crime lord? Have this wonderful script manage your peons for you!.\n` +
			`Usage:\n` +
			`   run /gangs/gang-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help    : boolean |>> Prints this.\n` +
			`   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   	  --wild    : boolean |>> Enables spending money on upgrades as soon as they can be afforded.`
		);

		return;
	}

	await setupEnvironment(ns);
	logger.log("Waiting for next Power Tick...", { type: MessageType.info });
	await waitForPowerTick(ns);

	logger.initialisedMessage(true, false);

	while (true) {
		await updateGangData(ns);
		await tryRecruitMembers(ns);
		await tryAscendMembers(ns);
		await tryPurchaseEquipment(ns);
		await tryAssignTasks(ns);
		const setClash = await setGangClashState(ns);

		if (shouldPerformPowerTickManipulation()) {
			await waitUntilNextPowerTickThreshold(ns);
			await switchAllToTerritoryWarefare(ns, setClash);
			await waitForPowerTick(ns);
		} else {
			await ns.asleep(refreshPeriod)
		}
	}
}
