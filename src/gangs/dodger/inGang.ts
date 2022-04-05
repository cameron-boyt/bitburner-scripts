import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;

    const result = ns.gang.inGang();

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
