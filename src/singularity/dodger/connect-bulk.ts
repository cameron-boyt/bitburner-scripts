import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const hostnames = JSON.parse(ns.args[1] as string);

    let result = true;

    for (const hostname of hostnames) {
        result = ns.connect(hostname);
        if (!result) break;
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
