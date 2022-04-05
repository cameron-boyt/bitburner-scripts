import { NS } from '@ns'
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { genServer, IServerObject } from '/libraries/server-factory';
import { ScriptLogger } from '/libraries/script-logger';

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

	player.money;
	machine.hostname;
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param ns NS object parameter */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "TEST", "TEST");

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
			`TEST Helper\n`+
			`Description:\n` +
			`   Test script.\n` +
			`Usage:\n` +
			`   run /.js [args] [flags]\n` +
			`Arguments:\n` +
			`   exampleArg : string |>> This is an argument.\n` +
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
		await ns.asleep(refreshPeriod);
		break;
	}
}
