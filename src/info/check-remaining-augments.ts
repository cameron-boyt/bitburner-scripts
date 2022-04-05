import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */ 
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    while (true) {
        ns.clearLog();

        const ownedAugs = ns.getOwnedAugmentations(true);

        const header = " ---- ~**~ ---- __~ REMAINING AUGMENTATIONS ~__ ---- ~**~ ---- ";
        ns.print(header);
        ns.print("");

        // Compose an array of all available augmentations
        for (const faction of ns.getPlayer().factions) {
            const factionAugs = ns.getAugmentationsFromFaction(faction).filter(x => x !== 'NeuroFlux Governor');
            const remainingAugs = factionAugs.filter(x => !ownedAugs.includes(x));

            if (remainingAugs.length > 0) {

                const buffer1 = " ".repeat(10 - Math.ceil(faction.length / 2));
                const buffer2 = " ".repeat(10 - Math.floor(faction.length / 2));

                const nameSection = `----[${buffer1}${faction}${buffer2}]----`;
                const progressSection = `----( ${factionAugs.length - remainingAugs.length} / ${factionAugs.length} )----`;

                ns.print(` ${nameSection}${" ".repeat(header.length - (nameSection.length + progressSection.length + 2))}${progressSection} `);
                
                for (const aug of remainingAugs) { ns.print(` - ${aug}`); }

            }
        }

        ns.print("");
        ns.print(header);

        await ns.asleep(15000);
    }
}