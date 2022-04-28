import { NS } from "@ns";
import { IScriptRun } from "/data-types/dodger-data";
import { runDodgerScript, runDodgerScriptBulk } from "/helpers/dodger-helper";
import { MessageType, ScriptLogger } from "/libraries/script-logger";

// Script logger
let logger: ScriptLogger;

// Script refresh period
const refreshPeriod = 15000;

// Flags
const flagSchema: [string, string | number | boolean | string[]][] = [
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
 * > DO SCRIPT PROCESSING FUNCTIONS
 * ------------------------
 */

/**
 * Execute the funtionality of this script.
 * @param ns NS object.
 */
async function doScriptFunctions(ns: NS): Promise<void> {
    await joinWaitingFactions(ns);
}

/*
 * ------------------------
 * > JOIN FACTIONS FUNCTIONS
 * ------------------------
 */

/**
 * Joins factions which have augs the player does not yet own
 * @param ns NS object.
 */
async function joinWaitingFactions(ns: NS): Promise<void> {
    const scripts: IScriptRun[] = [
        { script: "/singularity/dodger/checkFactionInvitations.js", args: [] },
        { script: "/singularity/dodger/getOwnedAugmentations.js", args: [true] }
    ];

    const results = await runDodgerScriptBulk(ns, scripts);

    const invitations = results[0] as string[];
    const ownedAugments = results[1] as string[];

    if (invitations.length > 0) {
        const augmentsFromFactions = await runDodgerScript<string[][]>(ns, "/singularity/dodger/getAugmentationsFromFaction-bulk.js", JSON.stringify(invitations));
        augmentsFromFactions.forEach((augs) => (augs = augs.filter((aug) => aug !== "Neuroflux Governor" && !ownedAugments.includes(aug))));

        const factionIndex = augmentsFromFactions.reduce((p, c, i, a) => (a[p].length > c.length ? p : i), 0);

        const factionToJoin = invitations[factionIndex];

        const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/joinFaction.js", factionToJoin);

        if (result) {
            logger.log(`Joined faction: ${factionToJoin}`, { type: MessageType.success, sendToast: true });
        } else {
            logger.log(`Failed to join faction: ${factionToJoin}`, { type: MessageType.fail, sendToast: true });
        }
    }
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

/** @param ns NS object parameter */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "FACTION-INVITE", "Faction Invitation Acceptor Daemon");

    // Parse flags
    const flags = ns.flags(flagSchema);
    help = flags.h || flags["help"];
    verbose = flags.v || flags["verbose"];
    debug = flags.d || flags["debug"];

    if (verbose) logger.setLogLevel(2);
    if (debug) logger.setLogLevel(3);

    // Helper output
    if (help) {
        ns.tprintf(
            "%s",
            `Faction Inviatation Acceptor Daemon Helper\n` +
                `Description:\n` +
                `   Too popular? No worries - this script will put the people in their place.\n` +
                `Usage:\n` +
                `   run /singularity/faction-invite-daemon.js [flags]\n` +
                `Flags:\n` +
                `   -h or --help    : boolean |>> Prints this.\n` +
                `   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
                `   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.`
        );

        return;
    }

    logger.initialisedMessage(true, false);

    while (true) {
        await doScriptFunctions(ns);
        await waitForScriptCycle(ns);
    }
}
