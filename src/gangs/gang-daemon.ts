import { BitNodeMultipliers, GangGenInfo, GangMemberAscension, GangMemberInfo, GangOtherInfoObject, GangTaskStats, NS } from "@ns";
import { MessageType, ScriptLogger } from "/libraries/script-logger.js";
import { PortNumber, purgePort, writeToPort } from "/libraries/port-handler.js";
import { gangMemberNames, gangNames, GangSpecialTasks, IGangData, IGangEquipment } from "/gangs/gang-data";
import { genPlayer, IPlayerObject } from "/libraries/player-factory";
import { readBitnodeMultiplierData } from "/data/read-bitnodemult-data";
import { runDodgerScript } from "/helpers/dodger-helper";
import { calculateMoneyGain, calculateRespectGain, calculateWantedLevelGain, calculateXpGain } from "/helpers/gang-helper";

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
    ["wild", false],
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
let player: IPlayerObject;

/** Bitnode Multpliers */
let multipliers: BitNodeMultipliers;

/** Gang state data object */
let gangData: IGangData;

/* Gang task list. */
let taskInfo: GangTaskStats[];

/* Gang equipment names. */
let equipmentNames: string[];

/* Gang equipment information. */
const gangEquipmentInfo: Record<string, IGangEquipment> = {};

/* Gang member ascension results. */
const gangAscensionResults: Record<string, GangMemberAscension | undefined> = {};

/** Proportion of generated funds to go back into upgrading gang members. */
const profitRatioForUpgrades = 0.9;

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
    const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/inGang.js");
    return result || ((player.karma <= -54000 || player.bitnodeN === 2) && tryJoinGang(ns));
}

/**
 * Try to join a gang.
 * @param ns NS object parameter.
 */
async function tryJoinGang(ns: NS): Promise<boolean> {
    if (player.factions.joinedFactions.includes("Speakers For The Dead")) {
        return runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Speakers For The Dead");
    } else if (player.factions.joinedFactions.includes("Slum Snakes")) {
        return runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Slum Snakes");
    } else {
        const factionInvites = await runDodgerScript<string[]>(ns, "/singularity/dodger/checkFactionInvitations.js");
        if (factionInvites.includes("Slum Snakes")) {
            const factionJoinResult = await runDodgerScript<boolean>(ns, "/singularity/dodger/joinFaction.js", "Slum Snakes");
            return factionJoinResult && runDodgerScript<boolean>(ns, "/gangs/dodger/createGang.js", "Slum Snakes");
        } else {
            return false;
        }
    }
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
    multipliers = await readBitnodeMultiplierData(ns);

    const gangInfo = await runDodgerScript<GangGenInfo>(ns, "/gangs/dodger/getGangInformation.js");
    const taskNames = await runDodgerScript<string[]>(ns, "/gangs/dodger/getTaskNames.js");
    equipmentNames = await runDodgerScript<string[]>(ns, "/gangs/dodger/getEquipmentNames.js");

    gangData = {
        gangInfo: gangInfo,
        otherGangInfo: {},
        members: [],
        nextPowerTick: 0,
        lastUpdate: performance.now(),
        currentFunds: 0,
        refreshPeriod: refreshPeriod,
    };

    taskInfo = await runDodgerScript<GangTaskStats[]>(ns, "/gangs/dodger/getTaskStats-bulk.js", taskNames);
    const equipmentTypes = await runDodgerScript<string[]>(ns, "/gangs/dodger/getEquipmentType-bulk.js", equipmentNames);

    for (let i = 0; i < equipmentNames.length; i++) {
        gangEquipmentInfo[equipmentNames[i]] = { cost: 0, type: equipmentTypes[i] };
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

    const mult = ns.gang.getBonusTime() >= 10 ? 10 : 1;
    const moneyGained = mult * (gangData.gangInfo.moneyGainRate * 5) * ((performance.now() - gangData.lastUpdate) / 1000);
    gangData.currentFunds += profitRatioForUpgrades * moneyGained;

    const memberNames = await runDodgerScript<string[]>(ns, "/gangs/dodger/getMemberNames.js");

    gangData.gangInfo = await runDodgerScript<GangGenInfo>(ns, "/gangs/dodger/getGangInformation.js");
    gangData.members = await runDodgerScript<GangMemberInfo[]>(ns, "/gangs/dodger/getMemberInformation-bulk.js", memberNames);

    const powerAndTerritory = await runDodgerScript<GangOtherInfoObject[]>(ns, "/gangs/dodger/getOtherGangInformation-bulk.js", gangNames);
    const clashChances = await runDodgerScript<number[]>(ns, "/gangs/dodger/getChanceToWinClash-bulk.js", gangNames);

    for (let i = 0; i < gangNames.length; i++) {
        gangData.otherGangInfo[gangNames[i]] = { power: powerAndTerritory[i].power, territory: powerAndTerritory[i].territory, clashChance: clashChances[i] };
    }

    const equipmentCosts = await runDodgerScript<number[]>(ns, "/gangs/dodger/getEquipmentCost-bulk.js", equipmentNames);

    for (let i = 0; i < equipmentNames.length; i++) {
        gangEquipmentInfo[equipmentNames[i]].cost = equipmentCosts[i];
    }

    const ascensionResults = await runDodgerScript<(GangMemberAscension | undefined)[]>(ns, "/gangs/dodger/getAscensionResult-bulk.js", memberNames);

    for (let i = 0; i < gangNames.length; i++) {
        gangAscensionResults[memberNames[i]] = ascensionResults[i];
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
    logger.log("Performing script functions...", { type: MessageType.debugLow });
    await tryRecruitMembers(ns);
    await tryAscendMembers(ns);
    await tryPurchaseEquipment(ns);
    await tryAssignTasks(ns);
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
async function tryRecruitMembers(ns: NS): Promise<void> {
    const canRecruit = await runDodgerScript<boolean>(ns, "/gangs/dodger/canRecruitMember.js");
    if (canRecruit) await tryRecruitGangMember(ns);
}

/**
 * Try to recruit a new member.
 * @param ns NS object parameter.
 * @returns True if a new member was recruited; false otherwise.
 */
async function tryRecruitGangMember(ns: NS): Promise<boolean> {
    const name = getGangMemberName();
    const result = await runDodgerScript<boolean>(ns, "/gangs/dodger/recruitMember.js", name);
    if (result) {
        logger.log(`Recruited new gang member: ${name}`, { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to recruit new gang member`, { type: MessageType.fail, sendToast: true });
    }
    return result;
}

/**
 * Construct and return a random name.
 * @returns A random name.
 * */
function getGangMemberName(): string {
    const currentNames = gangData.members.map((m) => m.name);
    return gangMemberNames.filter((name) => !currentNames.includes(name))[0];
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
async function tryAscendMembers(ns: NS): Promise<void> {
    const membersToAscend = gangData.members.filter((member) => shouldAscendMember(member)).map((member) => member.name);

    if (membersToAscend.length > 0) {
        const results = await runDodgerScript<boolean[]>(ns, "/gangs/dodger/ascendMember-bulk.js", membersToAscend);

        for (let i = 0; i < results.length; i++) {
            if (results[i]) {
                logger.log(`Ascended gang member ${membersToAscend[i]}`, { type: MessageType.success, sendToast: true });
            } else {
                logger.log(`Failed to ascend gang member ${membersToAscend[i]}`, { type: MessageType.fail, sendToast: true });
            }
        }
    }
}

/**
 * Test if a given gang member should be ascended.
 * @param member Gang member.
 * @returns True if the gang member should be ascended; false otherwise.
 */
function shouldAscendMember(member: GangMemberInfo): boolean {
    const ascendResult = gangAscensionResults[member.name];
    if (!ascendResult) return false;

    if (gangData.gangInfo.isHacking) {
        const avgAscMult = (member.cha_asc_mult + member.hack_asc_mult) / 2;
        const ascMin = Math.max(1.1, 1.6 - Math.sqrt(avgAscMult / 200));
        return ascendResult.cha > ascMin && ascendResult.hack > ascMin;
    } else {
        const avgAscMult = (member.cha_asc_mult + member.def_asc_mult + member.dex_asc_mult + member.str_asc_mult) / 4;
        const ascMin = Math.max(1.1, 1.6 - Math.sqrt(avgAscMult / 200));
        return ascendResult.cha > ascMin && ascendResult.def > ascMin && ascendResult.dex > ascMin && ascendResult.str > ascMin;
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
async function tryAssignTasks(ns: NS): Promise<void> {
    const taskAssigns = getMemberTasksToAssign();
    if (taskAssigns.length > 0) {
        const result = await runDodgerScript<boolean[]>(ns, "/gangs/dodger/setMemberTask-bulk.js", taskAssigns);

        for (let i = 0; i < result.length; i++) {
            if (result[i]) {
                logger.log(`Set member ${taskAssigns[i][0]} to task ${taskAssigns[i][1]}`, { type: MessageType.info });
            } else {
                logger.log(`Failed to set member ${taskAssigns[i][0]} to task ${taskAssigns[i][1]}`, { type: MessageType.fail });
            }
        }
    }
}

/**
 * Generate a script that will assign tasks.
 * @returns Script to run to assign tasks to gang members.
 */
function getMemberTasksToAssign(): [string, string][] {
    const taskAssigns: [string, string][] = [];

    gangData.members.forEach((member) => {
        const task = getTaskToAssign(member);
        if (member.task === task) {
            logger.log(`Member ${member.name} is already performing task: ${task}`, { type: MessageType.debugLow });
        } else {
            taskAssigns.push([member.name, task]);
        }
    });

    return taskAssigns;
}

/**
 * Try to assign a task to a given gang member.
 * @param member Gang member.
 * @returns True if the given task was successfully assigned; false otherwise.
 */
function getTaskToAssign(member: GangMemberInfo): string {
    if (shouldAssignTrainHacking(member)) return GangSpecialTasks.TrainHacking;
    else if (shouldAssignTrainCharisma(member)) return GangSpecialTasks.TrainCharisma;
    else if (shouldAssignTrainCombat(member)) return GangSpecialTasks.TrainCombat;
    else if (shouldAssignReduceWanted()) return GangSpecialTasks.ReduceWantedLevel;
    else return getBestTask(member);
}

/**
 * Test if train hacking task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train hacking should be assigned; false otherwise.
 */
function shouldAssignTrainHacking(member: GangMemberInfo): boolean {
    return member.hack < 20;
}

/**
 * Test if train charisma task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train charisma should be assigned; false otherwise.
 */
function shouldAssignTrainCharisma(member: GangMemberInfo): boolean {
    return member.cha < 20;
}

/**
 * Test if train combat task should be assigned to this gang member.
 * @param member Gang member.
 * @returns True if train combat should be assigned; false otherwise.
 */
function shouldAssignTrainCombat(member: GangMemberInfo): boolean {
    return member.agi < 20 || member.def < 20 || member.dex < 20 || member.str < 20;
}

/**
 * Test if the reduce wanted task should be assigned to this gang member.
 * @returns True if the reduce wanted task should be assigned; false otherwise.
 */
function shouldAssignReduceWanted(): boolean {
    return gangData.gangInfo.wantedLevel > 100 && gangData.gangInfo.wantedPenalty < 0.8;
}

/**
 * Decide which task is best for a member to perform given the current gang state.
 * @param member Gang member.
 * @returns Name of best task to perform for a given gang member.
 */
function getBestTask(member: GangMemberInfo): string {
    if (shouldAssignXpTask(member)) return getBestXpTask(member);
    else if (shouldAssignRespectTask(member)) return getBestRespectTask(member);
    else return getBestMoneyTask(member);
}

/**
 * Test if a power task should be assigned.
 * @param member Gang member.
 * @returns True if a power task should be assigned; false otherwise.
 */
function shouldAssignXpTask(member: GangMemberInfo): boolean {
    return member.def < 1500;
}

/**
 * Test if a respect task should be assigned.
 * @returns True if a respect task should be assigned; false otherwise.
 */
function shouldAssignRespectTask(member: GangMemberInfo): boolean {
    return member.earnedRespect < 1e7 || gangData.members.length < 12 || getDiscount() < 1.67 || player.money >= 1e12;
}

/**
 * Calculate the gang equipment discount multiplier.
 * @returns Discount multiplier for gang equipment.
 */
function getDiscount(): number {
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
function getBestXpTask(member: GangMemberInfo): string {
    const possibleTasks = taskInfo
        .filter(
            (task) =>
                (task.isHacking && gangData.gangInfo.isHacking) ||
                (task.isCombat &&
                    !gangData.gangInfo.isHacking &&
                    calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2 &&
                    task.defWeight > 0)
        )
        .sort((a, b) => calculateXpGain(member, b) - calculateXpGain(member, a));

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
function getBestRespectTask(member: GangMemberInfo): string {
    const possibleTasks = taskInfo
        .filter(
            (task) =>
                ((task.isHacking && gangData.gangInfo.isHacking) || (task.isCombat && !gangData.gangInfo.isHacking)) &&
                calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2
        )
        .sort((a, b) => calculateRespectGain(gangData.gangInfo, member, b, multipliers) - calculateRespectGain(gangData.gangInfo, member, a, multipliers));

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
function getBestMoneyTask(member: GangMemberInfo): string {
    const possibleTasks = taskInfo
        .filter(
            (task) =>
                ((task.isHacking && gangData.gangInfo.isHacking) || (task.isCombat && !gangData.gangInfo.isHacking)) &&
                calculateRespectGain(gangData.gangInfo, member, task, multipliers) > calculateWantedLevelGain(gangData.gangInfo, member, task) * 2
        )
        .sort((a, b) => calculateMoneyGain(gangData.gangInfo, member, b, multipliers) - calculateMoneyGain(gangData.gangInfo, member, a, multipliers));

    if (possibleTasks.length > 0) {
        return possibleTasks[0].name;
    } else {
        throw new Error(`Could not find a money task to assign to member: ${member.name}`);
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
async function tryPurchaseEquipment(ns: NS): Promise<void> {
    const equipmentOrders = generateEquipmentOrders();
    if (equipmentOrders.length > 0) {
        const result = await runDodgerScript<boolean[][]>(ns, "/gangs/dodger/purchaseEquipment-bulk.js", equipmentOrders);

        for (let i = 0; i < result.length; i++) {
            const member = equipmentOrders[i][0];

            for (let j = 0; j < result[i].length; j++) {
                const equipment = equipmentOrders[i][1][j];
                const cost = gangEquipmentInfo[equipment].cost;
                const type = gangEquipmentInfo[equipment].type;

                if (result[i][j]) {
                    gangData.currentFunds -= cost;
                    logger.log(`Purchased ${type}: ${equipment} for gang member ${member}`, { type: MessageType.info });
                } else {
                    logger.log(`Failed to purchase ${type}: ${equipment} for gang member ${member}`, { type: MessageType.fail });
                }
            }
        }
    }
}

/**
 * Generate a script that will purchase equipment.
 * @returns Script to run to purchase equipment to gang members.
 */
function generateEquipmentOrders(): [string, string[]][] {
    const equipmentOrders: [string, string[]][] = [];

    let cumulativeCost = 0;

    gangData.members.forEach((member) => {
        const unownedEquipment = equipmentNames.filter((equipment) => ![...member.upgrades, ...member.augmentations].includes(equipment));
        const equipmentToPurchase: string[] = [];

        unownedEquipment.forEach((equipment) => {
            const cost = gangEquipmentInfo[equipment].cost;
            if (canPurchaseEquipment(cumulativeCost + cost)) {
                equipmentToPurchase.push(equipment);
                cumulativeCost += cost;
            }
        });

        if (equipmentToPurchase.length > 0) {
            equipmentOrders.push([member.name, equipmentToPurchase]);
        }
    });

    return equipmentOrders;
}

/**
 * Test if a given piece of equipment can be purchased.
 * @param cost Gang equipment cost.
 * @returns True if the equipment can be purchased, false otherwise.
 */
function canPurchaseEquipment(cost: number): boolean {
    return player.money >= cost && (wildSpending ? player.money - cost >= 100e9 : gangData.currentFunds >= cost);
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
async function setGangClashState(ns: NS): Promise<boolean> {
    const state = gangNames
        .filter((gang) => gang !== gangData.gangInfo.faction && gangData.otherGangInfo[gang].territory > 0)
        .every((gang) => gangData.otherGangInfo[gang].clashChance >= 0.55);
    await runDodgerScript(ns, "/gangs/dodger/setTerritoryWarfare.js", state);
    console.log(state);
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
function shouldPerformPowerTickManipulation(): boolean {
    return (
        gangData.gangInfo.power < 15000 ||
        gangNames.filter((gang) => gang !== gangData.gangInfo.faction && gangData.otherGangInfo[gang].territory > 0).some((gang) => gangData.otherGangInfo[gang].clashChance < 0.85)
    );
}

/**
 * Wait until the next Gang power/territory tick threshold (~10% before the tick occurs).
 * @param ns NS object parameter.
 */
async function waitUntilNextPowerTickThreshold(ns: NS): Promise<void> {
    const sleepTime = Math.max(0, gangData.nextPowerTick - performance.now());
    await ns.asleep(sleepTime);
}

/**
 * Switch all gang members to the Territory Warfare task.
 * @param ns NS object parameter.
 */
async function switchAllToTerritoryWarefare(ns: NS, onlyHighDef: boolean): Promise<void> {
    const taskAssigns: [string, string][] = [];

    gangData.members
        .filter((member) => (onlyHighDef || gangData.gangInfo.territoryClashChance > 0 ? member.def >= 1500 : true))
        .forEach((member) => taskAssigns.push([member.name, GangSpecialTasks.PowerGain]));

    const script = { script: "/gangs/dodger/setMemberTask-bulk.js", args: [taskAssigns] };

    await runDodgerScript<boolean[]>(ns, script.script, ...script.args);

    logger.log(`Swapping all Gang Members to ${GangSpecialTasks.PowerGain}`, { type: MessageType.info });
}

/**
 * Wait until the next Gang power/territory tick occurs.
 * @param ns NS object parameter.
 */
async function waitForPowerTick(ns: NS): Promise<void> {
    while (true) {
        const newPower = await runDodgerScript<GangOtherInfoObject[]>(ns, "/gangs/dodger/getOtherGangInformation-bulk.js", gangNames);

        const powerful: Record<string, GangOtherInfoObject> = {};
        for (let i = 0; i < gangNames.length; i++) {
            powerful[gangNames[i]] = newPower[i];
        }

        if (Object.keys(gangData.otherGangInfo).some((gang) => gangData.otherGangInfo[gang].power !== powerful[gang].power)) {
            break;
        } else {
            await ns.asleep(ns.gang.getBonusTime() > 1000 ? 25 : 250);
        }
    }

    gangData.nextPowerTick = performance.now() + (ns.gang.getBonusTime() > 10 ? 500 : 18000);
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

    gangData.lastUpdate = performance.now();
    purgePort(ns, PortNumber.GangData);
    await writeToPort<IGangData>(ns, PortNumber.GangData, gangData);
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

    const setClash = await setGangClashState(ns);

    if (shouldPerformPowerTickManipulation()) {
        await waitUntilNextPowerTickThreshold(ns);
        await switchAllToTerritoryWarefare(ns, setClash);
        await waitForPowerTick(ns);
    } else {
        await ns.asleep(refreshPeriod);
    }
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
 */

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "GANG", "Gang Management Daemon");
    player = genPlayer(ns);

    // Parse flags
    const flags = ns.flags(flagSchema);
    help = flags.h || flags["help"];
    verbose = flags.v || flags["verbose"];
    debug = flags.d || flags["debug"];
    wildSpending = flags["wild"];

    if (verbose) logger.setLogLevel(2);
    if (debug) logger.setLogLevel(3);

    // Helper output
    if (help) {
        ns.tprintf(
            "%s",
            `Gang Management Daemon Helper\n` +
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
