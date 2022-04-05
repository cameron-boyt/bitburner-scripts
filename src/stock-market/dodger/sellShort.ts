import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const sym = ns.args[1] as string;
    const shares = ns.args[2] as number;

    const result = ns.stock.sellShort(sym, shares);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
