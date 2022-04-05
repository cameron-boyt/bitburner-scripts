import { NS } from '../../../NetscriptDefinitions';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	const TARGET = ns.args[0] as string;
	const START_TIME = ns.args[1] as number;
	const STOCKS = ns.args[2] as boolean;

	const sleepTime = START_TIME - performance.now();

	if (sleepTime > 0) {
		await ns.asleep(sleepTime);
	}

	// Perform self-termination if out of sync due to some lag
	if (Math.abs(performance.now() - START_TIME) >= 100) {
		ns.print("Missed execution window - terminating.");
		ns.exit();
	}

	await ns.grow(TARGET, { stock: STOCKS });
}
