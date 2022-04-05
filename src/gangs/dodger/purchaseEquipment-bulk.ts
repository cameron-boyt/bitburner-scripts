import { NS } from '@ns'
import { IGangEquipmentOrder } from '/data-types/gang-data';

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const equipmentOrders : IGangEquipmentOrder[] = JSON.parse(ns.args[1] as string);

    const result : boolean[] = [];

    for (const order of equipmentOrders) {
        result.push(ns.gang.purchaseEquipment(order.member, order.equipment))
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
