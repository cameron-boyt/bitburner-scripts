import { NS } from '@ns'
import { IBladeburnerAction, getBladeburnerActionTypeFromEnum } from '/data-types/bladeburner-data';

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const actions : IBladeburnerAction[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const action of actions) {
        result.push({
            name: action.name,
            estimatedSuccessChance: ns.bladeburner.getActionEstimatedSuccessChance(getBladeburnerActionTypeFromEnum(action.type), action.name)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
