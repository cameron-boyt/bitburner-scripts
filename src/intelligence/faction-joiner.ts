import { NS } from '@ns'

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const factions = [
        "ECorp",
        "MegaCorp",
        "KuaiGong International",
        "Four Sigma",
        "NWO",
        "Blade Industries",
        "OmniTek Incorporated",
        "Bachman & Associates",
        "Clarke Incorporated",
        "Fulcrum Secret Technologies"
    ]

    for (const faction of factions) {
        ns.joinFaction(faction)
    }

    ns.softReset(ns.getScriptName())
}
