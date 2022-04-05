import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;

    const sleeveCount = ns.args[1] as number;
    const result = [];

    for (let i = 0; i < sleeveCount; i++) {
        result.push(ns.sleeve.getSleevePurchasableAugs(i));
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
