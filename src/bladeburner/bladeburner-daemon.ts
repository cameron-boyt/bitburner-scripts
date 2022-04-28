import { BladeburnerCurAction, NS } from "@ns";
import { IBladeburnerData, IBladeburnerActionInfo, IBladeburnerAction, BladeburnerActionType, IBladeburnerCityInfo, IBladeburnerSkillInfo } from "/bladeburner/bladeburner-data";
import { runDodgerScript } from "/helpers/dodger-helper";
import { CITIES } from "/libraries/constants";
import { PortNumber, purgePort, writeToPort } from "../helpers/port-helper";
import { MessageType, ScriptLogger } from "/libraries/script-logger.js";

// Script logger
let logger: ScriptLogger;

// Script refresh period
const refreshPeriod = 8000;

// Flags
const flagSchema: [string, string | number | boolean | string[]][] = [
    ["h", false],
    ["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false],
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

/*
 * > SCRIPT VARIABLES <
 */

/** Bladeburner data tracking object */
let bladeburnerData: IBladeburnerData;

/** Names of Bladeburner skills. */
let skillNames: string[] = [];

/** Names of all Bladeburner tasks. */
const bladeburnerActions: IBladeburnerAction[] = [];

/** Bladeburner action information. */
const bladeburnerActionInfo: Record<string, IBladeburnerActionInfo> = {};

/** Rank required for each blackop task. */
const blackOpRankRequirements: Record<string, number> = {};

/** Bladeburner city information. */
const bladeburnerCityInfo: Record<string, IBladeburnerCityInfo> = {};

/** Bladeburner skill limits and cost multipliers. */
const bladeburnerSkillInfo: Record<string, IBladeburnerSkillInfo> = {
    "Blade's Intuition": { cost: 0, limit: Infinity, costMult: 2 },
    "Cloak": { cost: 0, limit: 25, costMult: 1 },
    "Short-Circuit": { cost: 0, limit: 25, costMult: 1 },
    "Digital Observer": { cost: 0, limit: Infinity, costMult: 2 },
    "Tracer": { cost: 0, limit: 5, costMult: 1 },
    "Overclock": { cost: 0, limit: 90, costMult: 1 },
    "Reaper": { cost: 0, limit: Infinity, costMult: 2 },
    "Evasive System": { cost: 0, limit: Infinity, costMult: 2 },
    "Datamancer": { cost: 0, limit: 10, costMult: 15 },
    "Cyber's Edge": { cost: 0, limit: 10, costMult: 150 },
    "Hands of Midas": { cost: 0, limit: 10, costMult: 150 },
    "Hyperdrive": { cost: 0, limit: Infinity, costMult: 255 },
};


/*
 * ------------------------
 * > ARGUMENT AND FLAG PARSING FUNCTIONS
 * ------------------------
 */

/**
 * Parse script flags.
 * @param ns NS object.
 */
async function parseFlags(ns: NS): Promise<void> {
    const flags = ns.flags(flagSchema);
    help = flags.h || flags["help"];
    verbose = flags.v || flags["verbose"];
    debug = flags.d || flags["debug"];

    if (verbose) logger.setLogLevel(2);
    if (debug) logger.setLogLevel(3);
}

/*
 * ------------------------
 * > SCRIPT RUN TEST FUNCTIONS
 * ------------------------
 */

/**
 * Test if this script can/should be run.
 * @param ns NS object.
 * @returns True if the script can be run; false otherwise.
 */
async function canRunScript(ns: NS): Promise<boolean> {
    if (hasBladeburnerStats(ns)) {
        const joinBladeburnerResult = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/joinBladeburnerDivision.js");
        if (joinBladeburnerResult) {
            logger.log("Successfully joined, or are already a member of, the Bladeburner Division", {
                type: MessageType.success,
            });
        } else {
            logger.log("Failed to join the Bladeburner Division", { type: MessageType.fail });
        }

        return joinBladeburnerResult;
    } else {
        logger.log("Insufficient stats to join the Bladeburners. Require 100 in Agility, Defence, Dexterity and Strength.", {
            type: MessageType.fail,
            sendToast: true,
        });

        return false;
    }
}

/**
 * Test if the player has the stats required to join Bladeburners.
 * @returns True if the Bladeburner stat requirements are met; false otherwise.
 */
function hasBladeburnerStats(ns: NS): boolean {
    const player = ns.getPlayer();
    return player.agility >= 100 && player.defense >= 100 && player.dexterity >= 100 && player.strength >= 100;
}

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
 */

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
async function setupEnvironment(ns: NS): Promise<void> {
    bladeburnerData = {
        rank: 0,
        stamina: [0, 0],
        currentCity: "",
        currentAction: "",
        skillPoints: 0,
        skills: {},
        lastUpdate: 0,
        refreshPeriod: refreshPeriod,
    };

    const generalNames = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/getGeneralActionNames.js");
    const contractNames = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/getContractNames.js");
    const operationNames = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/getOperationNames.js");
    const blackOpNames = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/getBlackOpNames.js");

    generalNames.forEach((action) => bladeburnerActions.push({ name: action, type: BladeburnerActionType.General }));
    contractNames.forEach((action) => bladeburnerActions.push({ name: action, type: BladeburnerActionType.Contract }));
    operationNames.forEach((action) => bladeburnerActions.push({ name: action, type: BladeburnerActionType.Operation }));
    blackOpNames.forEach((action) => bladeburnerActions.push({ name: action, type: BladeburnerActionType.BlackOp }));

    skillNames = await runDodgerScript<string[]>(ns, "/bladeburner/dodger/getSkillNames.js");

    const blackOpRanks = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getBlackOpRank-bulk.js", blackOpNames);

    for (let i = 0; i < blackOpNames.length; i++) {
        blackOpRankRequirements[blackOpNames[i]] = blackOpRanks[i];
    }
}

/*
 * ------------------------
 * > DATA UPDATE FUNCTIONS
 * ------------------------
 */

/**
 * Update cycle data for the script.
 * @param ns NS object.
 */
async function updateData(ns: NS): Promise<void> {
    logger.log("Updating data...", { type: MessageType.debugLow });

    const highestLevel = Object.keys(bladeburnerActionInfo).length === 0 ? 1 : Object.values(bladeburnerActionInfo).sort((a, b) => b.currentLevel - a.currentLevel)[0].currentLevel;

    const actionsAutolevel = await runDodgerScript<boolean[]>(ns, "/bladeburner/dodger/getActionAutolevel-bulk.js", bladeburnerActions);
    const actionsCountRemaining = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getActionCountRemaining-bulk.js", bladeburnerActions);
    const actionsCurrentLevel = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getActionCurrentLevel-bulk.js", bladeburnerActions);
    const actionsEstimatedSuccessChance = await runDodgerScript<[number, number][]>(ns, "/bladeburner/dodger/getActionEstimatedSuccessChance-bulk.js", bladeburnerActions);
    const actionsMaxLevel = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getActionMaxLevel-bulk.js", bladeburnerActions);
    const actionsRepGain = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getActionRepGain-bulk.js", bladeburnerActions, highestLevel);
    const actionsTime = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getActionTime-bulk.js", bladeburnerActions);

    for (let i = 0; i < bladeburnerActions.length; i++) {
        bladeburnerActionInfo[bladeburnerActions[i].name] = {
            type: bladeburnerActions[i].type,
            autolevel: actionsAutolevel[i],
            countRemaining: actionsCountRemaining[i],
            currentLevel: actionsCurrentLevel[i],
            estimatedSuccessChance: actionsEstimatedSuccessChance[i],
            maxLevel: actionsMaxLevel[i],
            repGain: actionsRepGain[i],
            actionTime: actionsTime[i],
        };
    }

    const cityPopulation = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getCityEstimatedPopulation-bulk.js", CITIES);
    const cityChaos = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getCityChaos-bulk.js", CITIES);

    for (let i = 0; i < CITIES.length; i++) {
        bladeburnerCityInfo[CITIES[i]] = {
            population: cityPopulation[i],
            chaos: cityChaos[i],
        };
    }

    const skillCosts = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getSkillUpgradeCost-bulk.js", skillNames);

    for (let i = 0; i < skillNames.length; i++) {
        bladeburnerSkillInfo[skillNames[i]].cost = skillCosts[i];
    }

    bladeburnerData.rank = await runDodgerScript<number>(ns, "/bladeburner/dodger/getRank.js");
    bladeburnerData.stamina = await runDodgerScript<[number, number]>(ns, "/bladeburner/dodger/getStamina.js");
    bladeburnerData.currentCity = await runDodgerScript<string>(ns, "/bladeburner/dodger/getCity.js");
    bladeburnerData.currentAction = (await runDodgerScript<BladeburnerCurAction>(ns, "/bladeburner/dodger/getCurrentAction.js")).name;
    bladeburnerData.skillPoints = await runDodgerScript<number>(ns, "/bladeburner/dodger/getSkillPoints.js");

    const skillLevels = await runDodgerScript<number[]>(ns, "/bladeburner/dodger/getSkillLevel-bulk.js", skillNames);

    for (let i = 0; i < skillNames.length; i++) {
        bladeburnerData.skills[skillNames[i]] = skillLevels[i];
    }
}

/*
 * ------------------------
 * > DO SCRIPT PROCESSING FUNCTIONS
 * ------------------------
 */

/**
 * Execute the funtionality of this script.
 * @param ns NS object.
 */
async function doScriptFunctions(ns: NS): Promise<void> {
    await checkCitySwitch(ns);
    await tryUpgradeBladeburnerSkills(ns);
    await doBladeburnerAction(ns);
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
async function checkCitySwitch(ns: NS): Promise<void> {
    if (bladeburnerCityInfo[bladeburnerData.currentCity].population < 500e6) {
        await trySwitchCity(ns);
    }
}

/**
 * Try to perform a Bladeburner city switch.
 * @param ns NS object parameter.
 */
async function trySwitchCity(ns: NS): Promise<void> {
    for (const city of Object.keys(bladeburnerCityInfo).sort((a, b) => bladeburnerCityInfo[b].population - bladeburnerCityInfo[a].population)) {
        if (bladeburnerCityInfo[city].population < 500e6) continue;
        const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/switchCity.js", city);
        if (result) {
            logger.log(`Bladeburner Agent travelled to city: ${city}`, { type: MessageType.info });
        } else {
            logger.log(`Bladeburner Agent failed to travel to city: ${city}`, { type: MessageType.fail });
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
async function tryUpgradeBladeburnerSkills(ns: NS): Promise<void> {
    logger.log("Trying to buy any available upgrades", { type: MessageType.debugLow });
    const skillsToUpgrade = Object.keys(bladeburnerSkillInfo)
        .filter((skill) => canUpgradeSkill(skill))
        .sort((a, b) => bladeburnerSkillInfo[a].cost * bladeburnerSkillInfo[a].costMult - bladeburnerSkillInfo[b].cost * bladeburnerSkillInfo[b].costMult);

    if (skillsToUpgrade.length > 0) {
        const skillUpgrade = skillsToUpgrade[0];
        await doUpgradeSkill(ns, skillUpgrade);
    }
}

/**
 * Test if a given skill can be upgraded.
 * @param skillName Skill name.
 * @returns True if the skill can be upgraded; false otherwise.
 */
function canUpgradeSkill(skillName: string): boolean {
    logger.log(`Testing if upgrade ${skillName} can be upgraded`, { type: MessageType.debugHigh });
    return (
        bladeburnerData.skills[skillName] < bladeburnerSkillInfo[skillName].limit &&
        bladeburnerData.skillPoints >= bladeburnerSkillInfo[skillName].cost &&
        (skillName === "Overclock" ? bladeburnerActionInfo["Assassination"].estimatedSuccessChance[0] >= 0.5 : true)
    );
}

/**
 * Buy a given skill upgrade.
 * @param ns NS object parameter.
 * @param skillName Skill name.
 * @returns True if the skill upgrade was purchased; false otherwise.
 */
async function doUpgradeSkill(ns: NS, skillName: string): Promise<boolean> {
    logger.log(`Trying to upgrade skill: ${skillName}`, { type: MessageType.debugHigh });
    const oldLevel = bladeburnerData.skills[skillName];

    const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/upgradeSkill.js", skillName);
    if (result) {
        logger.log(`Upgraded Bladeburner Skill: ${skillName} (${oldLevel} --> ${oldLevel + 1})`, {
            type: MessageType.success,
            sendToast: true,
        });
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
async function doBladeburnerAction(ns: NS): Promise<void> {
    logger.log("Determining best action to perform", { type: MessageType.debugLow });
    if (testDoActionRecovery()) await doActionRecovery(ns);
    else if (testDoActionAnalysis()) await doActionAnalysis(ns);
    else if (testDoActionDiplomacy()) await doActionDiplomacy(ns);
    else if (testDoActionBlackOps()) await doActionBlackOps(ns);
    else await doActionBestAction(ns);
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
function testDoActionRecovery(): boolean {
    logger.log("Testing if recovery is the correct action", { type: MessageType.debugLow });
    return bladeburnerData.currentAction === "Hyperbolic Regeneration Chamber"
        ? bladeburnerData.stamina[0] <= bladeburnerData.stamina[1] * 0.9
        : bladeburnerData.stamina[0] <= bladeburnerData.stamina[1] / 2;
}

/**
 * Determines whether performing an analysis action is correct.
 * @returns True if an analysis action is the correct action to take.
 */
function testDoActionAnalysis(): boolean {
    logger.log("Testing if analysis is the correct action", { type: MessageType.debugLow });
    return Object.keys(bladeburnerActionInfo).some(
        (action) => bladeburnerActionInfo[action].estimatedSuccessChance[1] - bladeburnerActionInfo[action].estimatedSuccessChance[0] > 0.25
    );
}

/**
 * Determines whether performing the 'Diplomacy' action is correct.
 * @returns True if 'Diplomacy' is the correct action to take.
 */
function testDoActionDiplomacy(): boolean {
    logger.log("Testing if 'Diplomacy' is the correct action", { type: MessageType.debugLow });
    return bladeburnerData.currentAction === "Diplomacy"
        ? bladeburnerCityInfo[bladeburnerData.currentCity].chaos > 50
        : bladeburnerCityInfo[bladeburnerData.currentCity].chaos >= 100;
}

/**
 * Determines whether performing a BlackOps is correct.
 * @returns True if BlackOps is the correct action to take.
 */
function testDoActionBlackOps(): boolean {
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
function getNextBlackOp(): string | undefined {
    logger.log("Getting name of next BlackOp", { type: MessageType.debugHigh });
    for (const op of Object.keys(bladeburnerActionInfo).filter((action) => bladeburnerActionInfo[action].type === BladeburnerActionType.BlackOp)) {
        if (bladeburnerActionInfo[op].countRemaining > 0) return op;
    }

    return undefined;
}

/**
 * Determines whether the player is able to attempt the given BlackOp.
 * @param blackOpName BlackOp name.
 * @returns True if the player should do the provided BlackOp.
 */
function testCanActionBlackOp(blackOpName: string): boolean {
    logger.log(`Testing if player can perform BlackOp: ${blackOpName}`, { type: MessageType.debugHigh });
    if (bladeburnerData.rank < blackOpRankRequirements[blackOpName]) return false;
    return bladeburnerActionInfo[blackOpName].estimatedSuccessChance[0] > 0.85;
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
async function doActionAnalysis(ns: NS): Promise<void> {
    logger.log("Performing analysis action.", { type: MessageType.debugHigh });
    if (bladeburnerActionInfo["Undercover Operation"].estimatedSuccessChance[0] >= 0.5 && bladeburnerActionInfo["Undercover Operation"].countRemaining > 0) {
        await tryStartAction(ns, "Undercover Operation");
    } else if (bladeburnerActionInfo["Investigation"].estimatedSuccessChance[0] >= 0.5 && bladeburnerActionInfo["Investigation"].countRemaining > 0) {
        await tryStartAction(ns, "Investigation");
    } else if (bladeburnerActionInfo["Tracking"].estimatedSuccessChance[0] >= 0.5 && bladeburnerActionInfo["Tracking"].countRemaining > 0) {
        await tryStartAction(ns, "Tracking");
    } else {
        await tryStartAction(ns, "Field Analysis");
    }
}

/**
 * Start the action 'Hyperbolic Regeneration Chamber'.
 * @param ns NS object parameter.
 */
async function doActionRecovery(ns: NS): Promise<void> {
    logger.log("Performing recovery action.", { type: MessageType.debugHigh });
    await tryStartAction(ns, "Hyperbolic Regeneration Chamber");
}

/**
 * Start the action 'Diplomacy'.
 * @param ns NS object parameter.
 */
async function doActionDiplomacy(ns: NS): Promise<void> {
    logger.log("Performing diplomacy action.", { type: MessageType.debugHigh });
    await tryStartAction(ns, "Diplomacy");
}

/**
 * Start the next BlackOps.
 * @param ns NS object parameter.
 */
async function doActionBlackOps(ns: NS): Promise<void> {
    logger.log("Performing next BlackOps operation", { type: MessageType.debugHigh });
    const nextBlackOp = getNextBlackOp();
    if (!nextBlackOp) throw new Error("Was unable to find next BlackOp to perform. Does the BlackOp checker work?");
    await tryStartAction(ns, nextBlackOp);
}

/**
 * Start the current best action.
 * @param ns NS object parameter.
 */
async function doActionBestAction(ns: NS): Promise<void> {
    logger.log("Determining best contract or operation to perform", { type: MessageType.debugHigh });
    const bestAction = getBestAction();
    await tryStartAction(ns, bestAction);
}

/**
 * Get the name of the best contract/operation to perform.
 * @returns Best action or nothing if no action is good enough to be taken.
 */
function getBestAction(): string {
    logger.log("Getting best contract/operation action", { type: MessageType.debugHigh });

    const possibleActions = Object.keys(bladeburnerActionInfo)
        .filter(
            (action) =>
                bladeburnerActionInfo[action].type !== BladeburnerActionType.BlackOp &&
                bladeburnerActionInfo[action].countRemaining > 0 &&
                bladeburnerActionInfo[action].estimatedSuccessChance[0] >= 0.35 &&
                (action === "Raid" ? bladeburnerCityInfo[bladeburnerData.currentCity].population > 750e6 : true)
        )
        .sort(
            (a, b) =>
                (bladeburnerActionInfo[b].repGain * bladeburnerActionInfo[b].estimatedSuccessChance[0]) / bladeburnerActionInfo[b].actionTime -
                (bladeburnerActionInfo[a].repGain * bladeburnerActionInfo[a].estimatedSuccessChance[0]) / bladeburnerActionInfo[a].actionTime
        );

    return possibleActions[0];
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
async function tryStartAction(ns: NS, actionName: string): Promise<void> {
    logger.log(`Trying to start action ${actionName}`, { type: MessageType.debugLow });

    const actionType = bladeburnerActionInfo[actionName].type;
    const currentLevel = bladeburnerActionInfo[actionName].currentLevel;
    const successChance = bladeburnerActionInfo[actionName].estimatedSuccessChance;

    const time = getTrueActionTime(ns, bladeburnerActionInfo[actionName].actionTime);

    if (bladeburnerData.currentAction !== actionName) {
        const result = await runDodgerScript<boolean>(ns, "/bladeburner/dodger/startAction.js", actionType, actionName);
        if (result) {
            logger.log(`Started action: ${actionType} > ${actionName} (Lv${currentLevel} @ ${(successChance[0] * 100).toFixed(0)}%) | ETA: ${time}s`, { type: MessageType.info });
        } else {
            logger.log(`Failed to start action: ${actionName}`, { type: MessageType.fail });
        }
    } else {
        logger.log(`Already performing action: ${actionName}`, { type: MessageType.debugLow });
    }
}

/**
 * Convert bladeburner action time to "true" time in seconds, factoring in bonus time.
 * @param ns NS object parameter.
 * @param time Time in ms.
 * @returns True action time in seconds.
 */
function getTrueActionTime(ns: NS, time: number): number {
    const bonusTime = ns.bladeburner.getBonusTime();
    const bonusTimeModifier = bonusTime > 5000 ? 5 : 1;
    return Math.ceil(time / 1000 / bonusTimeModifier);
}

/*
 * ------------------------
 * > DATA EXPORT FUNCTIONS
 * ------------------------
 */

/**
 * Package and export script data to a port to be used by other scripts.
 * @param ns NS object.
 */
async function exportData(ns: NS): Promise<void> {
    logger.log("Exporting data...", { type: MessageType.debugLow });

    bladeburnerData.lastUpdate = performance.now();

    purgePort(ns, PortNumber.BladeburnerData);
    await writeToPort<IBladeburnerData>(ns, PortNumber.BladeburnerData, bladeburnerData);
}

/*
 * ------------------------
 * > SCRIPT CYCLE WAIT FUNCTIONS
 * ------------------------
 */

/**
 * Wait an amount of time before the script starts its next cycle.
 * @param ns NS object.
 */
async function waitForScriptCycle(ns: NS): Promise<void> {
    logger.log("Waiting for script sleep cycle...", { type: MessageType.debugLow });
    await ns.asleep(refreshPeriod);
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
 */

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "BLADE", "Bladeburner Daemon");

    parseFlags(ns);

    // Helper output
    if (help) {
        ns.tprintf(
            `Bladeburner Daemon Helper:\n` +
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

    if (!(await canRunScript(ns))) {
        logger.log("Conditions to run script are not met; exiting.", { type: MessageType.warning });
        ns.exit();
    }

    await setupEnvironment(ns);

    logger.initialisedMessage(true, false);

    while (true) {
        await updateData(ns);
        await doScriptFunctions(ns);
        await exportData(ns);
        await waitForScriptCycle(ns);
    }
}
