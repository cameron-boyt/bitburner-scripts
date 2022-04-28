import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const sleeveNum: number = JSON.parse(ns.args[1] as string);
    const companyName = ns.args[2] as string;

    const result = ns.sleeve.setToCompanyWork(sleeveNum, companyName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
