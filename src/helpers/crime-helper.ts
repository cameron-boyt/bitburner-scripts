import { CrimeStats, PlayerSkills, SleeveSkills } from '/../NetscriptDefinitions';
import { CrimeType } from '/data-types/crime-data';
import { isPlayerSkills } from '/data-types/type-guards';
import { readCrimeData } from '/data/read-crime-data';

/**
 * Return the name of the best crime of the provided type the player can perform.
 * @param ns NS object parameter.
 * @param type Type of crime to commit.
 * @param stats Player/Sleeve stats object.
 * @param successMult Player/Sleeve crime success multiplier; default to 1.
 * @param successThreshold Minimum success of crime; defaults to 0.
 * @param timeThreshold Maximum time (seconds) to execute crime; defaults to infinity.
 * @returns Crime data for the 'best' crime to perform.
 */
 export async function getBestCrime(ns : NS, type : CrimeType, stats : PlayerSkills | SleeveSkills, successMult = 1, successThreshold = 0, timeThreshold = Infinity) : Promise<CrimeStats> {
    const crimeData = await readCrimeData(ns);

    const crimes = crimeData.filter((crime) =>
        calculateCrimeChance(crime, stats, successMult) >= successThreshold &&
        crime.time <= timeThreshold * 1000
    );

    const bestCrime = crimes.reduce((a, b) => (calculateCrimeReturn(type, a, stats, successMult) > calculateCrimeReturn(type, b, stats, successMult) ? a : b));
    return bestCrime;
}

/**
 * Calculate the effective return, based on crime type, of a given crime.
 * @param type Crime type
 * @param crime Crime stats objects.
 * @param stats Player/Sleeve stats object.
 * @param successMult Player/Sleeve crime success multiplier.
 * @returns Effective return of the specified crime.
 */
function calculateCrimeReturn(type : CrimeType, crime : CrimeStats, stats : PlayerSkills | SleeveSkills, successMult : number) : number {
    switch (type) {
        case CrimeType.Money: return calculateCrimeChance(crime, stats, successMult) * crime.money / crime.time;
        case CrimeType.Karma: return calculateCrimeChance(crime, stats, successMult) * crime.karma / crime.time;
        case CrimeType.Kills: return calculateCrimeChance(crime, stats, successMult) * crime.kills / crime.time;
    }
}

/**
 * [RAM Dodger Function]
 *
 * Gets an approximate success chance for a given crime using the crime's skill success weights and supplied stats.
 * @param crime Crime data to calculate success chance from.
 * @param stats Player/Sleeve stats object.
 * @param successMult Crime success multiplier.
 * @returns Approximate crime success chance in decimal form (0 - 1).
 */
export function calculateCrimeChance(crime : CrimeStats, stats : PlayerSkills | SleeveSkills, successMult : number) : number {
    const intelligence = (isPlayerSkills(stats) ? stats.intelligence : 1);

    let chance = (
        crime.agility_success_weight * stats.agility +
        crime.charisma_success_weight * stats.charisma +
        crime.defense_success_weight * stats.defense +
        crime.dexterity_success_weight * stats.dexterity +
        crime.hacking_success_weight * stats.hacking +
        crime.strength_success_weight * stats.strength +
        0.025 * intelligence
    );

    chance /= 975;
    chance /= crime.difficulty;
    chance *= successMult;
    chance *= (1 + (Math.pow(intelligence, 0.8)) / 600);

    return Math.min(chance, 1);
}

/**
 * Get the stats of a crime.
 * @param ns NS object parameter.
 * @param crimeName Crime name.
 * @returns Stats of a crime.
 */
export async function getCrimeData(ns : NS, crimeName : string) : Promise<CrimeStats> {
    const crimeData = await readCrimeData(ns);
    const crime = crimeData.find(x => x.name === crimeName);
    if (!crime) throw new Error(`Unable to find data for crime: ${crimeName}`);
    return crime;
}
