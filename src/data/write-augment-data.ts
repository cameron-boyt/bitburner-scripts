import { NS } from '@ns'
import { ALL_FACTIONS, IAugmentInfo } from '/libraries/constants.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const allAugs : IAugmentInfo[] = [];

    for (const faction of ALL_FACTIONS) {
        for (const aug of ns.getAugmentationsFromFaction(faction)) {
            const exitingAugEntry = allAugs.find(x => x.name === aug);
            if (exitingAugEntry) {
                exitingAugEntry.factions.push(faction);
            } else {
                allAugs.push({
                    name: aug,
                    factions: [faction],
                    cost: ns.getAugmentationPrice(aug),
                    repReq: ns.getAugmentationRepReq(aug),
                    preReq: ns.getAugmentationPrereq(aug),
                    stats: ns.getAugmentationStats(aug)
                });
            }
        }
    }

    const augmentDataJson = JSON.stringify(allAugs);

    ns.print(augmentDataJson);

    await ns.write("/data/augmentData.txt", [augmentDataJson], 'w');
}
