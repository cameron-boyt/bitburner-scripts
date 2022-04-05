export enum Skill {
	Hacking,
	Strength,
	Defense,
	Dexterity,
	Agility,
	Charisma
}

export function getSkillFromEnum(skill : Skill) : string {
    switch (skill) {
        case Skill.Hacking: return "Hacking";
        case Skill.Strength: return "Strength";
        case Skill.Defense: return "Defense";
        case Skill.Dexterity: return "Dexterity";
        case Skill.Agility: return "Agility";
        case Skill.Charisma: return "Charisma";
    }
}

export const SKILLS = [
    Skill.Agility,
    Skill.Charisma,
    Skill.Defense,
    Skill.Dexterity,
    Skill.Hacking,
    Skill.Strength
];
