import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const memberNames : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const name of memberNames) {
        result.push(ns.gang.getMemberInformation(name));
    }

    const filename = `/tmp/${uid}.txt`;
    ns.write(filename, JSON.stringify(result), 'w');
}
