import { NS } from "@ns";
import { PortNumber, purgePort, writeToPort } from "./helpers/port-helper";
import { MessageType, ScriptLogger } from "/libraries/script-logger";

// Script logger
let logger: ScriptLogger;

// Script refresh period
const refreshPeriod = 1000;

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
 * > SCRIPT VARIABLES <
 */

/** Example variable. **/
let argCatcher = 1;

/*
 * ------------------------
 * > ARGUMENT AND FLAG PARSING FUNCTIONS
 * ------------------------
 */

/**
 * Parse script arguments.
 * @param ns NS object.
 */
async function parseArgs(ns: NS): Promise<void> {
    argCatcher = ns.args[0] as number;
}

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
    ns.prompt("Do test?");
    return true;
}

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTIONS
 * ------------------------
 */

/**
 * Set up the environment for this script.
 * @param ns NS object.
 */
async function setupEnvironment(ns: NS): Promise<void> {
    logger.log(argCatcher.toString());
    ns.prompt("Do setup?");
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
    ns.prompt("Do update?");
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
    await ns.asleep(refreshPeriod);
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
    purgePort(ns, PortNumber.CodingContractSolution);
    await writeToPort(ns, PortNumber.CodingContractSolution, "");
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
    logger = new ScriptLogger(ns, "TEST", "TEST");

    parseArgs(ns);
    parseFlags(ns);

    // Helper output
    if (help) {
        ns.tprintf(
            "%s",
            `TEST Helper\n` +
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
