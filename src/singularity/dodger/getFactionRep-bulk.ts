import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const factions: string[] = JSON.parse(ns.args[1] as string);

    const result = factions.map((faction) => ns.singularity.getFactionRep(faction));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
