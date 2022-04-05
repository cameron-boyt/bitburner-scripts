import { BitNodeMultipliers, NS } from '@ns'
import { readBitnodeMultiplierData } from '/data/read-bitnodemult-data';
import { runDodgerScript } from '/helpers/dodger-helper';
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';

// Script logger
let logger : ScriptLogger;

// Script refresh period
const refreshPeriod = 30000;

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
let debug = false; // Log in debug mode]

let wildSpending = false; // Allow purchasing upgrades with all available money

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Bitnode Multpliers */
let multipliers : BitNodeMultipliers;

/** Maximum number of purchased servers. */
let maxServerCount = 0;

/** RAM of servers to purchase. */
let serverPurchaseRam = 32;

/** Purchased servers. */
let purchasedServers : string[] = [];

/** Number of purchased servers at current RAM tier. */
let serversAtCurrentTier = 0;

const serverMaxRamDefault = 1048576;
let serverMaxRam = 0;

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

	if (Math.round(25 * multipliers.PurchasedServerLimit) === 0) {
		logger.log("Server limit is zero. Exiting.");
		ns.exit();
		await ns.asleep(2000);
	}

	maxServerCount = await runDodgerScript<number>(ns, "/servers/dodger/getPurchasedServerLimit.js");
	serverPurchaseRam = 32;

	serverMaxRam = 1 << (31 - Math.clz32(Math.round(serverMaxRamDefault * multipliers.PurchasedServerMaxRam)));
}

/*
 * ------------------------
 * > DATA UPDATE FUNCTION
 * ------------------------
*/

/**
 * Update data function.
 * @param ns NS object parameter.
 */
async function updateData(ns : NS) : Promise<void> {
	purchasedServers = await runDodgerScript<string[]>(ns, "/servers/dodger/getPurchasedServers.js");
	serversAtCurrentTier = purchasedServers.filter((server) => ns.getServerMaxRam(server) >= serverPurchaseRam).length;
	const oldTier = Math.log(serverPurchaseRam) / Math.log(2);
	serverPurchaseRam = Math.max(serverPurchaseRam * (serversAtCurrentTier === maxServerCount ? 2 : 1), getMaxAffordableRam(ns));
	const newTier = Math.log(serverPurchaseRam) / Math.log(2);

	if (oldTier !== newTier) {
		logger.log(`Trying to buy servers at tier: ${newTier}`, { type: MessageType.info });
	}
}

/*
 * ------------------------
 * > SERVER PURCHASE FUNCTIONS
 * ------------------------
*/

/**
 * Try to purchase new servers.
 * @param ns NS object parameter.
 */
async function tryPurchaseNewServers(ns : NS) : Promise<boolean> {
	logger.log(`Trying to purchase tier ${Math.log(serverPurchaseRam) / Math.log(2)} servers`, { type: MessageType.debugLow });
	if (canAffordServer(ns.getPurchasedServerCost(serverPurchaseRam))) {
		if (purchasedServers.length === maxServerCount) await doDeleteWorstServer(ns);
		return tryPurchaseServer(ns);
	} else {
		return false;
	}
}

/**
 * Try and purchase a new server.
 * @param ns NS object parameter.
 * @returns True if a server was purchased; false otherwise.
 */
async function tryPurchaseServer(ns : NS) : Promise<boolean> {
	const tier = Math.log(serverPurchaseRam) / Math.log(2);
	serversAtCurrentTier = purchasedServers.filter((server) => ns.getServerMaxRam(server) >= serverPurchaseRam).length;
	const hostname = `server-t${`0${tier}`.slice(-2)}-${`0${serversAtCurrentTier + 1}`.slice(-2)}`;

	const result = await runDodgerScript<string[]>(ns, "/servers/dodger/purchaseServer.js", hostname, serverPurchaseRam);
	if (result) {
		logger.log(`Purchased New Server: ${hostname}`, { type: MessageType.success, sendToast: true });
		return true;
	} else {
		logger.log(`Failed to purchase new server: ${hostname}`, { type: MessageType.fail, sendToast: true });
		return false;
	}
}

/**
 * Test if a server can be purchased.
 * @param cost Cost of a server.
 * @returns True if the server can be purchased; false otherwise.
 */
function canAffordServer(cost : number) : boolean {
	return (
		wildSpending
			? (player.money >= cost)
			: (player.money >= cost * 100)
	);
}

/**
 * Get the highest server RAM that is affordable.
 * @param ns NS object parameter.
 * @return Maximum RAM server that can be purchased.
 */
function getMaxAffordableRam(ns : NS) : number {
	for (let ram = 8; ram <= serverMaxRam; ram *= 2) {
		const cost = ns.getPurchasedServerCost(ram);
		if (!canAffordServer(cost)) return ram / 2;
	}

	return serverMaxRam;
}

/*
 * ------------------------
 * > SERVER REMOVAL FUNCTIONS
 * ------------------------
*/

/**
 * Delete the worst purchased server.
 * @param ns NS object parameter.
 */
async function doDeleteWorstServer(ns : NS) : Promise<void> {
	const serverToDelete = getWorstServer(ns);
	logger.log(`Retiring server: ${serverToDelete}`, { type: MessageType.info });
	await ns.write("/tmp/delete.txt", "server gonna be gone soon :(");
	await ns.scp("/tmp/delete.txt", serverToDelete);
	await doKillServerProcesses(ns, serverToDelete);
	await ns.asleep(1000);
	await doDeleteServer(ns, serverToDelete);
}

/**
 * Get the hostname of the worst purchased server.
 * @param ns NS object parameter.
 * @returns Hostname of worst purchased server.
 */
function getWorstServer(ns : NS) : string {
	const lowestRAM = purchasedServers.map(x => ns.getServerMaxRam(x)).sort((a, b) => a - b)[0];
	const lowestRAMServers = purchasedServers.filter(x => ns.getServerMaxRam(x) === lowestRAM);
	const highestNumberServer = lowestRAMServers.sort().slice(-1)[0];
	return highestNumberServer;
}

/**
 * Kill all processes on a given server.
 * @param ns NS object paramater
 * @param hostname Server hostname.
 */
async function doKillServerProcesses(ns : NS, hostname : string) : Promise<void> {
	const result = await runDodgerScript<boolean>(ns, "/servers/dodger/killall.js", hostname);
	if (result) {
		logger.log(`Killed all processes on server: ${hostname}`, { type: MessageType.info });
	} else {
		logger.log(`Failed to kill processes on server: ${hostname}`, { type: MessageType.fail });
		throw new Error(`Failed to kill processes on server: ${hostname}`);
	}
}

/**
 * Delete a given server.
 * @param ns NS object paramater
 * @param hostname Server hostname.
 */
async function doDeleteServer(ns : NS, hostname : string) : Promise<void> {
	const result = await runDodgerScript<boolean>(ns, "/servers/dodger/deleteServer.js", hostname);
	if (result) {
		logger.log(`Deleted server: ${hostname}`, { type: MessageType.info });
		purchasedServers = await runDodgerScript<string[]>(ns, "/servers/dodger/getPurchasedServers.js");
	} else {
		logger.log(`Failed to delete server: ${hostname}`, { type: MessageType.fail });
		throw new Error(`Failed to delete server: ${hostname}`);
	}
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "SERVER", "Server Purchase Daemon");

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
			`Server Purchase Daemon Helper\n`+
			`Description:\n` +
			`   You want server? We got servers. Note: not responsible for buying AWESOME servers at amazing prices.\n` +
			`Usage:\n` +
			`   run run /servers/server-purchase-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help    : boolean |>> Prints this.\n` +
			`   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   	  --wild    : boolean |>> Enables spending money on new servers at a lesser cost threshold.`
		);

		return;
	}

	await setupEnvironment(ns);

	logger.initialisedMessage(true, false);

	while (true) {

		while (true) {
			await updateData(ns);
			const boughtServer = await tryPurchaseNewServers(ns);
			if (boughtServer) await ns.asleep(1000);
			else break;
		}

		await ns.asleep(refreshPeriod);

	}
}
