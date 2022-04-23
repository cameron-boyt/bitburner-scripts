import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const equipmentNames: string[] = JSON.parse(ns.args[1] as string);

    const result = equipmentNames.map((equipment) => ns.gang.getEquipmentType(equipment));

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), "w");
}
