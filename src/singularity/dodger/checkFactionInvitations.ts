import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;

    const result = ns.singularity.checkFactionInvitations();

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
