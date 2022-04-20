import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as number;
    const skills: string[] = JSON.parse(ns.args[1] as string);

    const result = skills.map((skill) => ns.bladeburner.getSkillLevel(skill));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
