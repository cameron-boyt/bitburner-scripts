import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
    const uid = ns.args[0] as string;
    const cities: string[] = JSON.parse(ns.args[1] as string);

    const result = cities.map((city) => ns.bladeburner.getCityEstimatedPopulation(city));

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), "w");
}
