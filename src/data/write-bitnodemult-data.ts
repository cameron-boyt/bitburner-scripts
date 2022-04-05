import { NS } from '@ns';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const multipliers = ns.getBitNodeMultipliers();

    const bitnodeMultipliersDataJSON = JSON.stringify(multipliers);

    ns.print(bitnodeMultipliersDataJSON);

    await ns.write("/data/bitnodeMultipliersData.txt", [bitnodeMultipliersDataJSON], 'w');
}
