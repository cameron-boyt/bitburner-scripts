import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const sleeveNum = ns.args[1] as number;
    const crimeName = ns.args[2] as string;

    const result = ns.sleeve.setToCommitCrime(sleeveNum, crimeName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
