import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const sleeveNum: number = JSON.parse(ns.args[1] as string);
    const gymName = ns.args[2] as string;
    const skillName = ns.args[3] as string;

    const result = ns.sleeve.setToGymWorkout(sleeveNum, gymName, skillName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
