import { BitNodeMultipliers, NS  } from '@ns'
import { Skill } from '/data-types/skill-data.js';
import { ISleeve } from '/data-types/sleeve-data';
import { runDodgerScript } from '/helpers/dodger-helper';
import { genPlayer } from '/libraries/player-factory';

export function getSleeveSensibleSkillApproximation(sleeve : ISleeve, skill : Skill, xpThreshold = 2500) : number {
    switch (skill) {
        case Skill.Hacking:   return Math.max(Math.floor(sleeve.info.mult.hacking   * (32 * Math.log(xpThreshold * sleeve.info.mult.hackingExp   + 534.5) - 200)), 1);
        case Skill.Strength:  return Math.max(Math.floor(sleeve.info.mult.strength  * (32 * Math.log(xpThreshold * sleeve.info.mult.strengthExp  + 534.5) - 200)), 1);
        case Skill.Defense:   return Math.max(Math.floor(sleeve.info.mult.defense   * (32 * Math.log(xpThreshold * sleeve.info.mult.defenseExp   + 534.5) - 200)), 1);
        case Skill.Dexterity: return Math.max(Math.floor(sleeve.info.mult.dexterity * (32 * Math.log(xpThreshold * sleeve.info.mult.dexterityExp + 534.5) - 200)), 1);
        case Skill.Agility:   return Math.max(Math.floor(sleeve.info.mult.agility   * (32 * Math.log(xpThreshold * sleeve.info.mult.agilityExp   + 534.5) - 200)), 1);
        case Skill.Charisma:  return Math.max(Math.floor(sleeve.info.mult.charisma  * (32 * Math.log(xpThreshold * sleeve.info.mult.charismaExp  + 534.5) - 200)), 1);
    }
}

export function getPlayerSensibleSkillApproximation(ns : NS, multipliers : BitNodeMultipliers, skill : Skill, xpThreshold = 1e6) : number {
    const player = ns.getPlayer();

    switch (skill) {
        case Skill.Hacking:   return ns.formulas.skills.calculateSkill(xpThreshold * player.hacking_exp_mult,   player.hacking_mult   * multipliers.HackingLevelMultiplier);
        case Skill.Strength:  return ns.formulas.skills.calculateSkill(xpThreshold * player.strength_exp_mult,  player.strength_mult  * multipliers.StrengthLevelMultiplier);
        case Skill.Defense:   return ns.formulas.skills.calculateSkill(xpThreshold * player.defense_exp_mult,   player.defense_mult   * multipliers.DefenseLevelMultiplier);
        case Skill.Dexterity: return ns.formulas.skills.calculateSkill(xpThreshold * player.dexterity_exp_mult, player.dexterity_mult * multipliers.DexterityLevelMultiplier);
        case Skill.Agility:   return ns.formulas.skills.calculateSkill(xpThreshold * player.agility_exp_mult,   player.agility_mult   * multipliers.AgilityLevelMultiplier);
        case Skill.Charisma:  return ns.formulas.skills.calculateSkill(xpThreshold * player.charisma_exp_mult,  player.charisma_mult  * multipliers.CharismaLevelMultiplier);
    }
}

/**
 * Get the current player level in a given skill.
 * @param ns NS object parameter.
 * @param skill Skill to get the level for.
 * @returns Current skill level.
 */
export function getPlayerSkillLevel(ns : NS, skill : Skill) : number {
    const player = genPlayer(ns);
    switch (skill) {
		case Skill.Hacking: return player.stats.hacking;
        case Skill.Strength: return player.stats.strength;
        case Skill.Defense: return player.stats.defense;
        case Skill.Dexterity: return player.stats.dexterity;
        case Skill.Agility: return player.stats.agility;
        case Skill.Charisma: return player.stats.charisma;
    }
}

/**
 * Train a given skill.
 * @param ns NS object parameter.
 * @param skill Skill to trian.
 * @param goal Goal skill level.
 * @returns True if training was successful; false otherwise.
 */
export async function doSkillTraining(ns : NS, skill : Skill, goal : number) : Promise<boolean> {
    const canTrain = await canTrainSkill(ns, skill);
    if (canTrain) {
        while (ns.isBusy()) { await ns.asleep(1000); }
        return doTrainSkill(ns, skill, goal);
    } else {
        return false;
    }
}

/**
 * Test if it is possble to train the specified skill.
 * @param ns NS object parameter.
 * @param skill Skill to train.
 * @returns True if the player is able to train; false otherwise.
 */
async function canTrainSkill(ns : NS, skill : Skill) : Promise<boolean> {
    let trainLocation;
    switch (skill) {
        case Skill.Charisma:
        case Skill.Hacking:
            trainLocation = getCityUniversity(ns);
            break;
        case Skill.Strength:
        case Skill.Defense:
        case Skill.Dexterity:
        case Skill.Agility:
            trainLocation = getCityGym(ns);
            break;
    }

    if (trainLocation) {
        return true;
    } else {
        return tryTravelToSector12(ns);
    }
}

/**
 * Get the university for the city the player is currently in.
 * @param ns NS object parameter.
 * @returns Name of university in the player's current city; if one exists.
 */
function getCityUniversity(ns : NS) : string | undefined {
    const player = genPlayer(ns);
    switch (player.city) {
        case "Sector-12": return "Rothman University";
        case "Aevum": return "Summit University";
        default: return;
    }
}

/**
 * Get the gym for the city the player is currently in.
 * @param ns NS object parameter.
 * @returns Name of gym in the player's current city; if one exists.
 */
function getCityGym(ns : NS) : string | undefined {
    const player = genPlayer(ns);
    switch (player.city) {
        case "Sector-12": return "Powerhouse Gym";
        case "Aevum": return "Snap Fitness Gym";
        case "Volhaven": return "Millenium Fitness Gym";
        default: return;
    }
}

/**
 * Try to travel to Sector-12 for access to a gym and university.
 * @param ns NS object parameter.
 * @returns True if travel was successful; false otherwise.
 */
async function tryTravelToSector12(ns : NS) : Promise<boolean> {
    const player = genPlayer(ns);
    if (player.money >= 200e3 * 10) {
        const result = await runDodgerScript<boolean>(ns, "/singularity/dodger/travelToCity.js", "Sector-12");
        return result;
    } else {
        return false;
    }
}

/**
 * Performing skill training for a given skill.
 * @param ns NS object parameter.
 * @param skill Skill to trian.
 * @param goal Goal skill level.
 * @returns True if training was successful; false otherwise.
 */
async function doTrainSkill(ns : NS, skill : Skill, goal : number) : Promise<boolean> {
    const location = ([Skill.Charisma, Skill.Hacking].includes(skill) ? getCityUniversity(ns) : getCityGym(ns));
    if (!location) return false;
    const script = "/singularity/dodger/" + ([Skill.Charisma, Skill.Hacking].includes(skill) ? "universityCourse.js" : "gymWorkout.js");
    const skillOrCourseName = getSkillOrCourseName(skill);

    while (getPlayerSkillLevel(ns, skill) < goal) {
        const result = await runDodgerScript<boolean>(ns, script, location, skillOrCourseName);
        if (!result) return false;
        await ns.asleep(5000);
        ns.stopAction();
    }

    return true;
}

/**
 * Get the name of the skill or course needed for training.
 * @param skill Skill to train.
 * @returns Name of course or skill name for training.
 */
function getSkillOrCourseName(skill : Skill) : string {
    switch (skill) {
        case Skill.Agility: return "Agility";
        case Skill.Charisma: return "Leadership";
        case Skill.Defense: return "Defense";
        case Skill.Dexterity: return "Dexterity";
        case Skill.Hacking: return "Algorithms";
        case Skill.Strength: return "Strength";
    }
}
