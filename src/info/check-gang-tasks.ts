import { NS } from '@ns'

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	for (const task of ns.gang.getTaskNames()) {
		const stats = ns.gang.getTaskStats(task);

		const baseLength = 22;
		const baseEmpty = " ".repeat(baseLength);
		const baseMoney = " ".repeat(baseLength - 12 - stats.baseMoney.toString().length) + stats.baseMoney.toString();
		const baseRespect = " ".repeat(baseLength - 14 - stats.baseRespect.toString().length) + stats.baseRespect.toString();
		const baseWanted = " ".repeat(baseLength - 13 - stats.baseWanted.toString().length) + stats.baseWanted.toString();

		const difficulty = " ".repeat(baseLength - 11 - stats.difficulty.toString().length) + stats.difficulty.toString();

		const weightLength = 18;
		const weightAgi = " ".repeat(weightLength - 12 - stats.agiWeight.toString().length) + stats.agiWeight.toString();
		const weightCha = " ".repeat(weightLength - 12 - stats.chaWeight.toString().length) + stats.chaWeight.toString();
		const weightDef = " ".repeat(weightLength - 12 - stats.defWeight.toString().length) + stats.defWeight.toString();
		const weightDex = " ".repeat(weightLength - 12 - stats.dexWeight.toString().length) + stats.dexWeight.toString();
		const weightStr = " ".repeat(weightLength - 12 - stats.strWeight.toString().length) + stats.strWeight.toString();
		const weightHack = " ".repeat(weightLength - 13 - stats.hackWeight.toString().length) + stats.hackWeight.toString();

		const taskTypeLength = 15;
		const taskTypeEmpty = " ".repeat(taskTypeLength);
		const taskTypeCombat = " ".repeat(taskTypeLength - 7 - stats.isCombat.toString().length) + stats.isCombat.toString();
		const taskTypeHacking = " ".repeat(taskTypeLength - 8 - stats.isHacking.toString().length) + stats.isHacking.toString();

		ns.print(`Task: ${task}`);
		ns.print(`Base Money: ${baseMoney} | Agi Weight: ${weightAgi} | Combat: ${taskTypeCombat}`);
		ns.print(`Base Respect: ${baseRespect} | Cha Weight: ${weightCha} | Hacking: ${taskTypeHacking}`);
		ns.print(`Base Wanted: ${baseWanted} | Def Weight: ${weightDef} | ${taskTypeEmpty}`);
		ns.print(`${baseEmpty} | Dex Weight: ${weightDex} | ${taskTypeEmpty}`);
		ns.print(`Difficulty: ${difficulty} | Str Weight: ${weightStr} | ${taskTypeEmpty}`);
		ns.print(`${baseEmpty} | Hack Weight: ${weightHack} | ${taskTypeEmpty}`);
		ns.print("");
	}
}