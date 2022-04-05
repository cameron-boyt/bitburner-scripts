import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const state = ns.args[1] as boolean;

    const result : string[] = [];
    ns.gang.setTerritoryWarfare(state);

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
