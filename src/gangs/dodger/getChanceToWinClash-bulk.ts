import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const gangNames : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const gang of gangNames) {
        result.push({
            name: gang,
            chance: ns.gang.getChanceToWinClash(gang)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
