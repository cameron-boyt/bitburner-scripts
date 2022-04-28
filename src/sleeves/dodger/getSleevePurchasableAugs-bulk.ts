import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const sleeveCount = JSON.parse(ns.args[1] as string) as number;

    const result = Array.from(Array(sleeveCount).keys(), (sleeve) => ns.sleeve.getSleevePurchasableAugs(sleeve));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
