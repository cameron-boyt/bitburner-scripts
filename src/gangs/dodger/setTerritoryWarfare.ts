import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const state: boolean = JSON.parse(ns.args[1] as string);

    ns.gang.setTerritoryWarfare(state);

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify([]), "w");
}
