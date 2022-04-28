import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const symbols: string[] = JSON.parse(ns.args[1] as string);

    const result = symbols.map((sym) => [ns.stock.getAskPrice(sym), ns.stock.getBidPrice(sym)]);

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
