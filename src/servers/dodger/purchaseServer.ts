import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const hostname = ns.args[1] as string;
    const ram = ns.args[2] as number;

    const result = ns.purchaseServer(hostname, ram);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
