import { NS } from "@ns";
import { IBladeburnerAction } from "/bladeburner/bladeburner-data";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const actions: IBladeburnerAction[] = JSON.parse(ns.args[1] as string);
    const highestLevel: number = JSON.parse(ns.args[2] as string);

    const result = actions.map((action) => ns.bladeburner.getActionRepGain(action.type, action.name, highestLevel));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
