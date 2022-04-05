import { NS } from '@ns'
import { ScriptLogger } from '/libraries/script-logger.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	const logger = new ScriptLogger(ns, "DATA-DAEMON", "Data Writer Daemon")


	const flags = ns.flags([
		["help", false]
	]);

	if (flags["help"]) {
		ns.tprintf(
			`Data Writer Daemon Helper:\n`+
			`Description:\n` +
			`   Every 10 minutes this script runs the data-writer scripts that store important, but costly to get, information in .txt files.\n` +
			`Usage: ${ns.getRunningScript().filename}`
		);

		return;
	}

    const DATA_SCRIPTS = [
        "/data/write-crime-data.js",
        "/data/write-hack-data.js",
        "/data/write-augment-data.js",
        "/data/write-bitnodemult-data.js",
        "/data/write-sourcefile-data.js",
		"/data/write-gangtask-data.js"
	];

	for (const script of DATA_SCRIPTS) {
		ns.run(script)
	}

	logger.initialisedMessage(true, false);
}
