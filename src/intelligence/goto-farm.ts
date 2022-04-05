import { NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';

// Script logger
let logger : ScriptLogger;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false]
];

let help = false;
let verbose = false;
let debug = false;

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "INT-GOTO", "Intelligence Farm (GoTo)");

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
			`TEST Helper:\n`+
			`Description:\n` +
			`   Test script.\n` +
			`Usage: /.js [args] [flags]\n` +
			`Arguments:\n` +
			`   [exampleArg] : string |>> This is an argument.\n` +
			`Flags:\n` +
			`   [--h or help]       : boolean |>> Prints this.\n` +
			`   [--v or --verbose]  : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   [--d or --debug]    : boolean |>> Sets logging level to 3 - even more verbosing logging.`
		);

		return;
	}

	logger.initialisedMessage(true, false);

    ns.tail();
    let xp = 0;

    for (let a = 0; a < 1000; a++) {
        for (let i = 0; i < 1000; i++) {
            ns.goToLocation("Powerhouse Gym");
            xp += 0.00002;
            await ns.asleep(0);
        }
    
        logger.log(`XP Gained: ${xp}`, { type: MessageType.info });
    }

}