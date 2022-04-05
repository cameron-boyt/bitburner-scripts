import { NS } from '@ns'
import { IGangData } from '/data-types/gang-data';
import { readAugmentData } from '/data/read-augment-data';
import { runDodgerScript } from '/helpers/dodger-helper';
import { ALL_FACTIONS, AUG_PRICE_FACTOR, IAugmentInfo } from '/libraries/constants.js';
import { IPlayerObject, genPlayer } from '/libraries/player-factory';
import { peekPort, PortNumber, purgePort, writeToPort } from '/libraries/port-handler.js';
import { ScriptLogger } from '/libraries/script-logger.js';

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
    ["debug", false],
    ["purchase", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

let purchase = false; // Purchase augments mode

/*
 * > SCRIPT VARIABLES <
*/

/** Player object */
let player : IPlayerObject;

/** Augmentation Information */
let augmentations : IAugmentInfo[] = [];

/** Faction rep per faction joined by player */
let factionRep : { faction : string, rep : number }[] = [];



interface IAugmentPurchase {
    augment: string;
    faction: string;
    prereq: string[];
    cost: number;
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
async function setupEnvironment(ns : NS) : Promise<void> {
    player = genPlayer(ns);
	augmentations = await readAugmentData(ns);
}

/*
 * ------------------------
 * > AUGMENT BASKET UPDATE FUNCTION
 * ------------------------
*/

/**
 * Search through all augmentations available to the player and queue some for purchase.
 * @param ns NS object parameter.
 * @returns Array of augments to purchase.
 */
async function updateAugmentBasket(ns : NS) : Promise<IAugmentPurchase[]> {
	let allAugs : IAugmentPurchase[] = [];
    augmentations = await readAugmentData(ns);
    factionRep = await runDodgerScript<{ faction : string, rep : number }[]>(ns, "/singularity/dodger/getFactionRep-bulk.js", JSON.stringify(player.factions.joinedFactions));
	const ownedAugs = await runDodgerScript<string[]>(ns, "/singularity/dodger/getOwnedAugmentations.js")

    const stockWorth = peekPort<number>(ns, PortNumber.StockWorth);
    const totalFunds = player.money + (stockWorth ? stockWorth : 0);

	// Compose an array of all available augmentations
	for (const faction of player.factions.joinedFactions) {
        const availableAugs = augmentations.filter((aug) => aug.factions.includes(faction)).filter((aug) => (
            aug.name !== 'NeuroFlux Governor' &&
            !ownedAugs.includes(aug.name) &&
            factionRep.find((fac) => fac.faction === faction)!.rep >= aug.repReq &&
            totalFunds >= aug.cost
        ));

        for (const aug of availableAugs)  {
			allAugs.push({
				augment: aug.name,
				faction: faction,
                prereq: aug.preReq,
				cost: aug.cost
			});
		}
	}

	// Construct a backet of augments to buy
	const basket : IAugmentPurchase[] = [];

    if (allAugs.length > 0) {

        // Get an array of augs we can purchase
        let purchaseableAugs = allAugs.filter(x => x.prereq.every(y => [...ownedAugs, ...basket.map(z => z.augment)].includes(y)));

        // Queue augs for purchase until we can afford no more!
        while (purchaseableAugs.length > 0) {

            // Get the most expensive augmentation
            const mostExpensiveAug = purchaseableAugs.sort((a, b) => (b.cost - a.cost))[0];

            if (totalFunds - basket.map(x => x.cost).reduce((a, b) => (a + b), 0) < mostExpensiveAug.cost) break;

            // Add augment to basket
            basket.push({ augment: mostExpensiveAug.augment, faction: mostExpensiveAug.faction, prereq: [], cost: mostExpensiveAug.cost });

            // Remove augment from all augment list
            allAugs = allAugs.filter(x => x.augment !== mostExpensiveAug.augment);

            // Update augment costs
            allAugs.forEach(x => x.cost *= AUG_PRICE_FACTOR);

            // Update list of augments we meet the requirements to purchase
            purchaseableAugs = allAugs.filter(x => x.prereq.every(y => [...ownedAugs, ...basket.map(z => z.augment)].includes(y)));
        }
    }

    const gangData = peekPort<IGangData>(ns, PortNumber.GangData);
    const gangFaction = (
        player.bitnodeN === 2
            ? ""
            : (gangData ? gangData.gangInfo.faction : "")
    );

    // Get faction with highest reputation
    const factions = factionRep.filter((fac) => fac.faction !== gangFaction);

    if (factions.length > 0) {
        const highestRepFaction = factions.reduce((a, b) => (a.rep > b.rep ? a : b));

        // With remaining money, buy as many NeuroFlux Generator upgrades as possible
        const neuroFluxAug = augmentations.find((aug) => aug.name === 'NeuroFlux Governor')!;
        let neurofluxCost = neuroFluxAug.cost * Math.pow(AUG_PRICE_FACTOR, basket.length);
        let neurofluxRep = neuroFluxAug.repReq;

        while (highestRepFaction.rep > neurofluxRep && player.money > basket.map(x => x.cost).reduce((a, b) => a + b, 0) + neurofluxCost) {
            basket.push({ augment: 'NeuroFlux Governor', faction: highestRepFaction.faction, prereq: [], cost: neurofluxCost });
            neurofluxCost *= AUG_PRICE_FACTOR;
            neurofluxRep *= 1.14;
        }

        // If the red pill is available, queue it since it always costs 0
        const redPill = allAugs.find(x => x.augment === "The Red Pill");
        if (redPill) basket.push({ augment: redPill.augment, faction: redPill.faction, prereq: [], cost: 0});
    }

    return basket;
}

/**
 * Given the purchase queue, purchase and then install the chosen augmentations.
 * @param ns NS object parameter.
 * @param basket List of augments to purchase.
 */
async function purchaseAugsAndReset(ns : NS, basket : IAugmentPurchase[]) : Promise<void> {

    // Request all stocks be sold
    ns.run("/stock-market/sell-all-stocks.js");
    await ns.asleep(10000);

    ns.tprint("AWAY WE GOOOOOOOOOOOooooooooooooooooooo...........");
    ns.tprint(basket);

    for (const aug of basket) { ns.purchaseAugmentation(aug.faction, aug.augment); }

    ns.spawn("/singularity/timewarp.js");
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "ASCENSION", "Ascension Daemon")

    // Parse flags
    const flags = ns.flags(flagSchema);
    help = flags.h || flags["help"];
    verbose = flags.v || flags["verbose"];
    debug = flags.d || flags["debug"];

    purchase = flags["purchase"];

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
            `   -h or --help     : boolean |>> Prints this.\n` +
            `   -v or --verbose  : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
            `   -d or --debug    : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
            `         --purchase : boolean |>> Set the scripts to purchase the queued augments.`
        );

        return;
    }

	setupEnvironment(ns);

	logger.initialisedMessage(true, false);

    while (true) {

        let augShoppingBasket = await updateAugmentBasket(ns);

        if (augShoppingBasket.length > 0) {
            let totalCost = 0;
            logger.log(" ------ Current Basket ------ ");
            for (const aug of augShoppingBasket) {
                logger.log(`${aug.augment} from ${aug.faction} (${ns.nFormat(aug.cost, '$0.000a')})`);
                totalCost += aug.cost;
            }
            logger.log(` --- Total Cost: ${ns.nFormat(totalCost, '$0.000a')} --- `);
        } else {
            logger.log(" ------ Basket Empty ------ ");
        }

        if (purchase && (augShoppingBasket.length >= 10 || augShoppingBasket.map(x => x.augment).includes("The Red Pill"))) {
            await purchaseAugsAndReset(ns, augShoppingBasket);
        }

		await ns.asleep(refreshPeriod);
    }
}
