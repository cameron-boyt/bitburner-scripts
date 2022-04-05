import { PlayerSkills, SleeveSkills } from '/../NetscriptDefinitions';
import { FactionWorkType, factionAvailableWorkTypes } from '/data-types/faction-data';
import { isPlayerSkills } from '/data-types/type-guards';

export function getBestWorkType(stats : PlayerSkills | SleeveSkills, faction : string) : FactionWorkType {
    const factionWorkTypes = factionAvailableWorkTypes.find(x => x.faction === faction);
    if (!factionWorkTypes) {
        throw new Error(`Unable to find work types for specified faction: ${faction}`);
    } else {
        const bestWork = [
            { type: FactionWorkType.Hacking, return: getFactionHackingWorkRepGain(stats) },
            { type: FactionWorkType.Security, return: getFactionSecurityWorkRepGain(stats) },
            { type: FactionWorkType.Field, return: getFactionFieldWorkRepGain(stats) },
            { type : FactionWorkType.None, return: 0 }
        ].filter((workType) => factionWorkTypes.types.includes(workType.type)).sort((a, b) => b.return - a.return)[0].type;
        return bestWork;
    }
}

function getFactionHackingWorkRepGain(stats : PlayerSkills | SleeveSkills) : number {
    const intelligence = (isPlayerSkills(stats) ? stats.intelligence : 1);
    return (
      (stats.hacking + intelligence / 3) / 975
    );
}

function getFactionSecurityWorkRepGain(stats : PlayerSkills | SleeveSkills) : number {
    const intelligence = (isPlayerSkills(stats) ? stats.intelligence : 1);
    return 0.9 * (
        stats.hacking / 975 +
        stats.strength / 975 +
        stats.defense / 975 +
        stats.dexterity / 975 +
        stats.agility / 975 +
        intelligence / 975
    ) / 4.5;
}

function getFactionFieldWorkRepGain(stats : PlayerSkills | SleeveSkills) : number {
    const intelligence = (isPlayerSkills(stats) ? stats.intelligence : 1);
    return 0.9 * (
        stats.hacking / 975 +
        stats.strength / 975 +
        stats.defense / 975 +
        stats.dexterity / 975 +
        stats.agility / 975 +
        stats.charisma / 975 +
        intelligence / 975
    ) / 5.5;
}
