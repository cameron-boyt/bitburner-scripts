import { AugmentationStats, NS } from '../../NetscriptDefinitions';
import { ALL_FACTIONS } from '/libraries/constants.js';

interface IAugInfo {
    name : string;
    faction : string;
    cost : number;
    repreq : number;
    stats : AugmentationStats;
}

/** @param {NS} ns 'ns' namespace parameter. */ 
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const flags = ns.flags([
        ["show-purchased", false],
        ["prefer-reputation", false],
        ["prefer-hacking", false],
        ["prefer-combat", false],
    ]);

    const allAugs : IAugInfo[] = [];
    const ownedAugs = ns.getOwnedAugmentations(true);

    for (const faction of ALL_FACTIONS) {        
        for (const aug of ns.getAugmentationsFromFaction(faction).filter(x => x !== "NeuroFlux Governor")) {
            allAugs.push({ name: aug, faction: faction, cost: ns.getAugmentationPrice(aug), repreq: ns.getAugmentationRepReq(aug), stats: ns.getAugmentationStats(aug) });
        }
    
    }
    

    if (flags["prefer-reputation"]) {
        const repAugs = allAugs.filter(x => x.stats.faction_rep_mult && (flags["show-purchased"] || !ownedAugs.includes(x.name))).map((aug) => {
            const augsWithName = allAugs.filter(x => x.name === aug.name)
            if (augsWithName.length > 1) {
                return augsWithName.reduce((a, b) => ((a.repreq - ns.getFactionRep(a.faction)) < (b.repreq - ns.getFactionRep(b.faction)) ? a : b));
            } else {
                return aug;
            }
        }).filter((e, i, a) => a.findIndex(x => x.name === e.name) === i).sort((a, b) => a.repreq - b.repreq);
        
        for (const aug of repAugs) {
            const ownedStr = (ownedAugs.includes(aug.name)) ? "\u2713" : "\u2717";
            ns.print(`${ownedStr} ${aug.name} ${aug.faction} ${ns.nFormat(aug.cost, '$0.00a')} ${ns.nFormat(aug.repreq, '0.00a')} ${aug.stats.faction_rep_mult}`);
        }
    }
    

    if (flags["prefer-hacking"]) {
        const hackAugs = allAugs.filter(x => x.stats.hacking_mult && (flags["show-purchased"] || !ownedAugs.includes(x.name))).map((aug) => {
            const augsWithName = allAugs.filter(x => x.name === aug.name)
            if (augsWithName.length > 1) {
                return augsWithName.reduce((a, b) => ((a.repreq - ns.getFactionRep(a.faction)) < (b.repreq - ns.getFactionRep(b.faction)) ? a : b));
            } else {
                return aug;
            }
        }).filter((e, i, a) => a.findIndex(x => x.name === e.name) === i).sort((a, b) => a.repreq - b.repreq);
        
        for (const aug of hackAugs) {
            const ownedStr = (ownedAugs.includes(aug.name)) ? "\u2713" : "\u2717";
            ns.print(`${ownedStr} ${aug.name} ${aug.faction} ${ns.nFormat(aug.cost, '$0.00a')} ${ns.nFormat(aug.repreq, '0.00a')} ${aug.stats.hacking_mult}`);
        }
    }
}