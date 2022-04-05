import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    ns.ps().forEach((proc) => {
        if (proc.filename !== ns.getRunningScript().filename) ns.kill(proc.pid);
    });

    await ns.asleep(1000);

    ns.installAugmentations("/startup/script-daemon.js");
}
