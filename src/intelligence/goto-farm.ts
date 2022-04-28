import { NS } from "@ns";

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
 */

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");
    ns.tail();

    for (let a = 0; a < 1000; a++) {
        ns.singularity.goToLocation("Powerhouse Gym");
        await ns.asleep(1);
    }
}
