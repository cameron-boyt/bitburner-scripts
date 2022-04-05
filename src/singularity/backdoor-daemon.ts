import { NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { genPlayer, IPlayerObject } from '/libraries/player-factory.js';
import { genServer, IServerObject } from '/libraries/server-factory.js';
import { getAllServers, getServerPath } from '/helpers/server-helper';
import { runDodgerScript } from '/helpers/dodger-helper';

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
    ["all-servers", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode
let allServers = false; // Whether the script should aim to backdoor all servers.

/* 
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

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
}

/* 
 * ------------------------
 * > BACKDOOR CHECKER FUNCTION 
 * ------------------------
*/

/** 
 * Given a list of servers, check if we are able to install a backdoor on them (if not already).
 * @param ns NS object parameter.
 * @param servers Array server objects.
 */
async function checkBackdoor(ns : NS, servers : IServerObject[]) : Promise<void> {
	for (const target of servers) {
		if (target.hasRootAccess && player.stats.hacking >= target.hackLevel && !target.isBackdoorInstalled) {
			await backdoorServer(ns, target);
		}
	}
}

/* 
 * ------------------------
 * > BACKDOOR INSTALLER FUNCTION 
 * ------------------------
*/

/** 
 * Given a server, install a backdoor on it.
 * @param ns NS object parameter.
 * @param server Server object for server to have a backdoor installed.
 */
async function backdoorServer(ns : NS, server : IServerObject) : Promise<void> {
	const path = getServerPath(ns, ns.getHostname(), server.hostname)
	const connectPathResult = await runDodgerScript<boolean>(ns, "/singularity/dodger/connect-bulk.js", JSON.stringify(path));
	if (!connectPathResult) throw new Error(`Failed to connect to server along path: ${path}`);
	
	await ns.installBackdoor();	
	logger.log(`Backdoor has been installed on ${server.hostname}`, { type: MessageType.success, logToTerminal: true });

	const connectHomeResult = await runDodgerScript<boolean>(ns, "/singularity/dodger/connect.js", "home");
	if (!connectHomeResult) throw new Error(`Failed to connect to server along path: ${path}`);
}


/* 
 * ------------------------
 * > SERVER ARRAY GETTER FUNCTION 
 * ------------------------
*/

/**
 * Get a list of server objects for servers that should have a backdoor installed on it.
 * @param ns NS object parameter.
 * @returns Array of server objects.
 */
function getBackdoorableServer(ns : NS) : IServerObject[] {
	return getAllServers(ns).filter(x => !ns.getServer(x).purchasedByPlayer && x != "home").map(x => genServer(ns, x)).sort((a, b) => (a.hackLevel - b.hackLevel));
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "BACKDOOR-DAE", "Backdoor Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
	allServers = flags["all-servers"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`Backdoor Daemon Helper\n`+
			`Description:\n` +
			`   Install a backdoor on a given server or continually try to install backdoors on all servers.\n` +
			`Usage:\n` +
			`   run /singularity/backdoor-daemon.js [args] [flags]\n` +
			`Arguments:\n` +
			`   hostname? : string |>> (Optional) Hostname of the server you wish to install backdoor on.\n` +
			`Flags:\n` +
			`   -h or --help        : boolean |>> Prints this.\n` +
			`   -v or --verbose     : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug       : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`         --all-servers : boolean |>> Sets the script to continually try to install backdoors on all servers.`
		);

		return;
	}

	setupEnvironment(ns);
	
	logger.initialisedMessage(true, false);

	if (allServers) {
		const servers = getBackdoorableServer(ns);

		while (!servers.every(x => x.isBackdoorInstalled)) {
			await checkBackdoor(ns, servers);
			await ns.asleep(refreshPeriod);
		}

		logger.log("Backdoors installed on all servers", { type: MessageType.success, sendToast: true });
	} else {

		const targetHostname = ns.args[0] as string;
		const target = genServer(ns, targetHostname);

		if (!target.isBackdoorInstalled) {
			if (target.hasRootAccess) {
				if (player.stats.hacking >= target.hackLevel) {
					await backdoorServer(ns, target);
				} else {
					logger.log(`Insufficient hacking level to install backdoor on ${target.hostname} (${player.stats.hacking} / ${target.hackLevel})`, { type: MessageType.warning });
				}
			} else {
				logger.log(`No root access on ${target.hostname} (${target.ports.openCount} / ${target.ports.requiredCount})`, { type: MessageType.warning });
			}
		} else {
			logger.log(`Backdoor already installed on ${target.hostname}`, { type: MessageType.warning });
		}
	}
}