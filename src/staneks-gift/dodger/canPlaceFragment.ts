import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const x = ns.args[1] as number;
    const y = ns.args[2] as number;
    const rotation = ns.args[3] as number;
    const id = ns.args[4] as number;

    const result = ns.stanek.canPlaceFragment(x, y, rotation, id);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
