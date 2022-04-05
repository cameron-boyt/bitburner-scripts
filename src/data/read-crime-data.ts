import { CrimeStats, NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function readCrimeData(ns: NS) : Promise<CrimeStats[]> {
	ns.disableLog("ALL");

    if (!ns.fileExists("/data/crimeData.txt")) {
        throw new Error("Could not find file '/data/crimeData.txt'. Please run /data/write-crimeData-data.js.")
    }

    const crimeDataJson = ns.read("/data/crimeData.txt");
    const crimeData : CrimeStats[] = JSON.parse(crimeDataJson);
    return crimeData;
}
