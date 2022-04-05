import { BitNodeMultipliers, GangGenInfo, GangMemberInfo, GangTaskStats } from '/../NetscriptDefinitions';

/**
 * Calculate the wanted penalty for a gang.
 * @param gang Gang info object
 * @returns Wanted penalty applied to reputation and money gains.
 */
export function calculateWantedPenalty(gang : GangGenInfo): number {
	return gang.respect / (gang.respect + gang.wantedLevel);
}

/**
 * Calculate the respect gain return of performing a task with a given gang member.
 * @param gang Gang info object.
 * @param member Gang member info object.
 * @param task Gang task info objects.
 * @param multipliers Bitnode multipliers objects.
 * @returns Respect gain for a given task when performed by a given gang member.
 */
export function calculateRespectGain(gang : GangGenInfo, member : GangMemberInfo, task : GangTaskStats, multipliers : BitNodeMultipliers) : number {
	if (task.baseRespect === 0) return 0;
	const statWeight = (
		(task.hackWeight / 100) * member.hack +
		(task.strWeight / 100) * member.str +
		(task.defWeight / 100) * member.def +
		(task.dexWeight / 100) * member.dex +
		(task.agiWeight / 100) * member.agi +
		(task.chaWeight / 100) * member.cha
	) - (4 * task.difficulty);

	if (statWeight <= 0) return 0;
	const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.respect) / 100);
	const territoryPenalty = (0.2 * gang.territory + 0.8) * multipliers.GangSoftcap;
	if (isNaN(territoryMult) || territoryMult <= 0) return 0;
	const respectMult = calculateWantedPenalty(gang);
	return Math.pow(11 * task.baseRespect * statWeight * territoryMult * respectMult, territoryPenalty);
}

/**
 * Calculate the money gain return of performing a task with a given gang member.
 * @param gang Gang info object.
 * @param member Gang member info object.
 * @param task Gang task info objects.
 * @param multipliers Bitnode multipliers objects.
 * @returns Money gain for a given task when performed by a given gang member.
 */
export function calculateMoneyGain(gang : GangGenInfo, member : GangMemberInfo, task : GangTaskStats, multipliers : BitNodeMultipliers) : number {
	if (task.baseMoney === 0) return 0;
	const statWeight = (
		(task.hackWeight / 100) * member.hack +
		(task.strWeight / 100) * member.str +
		(task.defWeight / 100) * member.def +
		(task.dexWeight / 100) * member.dex +
		(task.agiWeight / 100) * member.agi +
		(task.chaWeight / 100) * member.cha
	) - (3.2 * task.difficulty);

	if (statWeight <= 0) return 0;
	const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.money) / 100);
	if (isNaN(territoryMult) || territoryMult <= 0) return 0;
	const respectMult = calculateWantedPenalty(gang);
	const territoryPenalty = (0.2 * gang.territory + 0.8) * multipliers.GangSoftcap;
	return Math.pow(5 * task.baseMoney * statWeight * territoryMult * respectMult, territoryPenalty);
}

/**
 * Calculate the wanted gain return of performing a task with a given gang member.
 * @param gang Gang info object.
 * @param member Gang member info object.
 * @param task Gang task info objects.
 * @returns Wanted gain for a given task when performed by a given gang member.
 */
export function calculateWantedLevelGain(gang : GangGenInfo, member : GangMemberInfo, task : GangTaskStats) : number {
	if (task.baseWanted === 0) return 0;
	const statWeight = (
		(task.hackWeight / 100) * member.hack +
		(task.strWeight / 100) * member.str +
		(task.defWeight / 100) * member.def +
		(task.dexWeight / 100) * member.dex +
		(task.agiWeight / 100) * member.agi +
		(task.chaWeight / 100) * member.cha
	) - (3.5 * task.difficulty);

	if (statWeight <= 0) return 0;
	const territoryMult = Math.max(0.005, Math.pow(gang.territory * 100, task.territory.wanted) / 100);
	if (isNaN(territoryMult) || territoryMult <= 0) return 0;
	if (task.baseWanted < 0) {
		return 0.4 * task.baseWanted * statWeight * territoryMult;
	}
	const calc = (7 * task.baseWanted) / Math.pow(3 * statWeight * territoryMult, 0.8);

	// Put an arbitrary cap on this to prevent wanted level from rising too fast if the
	// denominator is very small. Might want to rethink formula later
	return Math.min(100, calc);
}

/**
 * Calculate the total XP return of performing a task with a given gang member.
 * @param member Gang member info object.
 * @param task Gang task info objects.
 * @returns XP gain for a given task when performed by a given gang member.
 */
 export function calculateXpGain(member : GangMemberInfo, task : GangTaskStats) : number {
	const difficultyMult = Math.pow(task.difficulty, 0.9);
    const weightDivisor = 1500;

	let xp = 0;

	//xp += (task.hackWeight / weightDivisor) * difficultyMult * ((member.hack_mult - 1) / 4 + 1) * Math.max(Math.pow(member.hack_asc_mult / 2000, 0.5), 1);
	//xp += (task.strWeight  / weightDivisor) * difficultyMult * ((member.str_mult  - 1) / 4 + 1) * Math.max(Math.pow(member.str_asc_mult / 2000, 0.5), 1);
	xp += (task.defWeight  / weightDivisor) * difficultyMult * ((member.def_mult  - 1) / 4 + 1) * Math.max(Math.pow(member.def_asc_mult / 2000, 0.5), 1);
	//xp += (task.dexWeight  / weightDivisor) * difficultyMult * ((member.dex_mult  - 1) / 4 + 1) * Math.max(Math.pow(member.dex_asc_mult / 2000, 0.5), 1);
	//xp += (task.agiWeight  / weightDivisor) * difficultyMult * ((member.agi_mult  - 1) / 4 + 1) * Math.max(Math.pow(member.agi_asc_mult / 2000, 0.5), 1);
	//xp += (task.chaWeight  / weightDivisor) * difficultyMult * ((member.cha_mult  - 1) / 4 + 1) * Math.max(Math.pow(member.cha_asc_points / 2000, 0.5), 1);

	return xp;
}

/**
 * Get the stats of a given gang task name.
 * @param taskInfo List of gang task info.
 * @param taskName Task name.
 * @returns Task stats for the given task name.
 */
export function getGangTaskStats(taskInfo : GangTaskStats[], taskName : string) : GangTaskStats {
	const stats = taskInfo.find((task) => task.name === taskName);
	if (!stats) throw new Error(`Unable to find gang task stats for task: ${taskName}`);
	return stats;
}
