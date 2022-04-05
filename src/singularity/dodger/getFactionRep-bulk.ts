import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const factions : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const faction of factions) {
        result.push({ faction: faction, rep: ns.getFactionRep(faction) });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
