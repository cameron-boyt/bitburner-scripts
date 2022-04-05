import { NS } from '@ns'
import { getBladeburnerActionTypeFromEnum, IBladeburnerAction } from '/data-types/bladeburner-data';

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const actions : IBladeburnerAction[] = JSON.parse(ns.args[1] as string);
    const highestLevel = ns.args[2] as number;

    const result = [];

    for (const action of actions) {
        result.push({
            name: action.name,
            repGain: ns.bladeburner.getActionRepGain(getBladeburnerActionTypeFromEnum(action.type), action.name, highestLevel)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
