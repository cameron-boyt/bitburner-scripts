import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const equipmentNames : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const equipment of equipmentNames) {
        result.push({
            name: equipment,
            cost: ns.gang.getEquipmentCost(equipment)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
