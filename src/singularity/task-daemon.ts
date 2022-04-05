import { NS } from '@ns'
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { genServer, IServerObject } from '/libraries/server-factory';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { IProgramInfo, PROGRAMS } from '/libraries/constants';
import { runDodgerScript } from '/helpers/dodger-helper';

// Script logger
let logger : ScriptLogger;

// Script refresh period
const refreshPeriod = 60000;

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
/** This machine object */
let machine : IServerObject;

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
    machine = genServer(ns, ns.getHostname());
}

/* 
 * ------------------------
 * > HOME RAM UPGRADE FUNCTIONS
 * ------------------------
*/

/**
 * Check if the requirements are met to upgrade home RAM, then if so execute the command.
 * @param ns NS object parameter.
 */
async function tryUpgradeHomeRam(ns : NS) : Promise<void> {
    const upgradeCost = await runDodgerScript<number>(ns, "/singularity/dodger/getUpgradeHomeRamCost.js");
    if (player.money > upgradeCost * 5 && machine.ram.max < Math.pow(2, 30)) {
        await doUpgradeHomeRam(ns);
    }
}

/**
 * Upgrade home RAM.
 * @param ns NS object parameter.
 */
async function doUpgradeHomeRam(ns : NS) : Promise<void> {
    const oldRam = ns.nFormat(machine.ram.max * 1e6, '0.00b');
    const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/upgradeHomeRam.js");
    if (result) {
        logger.log(`Upgraded Home RAM: ${oldRam} --> ${ns.nFormat(machine.ram.max * 1e6, '0.00b')}`, { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to upgrade Home RAM`, { type: MessageType.fail, sendToast: true });
    }
}

/* 
 * ------------------------
 * > HOME CORES UPGRADE FUNCTIONS
 * ------------------------
*/

/**
 * Check if the requirements are met to upgrade home RAM, then if so execute the command.
 * @param ns NS object parameter.
 */
async function tryUpgradeHomeCores(ns : NS) : Promise<void> {
    const upgradeCost = await runDodgerScript<number>(ns, "/singularity/dodger/getUpgradeHomeCoresCost.js");
    if (player.money > upgradeCost * 5 && machine.cores < 8) {
        await doUpgradeHomeCores(ns);
    }
}

/**
 * Upgrade home RAM.
 * @param ns NS object parameter.
 */
async function doUpgradeHomeCores(ns : NS) : Promise<void> {
    const oldCores = machine.cores;
    const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/upgradeHomeCores.js");
    if (result) {
        logger.log(`Upgraded Home Cores: ${oldCores} --> ${machine.cores}`, { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to upgrade Home Cores`, { type: MessageType.fail, sendToast: true });
    }
}

/* 
 * ------------------------
 * > PURCHASE OR CREATE PROGRAM FUNCTIONS
 * ------------------------
*/

/**
 * Check if the requirements are met to upgrade home RAM, then if so execute the command.
 * @param ns NS object parameter.
 */
 async function tryPurchaseOrCreatePrograms(ns : NS) : Promise<void> {
    if (canPurchaseTor()) {
        await doPurchaseTorRouter(ns);
    }
        
    for (const program of PROGRAMS) {
        await tryPurchaseOrCreateProgram(ns, program);
    }
}

/**
 * Test if the TOR Router can be purchased.
 */
function canPurchaseTor() : boolean {
    return !player.hasTor && player.money > 2e5 * 10;
}

/**
 * Purchase the TOR Router.
 * @param ns NS object parameter.
 */
async function doPurchaseTorRouter(ns : NS) : Promise<void> {
    const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/purchaseTor.js");
    if (result) {
        logger.log("Successfully purchased TOR Router", { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to purchase TOR Router`, { type: MessageType.fail, sendToast: true });
    }
}

/**
 * Try to purchase or create the given program.
 * @param ns NS object parameter.
 * @param program Program object.
 */
async function tryPurchaseOrCreateProgram(ns : NS, program : IProgramInfo) : Promise<void> {
    if      (ns.fileExists(program.name))           return;
    else if (canPurchaseProgram(ns, program))       await doPurchaseProgram(ns, program);
    else if (await canCreateProgram(ns, program))   await doCreateProgram(ns, program);
}

/**
 * Test if a program can be purchased.
 * @param ns NS object parameter.
 * @param program Program object.
 * @returns True if the program can be purchased; false otherwise.
 */
function canPurchaseProgram(ns : NS, program : IProgramInfo) : boolean {
    return player.hasTor && player.money > program.cost * 10;
}

/**
 * Purchase a program.
 * @param ns NS object parameter.
 * @param program Program object.
 */
async function doPurchaseProgram(ns : NS, program : IProgramInfo) : Promise<void> {
    const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/purchaseProgram.js", program.name);
    if (result) {
        logger.log(`Successfully purchased program: ${program.name}`, { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to purchase program: ${program.name}`, { type: MessageType.fail, sendToast: true });
    }
}

/**
 * Test if a program can be created.
 * @param ns NS object parameter.
 * @param program Program object.
 * @returns True if the program can be created; false otherwise.
 */
async function canCreateProgram(ns : NS, program : IProgramInfo) : Promise<boolean> {
    const busy = await runDodgerScript<boolean>(ns, "/singularity/dodger/isBusy.js");
    return player.stats.hacking >= program.hacking && !ns.fileExists(program.name) && !busy;
}

/**
 * Create a program.
 * @param ns NS object parameter.
 * @param program Program object.
 */
async function doCreateProgram(ns : NS, program : IProgramInfo) : Promise<void> {
    const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/createProgram.js", program.name);
    if (result) {
        logger.log(`Successfully starting creation of program: ${program.name}`, { type: MessageType.success, sendToast: true });
    } else {
        logger.log(`Failed to start creation of program: ${program.name}`, { type: MessageType.fail, sendToast: true });
    }
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "TASK", "General Upgrade and Task Daemon");

	// Parse args
	ns.args[0];

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`General Upgrade and Task Daemon Helper\n`+
			`Description:\n` +
			`   Test script.\n` +
			`Usage:\n` +
			`   run /singularity/task-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help    : boolean |>> Prints this.\n` +
			`   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.`
		);

		return;
	}
	
	setupEnvironment(ns);

	logger.initialisedMessage(true, false);

	while (true) {
        await tryUpgradeHomeRam(ns);
        await tryUpgradeHomeCores(ns);
        await tryPurchaseOrCreatePrograms(ns);
		await ns.asleep(refreshPeriod);
	}
}