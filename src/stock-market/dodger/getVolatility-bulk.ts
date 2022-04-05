import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const symbols : string[] = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const sym of symbols) {
        result.push({ sym: sym, volatility: ns.stock.getVolatility(sym) });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
