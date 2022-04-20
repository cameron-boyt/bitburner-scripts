import { NS } from "@ns";
import { IBladeburnerAction } from "/data-types/bladeburner-data";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as number;
    const actions: IBladeburnerAction[] = JSON.parse(ns.args[1] as string);

    const result = actions.map((action) => ns.bladeburner.getActionCountRemaining(action.type, action.name));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
