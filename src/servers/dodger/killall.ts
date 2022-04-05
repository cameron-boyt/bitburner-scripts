import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const hostname = ns.args[1] as string;

    const result = true;
    ns.killall(hostname);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
