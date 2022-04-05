import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const actionType = ns.args[1] as string;
    const actionName = ns.args[2] as string;

    const result = ns.bladeburner.startAction(actionType, actionName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
