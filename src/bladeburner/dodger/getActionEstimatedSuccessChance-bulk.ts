import { NS } from "@ns";
import { IBladeburnerAction } from "/bladeburner/bladeburner-data";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const actions: IBladeburnerAction[] = JSON.parse(ns.args[1] as string);

    const result = actions.map((action) => ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
