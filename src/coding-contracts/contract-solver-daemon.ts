import { NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { solveAlgorithmicStockTrader } from '/coding-contracts/solvers/algorithmic-stock-trader.js';
import { solveFindLargestPrimeFactor } from '/coding-contracts/solvers/find-largest-prime-factor.js';
import { solveSubarrayWithMaximumSum } from '/coding-contracts/solvers/subarray-with-maximum-sum.js';
import { solveMergeOverlappingIntervals } from '/coding-contracts/solvers/merge-overlapping-intervals.js';
import { solveTotalWaysToSum } from '/coding-contracts/solvers/total-ways-to-sum.js';
import { solveUniquePathsInAGrid } from '/coding-contracts/solvers/unique-paths-in-a-grid.js';
import { solveSpiraliseMatrix } from '/coding-contracts/solvers/spiralise-matrix.js';
import { solveFindAllValidMathExpressions } from '/coding-contracts/solvers/find-all-valid-math-expressions.js';
import { solveGenerateIPAddresses } from '/coding-contracts/solvers/generate-ip-addresses.js';
import { solveMinimumPathSumInATriangle } from '/coding-contracts/solvers/minimum-path-sum-in-a-triangle.js';
import { solveSanitiseParenthesesInExpression } from '/coding-contracts/solvers/sanitise-paretheses-in-expression.js';
import { getAllServers } from '/helpers/server-helper';
import { runDodgerScript } from '/helpers/dodger-helper';

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

/** Array of all server hostnames */
let allServers : string[];

interface IContract {
	name: string;
	hostname : string;
	type: string;
}

/** Array of active contracts */
let contracts : IContract[] = [];

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
	allServers = getAllServers(ns).filter((server) => server.substring(0, 6) !== "server");
	contracts = [];
}

/*
 * ------------------------
 * > ACTIVE CONTRACT GETTER FUNCTION
 * ------------------------
*/

/**
 * Get all the current active contracts waiting to be solved.
 * @param ns 'ns' namespace parameter.
 * @returns Array of contract objects; one for each contract found.
 */
async function getActiveContracts(ns : NS) : Promise<IContract[]> {
	const contracts : IContract[] = [];

	for (const server of allServers) {
		for (const contract of ns.ls(server, ".cct")) {
			const type = await runDodgerScript<string>(ns, "/coding-contracts/dodger/getContractType.js", contract, server);
			contracts.push({ name: contract, hostname: server, type: type });
		}
	}

	return contracts;
}

/*
 * ------------------------
 * > CONTRACT SOLUTION GETTER FUNCTION
 * ------------------------
*/

/**
 * Get the solution of a given coding contract.
 * @param type Contract type.
 * @param data Contract data.
 * @returns Solution of the contract.
 */
function getContractSolution(type : string, data : never) : unknown {
	switch(type) {
		case "Find Largest Prime Factor": 			return solveFindLargestPrimeFactor(data as number);
		case "Subarray with Maximum Sum": 			return solveSubarrayWithMaximumSum(data as number[]);
		case "Total Ways to Sum": 					return solveTotalWaysToSum(data as number);
		case "Generate IP Addresses": 				return solveGenerateIPAddresses(data as string);
		case "Merge Overlapping Intervals": 		return solveMergeOverlappingIntervals(data as number[][]);
		case "Algorithmic Stock Trader I": 			return solveAlgorithmicStockTrader(1, data as number[]);
		case "Algorithmic Stock Trader II": 		return solveAlgorithmicStockTrader(1000, data as number[]);
		case "Algorithmic Stock Trader III": 		return solveAlgorithmicStockTrader(2, data as number[]);
		case "Algorithmic Stock Trader IV": 		return solveAlgorithmicStockTrader(data[0] as number, data[1] as number[]);
		case "Unique Paths in a Grid I": 			return solveUniquePathsInAGrid(Array(data[0] as number).fill(Array(data[1] as number).fill(0)));
		case "Unique Paths in a Grid II":			return solveUniquePathsInAGrid(data as number[][]);
		case "Spiralize Matrix": 					return solveSpiraliseMatrix(data as number[][]);
		case "Find All Valid Math Expressions": 	return solveFindAllValidMathExpressions(data[0] as string, data[1] as number);
		case "Minimum Path Sum in a Triangle": 		return solveMinimumPathSumInATriangle(data as number[][]);
		case "Sanitize Parentheses in Expression":	return solveSanitiseParenthesesInExpression(data as string);
		default: 									return undefined;
	}
}

/*
 * ------------------------
 * > CONTRACT SOLUTION PROCESSOR FUNCTION
 * ------------------------
*/

async function processContractSolution(ns : NS, contract : IContract, solution : unknown) : Promise<void> {
	if (!solution) {
		logger.log(`Un-automated coding contract found: ${contract.hostname} --> ${contract.name}, type: ${contract.type}`, { type: MessageType.warning, sendToast: true });
	} else {
		const result = await runDodgerScript<boolean>(ns, "/coding-contracts/dodger/attempt.js", JSON.stringify(solution), contract.name, contract.hostname);
		if (result) {
			logger.log(`Successfully solved ${contract.name}!`, { type: MessageType.success, sendToast: true });
		} else {
			const remainingTries = await runDodgerScript<number>(ns, "/coding-contracts/dodger/getNumTriesRemaining.js", contract.name, contract.hostname);
			await logger.abort(`Attempt at ${contract.name} from ${contract.hostname} [${contract.type}] was unsuccessful. ${remainingTries} tries remaining`, { type: MessageType.error, logToTerminal: true, sendToast: true });
		}
	}
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "CONTRACT", "Coding Contract Solver Daemon");

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
			`Coding Contract Solver Daemon Helper\n`+
			`Description:\n` +
			`   Automatically seek out and solve any stray coding contracts.\n` +
			`Usage:\n` +
			`   run /coding-contracts/contract-solver.js [flags]\n` +
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
		contracts = await getActiveContracts(ns);
		for (const contract of contracts) {
			const data = await runDodgerScript<never>(ns, "/coding-contracts/dodger/getData.js", contract.name, contract.hostname);
			const solution = getContractSolution(contract.type, data);
			await processContractSolution(ns, contract, solution);
		}

		await ns.asleep(refreshPeriod);
	}
}
