import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const blackOps = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const blackOp of blackOps) {
        result.push({
            name: blackOp,
            rank: ns.bladeburner.getBlackOpRank(blackOp)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
