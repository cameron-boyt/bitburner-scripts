import { NS } from '@ns'

export async function main(ns : NS) : Promise<void> {
    const uid = ns.args[0] as number;
    const cities = JSON.parse(ns.args[1] as string);

    const result = [];

    for (const city of cities) {
        result.push({
            city: city,
            population: ns.bladeburner.getCityEstimatedPopulation(city)
        });
    }

    const filename = `/tmp/${uid}.txt`;
    await ns.write(filename, JSON.stringify(result), 'w');
}
