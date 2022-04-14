import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.singularity.installAugmentations("/startup/script-daemon.js");
}
