import { BitNodeMultipliers, NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function readBitnodeMultiplierData(ns: NS) : Promise<BitNodeMultipliers> {
	ns.disableLog("ALL");

    if (!ns.fileExists("/data/bitnodeMultipliersData.txt")) {
        throw new Error("Could not find file '/data/bitnodeMultipliersData.txt'. Please run /data/write-bitnodeMultipliers-data.js.");
    }

    const bitnodeMultipliersDataJSON = ns.read("/data/bitnodeMultipliersData.txt");
    const bitnodeMultipliersData : BitNodeMultipliers = JSON.parse(bitnodeMultipliersDataJSON);
    return bitnodeMultipliersData;
}
