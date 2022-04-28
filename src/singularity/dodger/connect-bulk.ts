import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const hostnames: string[] = JSON.parse(ns.args[1] as string);

    let result = true;

    for (const hostname of hostnames) {
        result = ns.singularity.connect(hostname);
        if (!result) break;
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
