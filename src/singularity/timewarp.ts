import { NS } from "@ns";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    ns.singularity.installAugmentations("/startup/script-daemon.js");
}
