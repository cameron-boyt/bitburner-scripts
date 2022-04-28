import { NS } from "@ns";
import { ALL_FACTIONS, IAugmentInfo } from "/libraries/constants.js";

/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.disableLog("ALL");

    const allAugs: IAugmentInfo[] = [];

    for (const faction of ALL_FACTIONS) {
        for (const aug of ns.singularity.getAugmentationsFromFaction(faction)) {
            const exitingAugEntry = allAugs.find((x) => x.name === aug);
            if (exitingAugEntry) {
                exitingAugEntry.factions.push(faction);
            } else {
                allAugs.push({
                    name: aug,
                    factions: [faction],
                    cost: ns.singularity.getAugmentationPrice(aug),
                    repReq: ns.singularity.getAugmentationRepReq(aug),
                    preReq: ns.singularity.getAugmentationPrereq(aug),
                    stats: ns.singularity.getAugmentationStats(aug),
                });
            }
        }
    }

    const augmentDataJson = JSON.stringify(allAugs);

    ns.print(augmentDataJson);

    await ns.write("/data/augmentData.txt", [augmentDataJson], "w");
}
