import { Skill } from '/data-types/skill-data';
import { readBitnodeMultiplierData } from '/data/read-bitnodemult-data';
import { getPlayerSensibleSkillApproximation } from '/helpers/skill-helper';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");

    const multipliers = await readBitnodeMultiplierData(ns);
    
	const sensibleHacking = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Hacking);
    ns.tprintf(`Hacking > ${sensibleHacking}`);
    
	const sensibleStrength = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Strength);
    ns.tprintf(`Strength > ${sensibleStrength}`);
    
	const sensibleDefense = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Defense);
    ns.tprintf(`Defense > ${sensibleDefense}`);
    
	const sensibleDexterity = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Dexterity);
    ns.tprintf(`Dexterity > ${sensibleDexterity}`);
    
	const sensibleAgility = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Agility);
    ns.tprintf(`Agility > ${sensibleAgility}`);
    
	const sensibleCharisma = getPlayerSensibleSkillApproximation(ns, multipliers, Skill.Charisma);
    ns.tprintf(`Charisma > ${sensibleCharisma}`);
}