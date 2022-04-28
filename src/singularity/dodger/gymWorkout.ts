import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const gymName = ns.args[1] as string;
    const skillName = ns.args[2] as string;

    const result = ns.singularity.gymWorkout(gymName, skillName);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
