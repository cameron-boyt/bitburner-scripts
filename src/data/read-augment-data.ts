import { NS } from '@ns'
import { IAugmentInfo } from '/libraries/constants.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function readAugmentData(ns: NS) : Promise<IAugmentInfo[]> {
	ns.disableLog("ALL");

    if (!ns.fileExists("/data/augmentData.txt")) {
        throw new Error("Could not find file '/data/augmentData.txt'. Please run /data/write-augmentData-data.js.");
    }

    const augmentDataJson = ns.read("/data/augmentData.txt");
    const augmentData : IAugmentInfo[] = JSON.parse(augmentDataJson);

    return augmentData;
}
