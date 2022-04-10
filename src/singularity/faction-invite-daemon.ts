import { NS } from '@ns'
import { IScriptRun } from '/data-types/dodger-data';
import { IFactionAugmentations } from '/data-types/faction-data';
import { runDodgerScript, runDodgerScriptBulk } from '/helpers/dodger-helper';
import { MessageType, ScriptLogger } from '/libraries/script-logger';

// Script logger
let logger : ScriptLogger;

// Script refresh period
const refreshPeriod = 15000;

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
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param ns NS object parameter */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "FACTION-INVITE", "Faction Invitation Acceptor Daemon");

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

	logger.initialisedMessage(true, false);

	while (true) {
        const scripts : IScriptRun[] = [
            { script: "/singularity/dodger/checkFactionInvitations.js", args: [] },
            { script: "/singularity/dodger/getOwnedAugmentations.js", args: [true] },
        ];

        const results = await runDodgerScriptBulk(ns, scripts);

        const invitations = results[0] as string[];
        const ownedAugments = results[1] as string[];

        if (invitations.length > 0) {
            const augmentsFromFactions = await runDodgerScript<IFactionAugmentations[]>(ns, "/singularity/dodger/getAugmentationsFromFaction-bulk.js", JSON.stringify(invitations));
            augmentsFromFactions.forEach((factionAugs) => factionAugs.augments = factionAugs.augments.filter((aug) => aug !== "Neuroflux Governor" && !ownedAugments.includes(aug)));

            const factionToJoin = augmentsFromFactions.sort((a, b) =>
                b.augments.length -
                a.augments.length
            )[0].faction;

            const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/joinFaction.js", factionToJoin);

            if (result) {
                logger.log(`Joined faction: ${factionToJoin}`, { type: MessageType.success, sendToast: true });
            } else {
                logger.log(`Failed to join faction: ${factionToJoin}`, { type: MessageType.fail, sendToast: true });
            }
        }

		await ns.asleep(refreshPeriod);
	}
}
