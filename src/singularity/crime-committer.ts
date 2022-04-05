import { CrimeStats, NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { genPlayer, IPlayerObject } from '/libraries/player-factory.js';
import { CrimeType } from '/data-types/crime-data.js';
import { runDodgerScript } from '/helpers/dodger-helper';
import { calculateCrimeChance, getBestCrime } from '/helpers/crime-helper';
import { doSkillTraining } from '/helpers/skill-helper';
import { Skill } from '/data-types/skill-data';
import { peekPort, PortNumber } from '/libraries/port-handler';
import { ISleeveData, ISleeveTaskCrime, SleeveTaskType } from '/data-types/sleeve-data';

// Script logger
let logger : ScriptLogger;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false],
    ["money", false],
    ["karma", false],
    ["kills", false],
    ["goal", Infinity]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode
let moneyFocus = false; // Crime in money focus mode
let karmaFocus = false; // Crime in karma focus mode
let killsFocus = false; // Crime in kills focus mode
let goal = Infinity; // Goal number of x to reach (depending on mode)

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Type of crime to commit */
let crimeType : CrimeType;

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
    ns.tail();
}

/*
 * ------------------------
 * > GOAL TIME ESTIMATION FUNCTIONS
 * ------------------------
*/

/**
 * Estimate how long until the player reaches the set goal
 * @param ns NS object parameter.
 */
 async function estimeTimeForGoal(ns : NS) : Promise<void> {
    const crimeData = await getBestCrime(ns, crimeType, player.stats, ns.getPlayer().crime_success_mult, 0, 12000);

    if (Math.abs(goal) !== Infinity) {
        const required = Math.ceil(getRequiredAmount());
        const perSecond = getPerSecondAmount(ns, crimeData);
        const timeRemaining = Math.abs(required / perSecond);
        formatLogMessage(ns, Math.abs(required), perSecond, timeRemaining);
    } else {
        const perSecond = getPerSecondAmount(ns, crimeData);
        formatLogMessage(ns, 0, perSecond, 0);
    }
}

/**
 * Get the remaining amount of money/karma/kills to reach the goal.
 * @returns The remaining amount of x required to reach the specified goal.
 */
function getRequiredAmount() : number {
    switch (crimeType) {
        case CrimeType.Money: return Math.max(0, goal - player.money);
        case CrimeType.Karma: return Math.min(0, goal - player.karma);
        case CrimeType.Kills: return Math.max(goal - player.peopleKilled);
    }
}

/**
 * Get the per second gain of resource.
 * @param ns NS object parameter.
 * @param crime Crime data for which crime is being committed.
 * @returns Per second gain of resource.
 */
function getPerSecondAmount(ns : NS, crime : CrimeStats) : number {
    const crimeChance = calculateCrimeChance(crime, player.stats, ns.getPlayer().crime_success_mult) / (crime.time / 1000);
    const sleeveData = peekPort<ISleeveData>(ns, PortNumber.SleeveData);
    let sleeveBonus = 0;

    switch (crimeType) {
        case CrimeType.Money:
            if (sleeveData)
                sleeveData.sleeves.forEach((sleeve) => sleeveBonus += (
                    sleeve.task.type === SleeveTaskType.Crime
                        ? (sleeve.task.details as ISleeveTaskCrime).moneyPerSecond
                        : 0
                    )
                );
            return (crime.money * crimeChance) + sleeveBonus;
        case CrimeType.Karma:
            if (sleeveData)
                sleeveData.sleeves.forEach((sleeve) => sleeveBonus += (
                    sleeve.task.type === SleeveTaskType.Crime
                        ? (sleeve.task.details as ISleeveTaskCrime).karmaPerSecond
                        : 0
                    )
                );
            return (crime.karma * crimeChance) + sleeveBonus;
        case CrimeType.Kills:
            if (sleeveData)
                sleeveData.sleeves.forEach((sleeve) => sleeveBonus += (
                    sleeve.task.type === SleeveTaskType.Crime
                        ? (sleeve.task.details as ISleeveTaskCrime).killsPerSecond
                        : 0
                    )
                );
            return (crime.kills * crimeChance) + sleeveBonus;
    }
}

/**
 * Format and push a log message about remaining time for goal information.
 * @param ns NS object parameter.
 * @param required Remaining amount of resource until goal.
 * @param perSecond Resource gain per second.
 * @param timeRemaining Time remaining until goal is met.
 */
function formatLogMessage(ns : NS, required : number, perSecond : number, timeRemaining : number) : void {
    switch (crimeType) {
        case CrimeType.Money: {
            const requiredStr = required === 0 ? "$-----" : ns.nFormat(required, '$0.000a');
            const perSecondStr = ns.nFormat(perSecond, '$0.000a');
            const timeRemainingStr = timeRemaining === 0 ? "--:--:--" : ns.nFormat(timeRemaining, '00:00:00');
            logger.log(`Remaining: ${requiredStr}, Gaining ${perSecondStr} /s, ETA: ${timeRemainingStr}`, { type: MessageType.info });
            break;
        }
        case CrimeType.Karma:
        case CrimeType.Kills: {
            const requiredStr = required === 0 ? "-----" : ns.nFormat(required, '0');
            const perSecondStr = ns.nFormat(perSecond, '0.000');
            const timeRemainingStr = timeRemaining === 0 ? "--:--:--" : ns.nFormat(timeRemaining, '00:00:00');
            logger.log(`Remaining: ${requiredStr}, Gaining ${perSecondStr} /s, ETA: ${timeRemainingStr}`, { type: MessageType.info });
            break;
        }
    }
}

/*
 * ------------------------
 * > CRIME GOAL TEST FUNCTION
 * ------------------------
*/

/**
 * Test if the specified crime goal has been met.
 * @returns True if the crime goal has been met; false otherwise.
 */
function hasMetGoal() : boolean {
    switch (crimeType) {
        case CrimeType.Money: return player.money >= goal;
        case CrimeType.Karma: return player.karma <= goal;
        case CrimeType.Kills: return player.peopleKilled >= goal;
    }
}

/*
 * ------------------------
 * > CRIME COMMITTER FUNCTION
 * ------------------------
*/

/**
 * Execute the crime which has the most return for the specified type.
 * @param ns 'ns' namespace parameter.
 * @param type Type of crime to optimise for.
 */
async function doBestCrime(ns : NS, type : CrimeType) : Promise<void> {
    while (ns.isBusy()) { await ns.asleep(1000); }

    const bestCrime = await getBestCrime(ns, type, player.stats, ns.getPlayer().crime_success_mult, 0, 12000);
    await runDodgerScript<number>(ns, "/singularity/dodger/commitCrime.js", bestCrime.name);
    await ns.asleep(bestCrime.time);
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "CRIME-DAE", "Crime Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
    moneyFocus = flags["money"];
    karmaFocus = flags["karma"];
    killsFocus = flags["kills"];
    goal = flags["goal"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

    if (moneyFocus) {
        logger.log(`Setting crime type to 'Money'`, { type: MessageType.info });
        crimeType = CrimeType.Money;
    } else if (karmaFocus) {
        logger.log(`Setting crime type to 'Karma'`, { type: MessageType.info });
        crimeType = CrimeType.Karma;
        goal = -goal;
    } else if (killsFocus) {
        logger.log(`Setting crime type to 'People Kills'`, { type: MessageType.info });
        crimeType = CrimeType.Kills;
    } else {
        logger.log(`No crime type specified - defaulting to 'Money'`, { type: MessageType.info });
        crimeType = CrimeType.Money;
    }

    if (Math.abs(goal) !== Infinity) {
        logger.log(`Goal set to ${goal}`, { type: MessageType.info });
    } else {
        logger.log(`No goal has been set. Script will run indefinitely`, { type: MessageType.warning });
    }

	// Helper output
	if (help) {
		ns.tprintf(
			`Crime Committer Helper:\n`+
			`Description:\n` +
			`   Commits crimes to your heart's content of the requested best type.\n` +
			`   Supply multiple crime modes will cause them to be selected based on priority (Money > Karma > Kills).\n` +
			`Usage:\n` +
            `   run /singularity/crime-committer.js [flags]\n` +
			`Flags:\n` +
			`   --h or --help    : boolean |>> Prints this.\n` +
			`   --v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   --d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging. \n` +
			`          --money   : boolean |>> Commit crimes maximising money gains. \n` +
			`          --karma   : boolean |>> Commit crimes maximising karma gains. \n` +
			`          --kills   : boolean |>> Commit crimes maximising people kill gains.`
		);

		return;
	}

    setupEnvironment(ns);

	logger.initialisedMessage(true, false);

    await doSkillTraining(ns, Skill.Agility, 23);
    await doSkillTraining(ns, Skill.Defense, 23);
    await doSkillTraining(ns, Skill.Dexterity, 23);
    await doSkillTraining(ns, Skill.Strength, 23);

    while (true) {
        await estimeTimeForGoal(ns);

        const goalMet = hasMetGoal();
        if (!goalMet) {
            await doBestCrime(ns, crimeType);
        } else {
            logger.log(`Crime goal met!`, { type: MessageType.success });
            break;
        }
    }
}
