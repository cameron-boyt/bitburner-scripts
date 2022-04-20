import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as number;
    const blackOps: string[] = JSON.parse(ns.args[1] as string);

    const result = blackOps.map((op) => ns.bladeburner.getBlackOpRank(op));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
