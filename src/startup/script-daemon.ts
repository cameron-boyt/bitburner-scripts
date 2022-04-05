import { BitNodeMultipliers, NS  } from '@ns'
import { genPlayer, IPlayerObject } from '/libraries/player-factory';
import { genServer, IServerObject } from '/libraries/server-factory';
import { MessageType, ScriptLogger } from '/libraries/script-logger';
import { readBitnodeMultiplierData } from '/data/read-bitnodemult-data';
import { runDodgerScript, runDodgerScriptBulk } from '/helpers/dodger-helper';
import { peekPort, PortNumber } from '/libraries/port-handler';
import { IStockData } from '/data-types/stock-data';
import { getPlayerSensibleSkillApproximation } from '/helpers/skill-helper';
import { Skill } from '/data-types/skill-data';
import { ICorpData } from '/data-types/corporation-data';
import { getFreeRam } from '/helpers/server-helper';
import { IScriptRun } from '/data-types/dodger-data';
import { IGangData } from '/data-types/gang-data';

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

/** Bitnode Multpliers */
let multipliers : BitNodeMultipliers;

/** Owned player augmentations. */
let playerAugments : string[] = [];

/** Purchased server limit. */
let serverLimit = 0;

interface IAutoScriptCondition {
	args : (string | number)[];
	bonusArgs: IAutoScriptBonusArgs[];
	condition : () => Promise<boolean>;
}

interface IAutoScriptRun {
	name : string;
	runs : IAutoScriptCondition[];
}

interface IAutoScriptBonusArgs {
	args : (string | number)[];
	condition : () => Promise<boolean>;
}

/** Array of scripts to run once */
let singleScripts : IAutoScriptRun[] = [];

/** Array of scripts to check continuously for heartbeat */
let repeatScripts : IAutoScriptRun[] = [];

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
    machine = genServer(ns, ns.getHostname());

	multipliers = await readBitnodeMultiplierData(ns);

	serverLimit = Math.round(25 * multipliers.PurchasedServerLimit);

	const hackingGoal = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Hacking);

	const hasPublicCorp = async function() : Promise<boolean> {
		const corpData = peekPort<ICorpData>(ns, PortNumber.CorpData);
		if (corpData) {
			return corpData.isPublic;
		} else {
			return false;
		}
	};

	const playerInGang = async function() : Promise<boolean> {
		const gangData = peekPort<IGangData>(ns, PortNumber.GangData);
		if (gangData) {
			return gangData.lastUpdate >= performance.now() - 60000;
		} else {
			return false;
		}
	};

	const stanekLargerThan = async function(h : number, w : number) : Promise<boolean> {
		const scripts : IScriptRun[] = [
			{ script: "/staneks-gift/dodger/giftHeight.js", args: [] },
			{ script: "/staneks-gift/dodger/giftWidth.js", args: [] }
		];

		const results = await runDodgerScriptBulk(ns, scripts);

		const height = results[0] as number;
		const width = results[1] as number;

		return (height >= h && width >= w) || (width >= h && height >= w);
	}

	ns.ps(machine.hostname).filter((x) => x.filename !== ns.getRunningScript().filename).forEach((script) => ns.kill(script.pid));
	ns.tail();

	singleScripts = [
		{ name: "/data/data-writer-daemon.js", runs: [
			{ args: [], bonusArgs: [], condition: async () => true }
		]},
		{ name : "/startup/file-cleanup.js", runs: [
			{ args: [], bonusArgs: [], condition: async () => true }
		]}
	];

	repeatScripts = [
		{ name: "/sleeves/sleeve-daemon.js", runs: [
			{
				args: ["--stock", 6, "--money", 7],
				bonusArgs: [
					{ args: ["--gang", 1], condition : async () => player.bitnodeN !== 2 },
					{ args: ["--shock", 0, ], condition : async () => player.hasCorp },
					{ args: ["--train", 2, "--pill", 3, "--wild"], condition : () => hasPublicCorp() }
				],
				condition : async () => machine.ram.max >= 32
			}
		]},
		{ name: "/singularity/task-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => machine.ram.max >= 32
			}
		]},
		{ name: "/singularity/crime-committer.js", runs: [
			{
				args: ["--money"],
				bonusArgs: [],
				condition : async () => (
					player.bitnodeN !== 8 &&
					machine.ram.max >= 32 &&
					machine.ram.max < 64
				)
			},
			{
				args: ["--karma", "--goal", 100],
				bonusArgs: [],
				condition : async () => (
					player.bitnodeN === 2 &&
					machine.ram.max >= 64 &&
					player.karma > -100
				)
			},
			{
				args: ["--karma", "--goal", 54000],
				bonusArgs: [],
				condition : async () => (
					player.bitnodeN !== 2 &&
					machine.ram.max >= 64 &&
					player.karma > -54000
				)
			}
		]},
		{ name: "/coding-contracts/contract-solver-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => machine.ram.max >= 64
			}
		]},
		{ name: "/stock-market/stock-market-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => (
					machine.ram.max >= 64 &&
					player.stocks.hasWSE &&
					(function() {
						const stockData = peekPort<IStockData>(ns, PortNumber.StockData);
						return (
							player.money >= 100e6 ||
							(stockData ? stockData.stocks.some((stock) => stock.longPos.shares > 0 || stock.shortPos.shares > 0) : false)
						);
					})()
				)
			}
		]},
		{ name: "/hacknet/hashnet-server-daemon.js", runs: [
			{
				args: ["--hash-improve", "--hash-hacking", "--hash-bladeburner", "--hash-corp"],
				bonusArgs: [
					{ args: ["--hash-no-money", "--wild"], condition : () => hasPublicCorp() }
				],
				condition : async () => (
					player.bitnodeN !== 8 &&
					machine.ram.max >= 64 &&
					multipliers.HacknetNodeMoney >= 0.1
				)
			}
		]},
		{ name: "/singularity/backdoor-daemon.js", runs: [
			{
				args: ["--all-servers"],
				bonusArgs: [],
				condition : async () => machine.ram.max >= 128
			}
		]},
		{ name: "/bladeburner/bladeburner-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => (
					machine.ram.max >= 128 &&
					player.karma <= -54000 &&
					player.bitnodeN !== 8 &&
					(
						player.stats.agility >= 100 &&
						player.stats.defense >= 100 &&
						player.stats.dexterity >= 100 &&
						player.stats.strength >= 100
					)
				)
			}
		]},
		{ name: "/gangs/gang-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [
					{ args: ["--wild"], condition : async () => hasPublicCorp() }
				],
				condition : async () => (
					machine.ram.max >= 64 &&
					(playerInGang() || (player.bitnodeN === 2 && player.karma < -100) || player.karma <= -54000)
				)
			}
		]},
		{ name: "/corporation/corporation-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => (
					machine.ram.max >= 2048 &&
					multipliers.CorporationValuation >= 0.25 &&
					(player.hasCorp || player.money >= 300e9)
				)
			}
		]},
		{ name: "/staneks-gift/gift-constructor-daemon.js", runs: [
			// Start of game --- NOT 8
			{
				args: ["--crime-money"],
				bonusArgs: [],
				condition : async () => (
					player.bitnodeN !== 8 &&
					!playerInGang() &&
					stanekLargerThan(2, 3)
				)
			},
			// All game -- ONLY 8
			{
				args: ["stock-market-sucks-", "--hacking-speed"],
				bonusArgs: [
					{
						args: ["--hacking-skill"],
						condition: async () => stanekLargerThan(4, 4)
					},
					{
						args: ["--hacking-power", "--grow-power"],
						condition: async () => stanekLargerThan(6, 6)
					}
				],
				condition : async () => (
					player.bitnodeN === 8 &&
					stanekLargerThan(2, 3)
				)
			},
			// Post gang-creation -- NOT 6, 7 OR 8 -- HACKING IS GOOD
			{
				args: ["--hacking-speed"],
				bonusArgs: [
					{
						args: ["--hacknet-production", "--hacknet-cost"],
						condition: async () => (
							multipliers.HacknetNodeMoney >= 0.33 &&
							stanekLargerThan(4, 5)
						)
					},
					{
						args: ["--hacking-skill"],
						condition: async () => stanekLargerThan(5, 5)
					},
					{
						args: ["--hacking-power", "--grow-power"],
						condition: async () => stanekLargerThan(6, 7)
					}
				],
				condition : async () => (
					![6, 7, 8].includes(player.bitnodeN) &&
					stanekLargerThan(2, 3)
				)
			},
			// Post gang-creation -- 6 AND 7
			{
				args: ["--bladeburner-stats"],
				bonusArgs: [
					{
						args: ["--hacknet-production", "--hacknet-cost"],
						condition: async () => stanekLargerThan(5, 5)
					}
				],
				condition : async () => (
					[6, 7].includes(player.bitnodeN) &&
					playerInGang() &&
					stanekLargerThan(2, 3)
				)
			}
		]},
		{ name: "/staneks-gift/gift-charger-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition: async () => (await runDodgerScript<unknown[]>(ns, "/staneks-gift/dodger/activeFragments.js")).length > 0
			}
		]},
		{ name: "/servers/server-purchase-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [
					{ args: ["--wild"], condition : async () => hasPublicCorp() }
				],
				condition : async () => (
					serverLimit > 0 &&
					machine.ram.max >= 128 &&
					player.money >= 25e6
				)
			}
		]},
		{ name: "/singularity/ascension-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [
					{ args: ["--purchase"], condition : async () => {
						const totalWorth = peekPort<number>(ns, PortNumber.StockWorth);
						const lastAug = ns.getTimeSinceLastAug();
						return (totalWorth ? totalWorth >= 1e12 : false) && lastAug >= (1000 * 60 * 10);
					}}
				],
				condition : async () => machine.ram.max >= 2048
			}
		]},
		{ name: "/hacking/hack-daemon.js", runs: [
			{
				args: [],
				bonusArgs: [],
				condition : async () => (
					player.bitnodeN !== 8 &&
					machine.ram.max >= 128 &&
					machine.ram.max < 65536
				)
			},
			{
				args: ["--stock-mode"],
				bonusArgs: [],
				condition : async () => (
					machine.ram.max >= 65536 &&
					hackingGoal < 3000 * multipliers.WorldDaemonDifficulty * 2
				)
			},
			{
				args: ["--xp-farm-mode"],
				bonusArgs: [],
				condition : async () => (
					machine.ram.max >= 65536 &&
					hackingGoal >= 3000 * multipliers.WorldDaemonDifficulty * 2
				)
			}
		]}
	];
}

/*
 * ------------------------
 * > SCRIPT RUNNING FUNCTIONS
 * ------------------------
*/

/**
 * Run scripts which are marked as single-run only.
 * @param ns NS object parameters.
 */
async function runOneTimeScripts(ns : NS) : Promise<void> {
	for (const script of singleScripts) {
		for (const run of script.runs) {
			await processScriptRun(ns, script.name, run);
		}

		await ns.asleep(300);
	}
}

function tryRunScript(ns : NS, script : string, args : (string | number)[]) : void {
	if (!isRamAvailableForScript(ns, script)) return;
	if (isScriptAlreadyRunning(ns, script, args)) return;
	doRunScript(ns, script, args);
}

function isRamAvailableForScript(ns : NS, script : string) : boolean {
	if (getFreeRam(ns, "home") >= ns.getScriptRam(script)) {
		logger.log(`Sufficient RAM to start script: ${script}`, { type: MessageType.debugHigh });
		return true;
	} else {
		logger.log(`Insufficient RAM to start script: ${script}`, { type: MessageType.debugLow });
		return false;
	}
}

function isScriptAlreadyRunning(ns : NS, script : string, args : (string | number)[]) : boolean {
	if (ns.isRunning(script, "home", ...args)) {
		logger.log(`Script: ${script} already running with args: [${args}]`, { type: MessageType.debugLow });
		return true;
	} else {
		logger.log(`Script: ${script} not yet running with args: [${args}]`, { type: MessageType.debugHigh });
		return false;
	}
}

function doRunScript(ns : NS, script : string, args : (string | number)[]) : void {
	const successfulRun = ns.run(script, 1, ...args);
	if (successfulRun) {
		logger.log(`Started script: ${script} with args: [${args}]`, { type: MessageType.success, logToTerminal: true });
	} else {
		logger.log(`Failed to start script: ${script} with args: [${args}]`, { type: MessageType.fail });
	}
}

async function runScripts(ns : NS) : Promise<void> {
	for (const script of repeatScripts) {
		for (const run of script.runs) {
			await processScriptRun(ns, script.name, run);
		}

		await ns.asleep(750);
	}
}

async function processScriptRun(ns : NS, script : string, run : IAutoScriptCondition) : Promise<void> {
	const bonusArgs : (string | number)[] = [];
	for (const arg of run.bonusArgs) {
		if (await arg.condition()) bonusArgs.push(...arg.args);
	}

	if (await run.condition()) {
		tryRunScript(ns, script, [...run.args, ...bonusArgs]);
	} else {
		killOldScriptInstances(ns, script, [...run.args, ...bonusArgs])
	}
}

function killOldScriptInstances(ns : NS, script : string, args : (string | number)[]) : void {
	const oldInstances = ns.ps().filter((proc) => proc.filename === script && proc.args.every((arg) => args.includes(arg as string)) && args.every((arg) => proc.args.includes(arg as string)));
	if (oldInstances.length > 0) {
		const instance = oldInstances[0];
		logger.log(`Killing old instance of script: ${instance.filename} with args: [${instance.args}]`, { type: MessageType.warning, logToTerminal: true });
		ns.kill(instance.pid);
	}
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "STARTUP", "Starting Script Agent");

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
			`Script Daemon Helper\n`+
			`Description:\n` +
			`   Run scripts based on pre-defined conditions - automate the heck outta this game!\n` +
			`Usage:\n` +
			`   run /startup/script-daemon.js [args] [flags]\n` +
			`Flags:\n` +
			`   -h or --help    : boolean |>> Prints this.\n` +
			`   -v or --verbose : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug   : boolean |>> Sets logging level to 3 - even more verbosing logging.`
		);

		return;
	}

	await setupEnvironment(ns);

	logger.initialisedMessage(true, false);

	await runOneTimeScripts(ns);

	while (true) {
		await runScripts(ns);
		await ns.asleep(refreshPeriod);
	}
}
