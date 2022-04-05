import { CrimeStats, NS } from '@ns'
import { readCrimeData } from '/data/read-crime-data.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    
    //await printCrime(ns, "Mug", "Shoplift");
    //await printCrime(ns, "Homicide", "Mug");
    await printCrime(ns, "Homicide");
}

async function getWhenCrimeIsBetter(ns : NS, crime1 : string, crime2 : string) : Promise<void> {
    const crimeData = await readCrimeData(ns);
    const crimeA = crimeData.find(x => x.name === crime1);
    const crimeB = crimeData.find(x => x.name === crime2);


    const lowestStats = [100, 100, 100, 100];

    if (!crimeA || !crimeB) return;

    
    await printCrime(ns, crimeB.name);

    /*

    for (let agi = 20; agi < 40; agi++) {
        for (let def = 20; def < 40; def++) {
            for (let dex = 20; dex < 40; dex++) {    
                for (let str = 20; str < 40; str++) {
                    console.log([agi, def, dex, str]);
                    const crimeAReturn = calculateCrimeReturn(ns, crimeA, [agi, def, dex, str]);
                    const crimeBReturn = calculateCrimeReturn(ns, crimeB, [agi, def, dex, str]);

                    if (crimeBReturn > crimeAReturn && [agi, def, dex, str].reduce((a, b) => (a + b), 0) < lowestStats.reduce((a, b) => (a + b), 0)) {
                        lowestStats = [agi, def, dex, str]
                    }

                    //await ns.asleep(1);
                }
            }
        }
    }

    ns.tprintf(`${crime2} > ${crime1} when stats = ${lowestStats}`);

    */
}

function calculateCrimeReturn(ns : NS, crime : CrimeStats, stat : number[]) : number {
    let chance = (
        crime.agility_success_weight * stat[0] +
        crime.defense_success_weight * stat[1] +
        crime.dexterity_success_weight * stat[2] +
        crime.strength_success_weight * stat[3] +
        crime.hacking_success_weight * stat[4] +
        crime.charisma_success_weight * stat[5] +
        0.025 * 1
    );
    
    chance /= 975;
    chance /= crime.difficulty;
    chance *= 1;
    chance *= 1 + (1 * Math.pow(1, 0.8)) / 600;

    return Math.min(chance, 1)
}

async function printCrime(ns : NS, crime1 : string) : Promise<void> {
    const crimeData = await readCrimeData(ns);
    const crimeA = crimeData.find(x => x.name === crime1);
    //const crimeB = crimeData.find(x => x.name === crime2);

    if (!crimeA) return;

    for (let i = 0; i < 10000000; i++) {
        const a = ns.formulas.skills.calculateSkill(i * 15 * crimeA.agility_success_weight);
        const b = ns.formulas.skills.calculateSkill(i * 15 * crimeA.defense_success_weight);
        const c = ns.formulas.skills.calculateSkill(i * 15 * crimeA.dexterity_success_weight);
        const d = ns.formulas.skills.calculateSkill(i * 15 * crimeA.strength_success_weight);
        const e = ns.formulas.skills.calculateSkill(i * 15 * crimeA.hacking_success_weight);
        const f = ns.formulas.skills.calculateSkill(i * 15 * crimeA.charisma_success_weight);
        if (calculateCrimeReturn(ns, crimeA, [a,b,c,d,e,f]) > 0.15) {
            ns.tprintf(`${[a,b,c,d,e,f]}`);
            ns.tprintf(`agi, def, dex, str, hack, cha`);
            ns.tprintf(calculateCrimeReturn(ns, crimeA, [a,b,c,d,e,f]).toFixed(3));
            break;
        }
    }
}