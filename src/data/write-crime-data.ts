import { CrimeStats, NS } from '@ns'
import { CRIMES } from '/libraries/constants.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const crimeData : CrimeStats[] = [];

    for (const crime of CRIMES) {
        const stats = ns.getCrimeStats(crime);
        crimeData.push(stats);
    }

    const crimeDataJson = JSON.stringify(crimeData);

    ns.print(crimeDataJson);

    await ns.write("/data/crimeData.txt", [crimeDataJson], 'w');
}
