import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const skills = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const skill of skills) {
        result.push({
            name: skill,
            cost: ns.bladeburner.getSkillUpgradeCost(skill)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
