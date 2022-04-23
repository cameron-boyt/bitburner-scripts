import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const equipmentOrders: [string, string[]][] = JSON.parse(ns.args[1] as string);

    const result = equipmentOrders.map((fullOrder) => fullOrder[1].map((order) => ns.gang.purchaseEquipment(fullOrder[0], order)));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
