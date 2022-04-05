import { NS } from '@ns'
import { getFactionWorkTypeFromEnum } from '/data-types/faction-data';
import { getSkillFromEnum, Skill } from '/data-types/skill-data.js';
import { getSleeveTaskTypeFromEnum, ISleeveData, ISleeveTaskCompanyWork, ISleeveTaskCrime, ISleeveTaskFactionWork, ISleeveTaskTrain, SleeveTaskType } from '/data-types/sleeve-data.js';
import { getSleeveSensibleSkillApproximation } from '/helpers/skill-helper';
import { peekPort, PortNumber } from '/libraries/port-handler.js';

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
    ns.tail();

	while (true) {
		ns.clearLog();

        const data = peekPort<ISleeveData>(ns, PortNumber.SleeveData);

        if (!data) {
            ns.print(` ╭─| FAIL | DISCONNECTED FROM PARENT SCRIPT |──────────────────────────────────────────────────────────────────────────────────────╮`);
            ns.print(` |  -->>-->>>  ______++++******          S L E E V E   S T A T U S                                      ******++++______  <<<--<<-- |`);
            ns.print(` |──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────|`);
            ns.print(` | > Please start the Sleeve Management Daemon script!                                                                            < |`);
            ns.print(` ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────| FAIL |─╯`);
            await ns.asleep(3000);
            continue;
        }

        let connectionStr = "| SUCCESS | CONNECTED |───────────────────";
        let smallConnectionStr = "| SUCCESS |";

        if (data.lastUpdate <= performance.now() - (data.refreshPeriod * 1.5)) {
            connectionStr = "| FAIL | DISCONNECTED FROM PARENT SCRIPT |";
            smallConnectionStr = "───| FAIL |";
        }

        ns.print(` ╭─${connectionStr}──────────────────────────────────────────────────────────────────────────────────────╮`);
        ns.print(` |  -->>-->>>  ______++++******          S L E E V E   S T A T U S                                      ******++++______  <<<--<<-- |`);
        ns.print(` ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯`);

        const fundStr = ns.nFormat(data.currentFunds, '$0.000a');
        ns.print(` ┌──────────────────────────────────────┐`);
        ns.print(` | TOTAL FUNDS AVAILABLE >> ${" ".repeat(11 - fundStr.length) + fundStr} |`);
        ns.print(` └──────────────────────────────────────┘`);

        const lines : string[] = [];
        lines.length = 50;
        lines.fill(" ");

		for (const s of data.sleeves) {
			const n = s.number;
            const hpCur = ns.nFormat(s.info.hp, '0a');
            const hpMax = ns.nFormat(s.info.maxHp, '0a');
            const agility = ns.nFormat(s.stats.agility, '0');
            const agilityGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Agility), '0');
            const expAgiGain = ns.nFormat(s.info.earningsForPlayer.workAgiExpGain, '0.00a');
            const charisma = ns.nFormat(s.stats.charisma, '0');
            const charismaGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Charisma), '0');
            const expChaGain = ns.nFormat(s.info.earningsForPlayer.workChaExpGain, '0.00a');
            const defense = ns.nFormat(s.stats.defense, '0');
            const defenseGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Defense), '0');
            const expDefGain = ns.nFormat(s.info.earningsForPlayer.workDefExpGain, '0.00a');
            const dexterity = ns.nFormat(s.stats.dexterity, '0');
            const dexterityGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Dexterity), '0');
            const expDexGain = ns.nFormat(s.info.earningsForPlayer.workDexExpGain, '0.00a');
            const hacking = ns.nFormat(s.stats.hacking, '0');
            const hackingGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Hacking), '0');
            const expHackGain = ns.nFormat(s.info.earningsForPlayer.workHackExpGain, '0.00a');
            const strength = ns.nFormat(s.stats.strength, '0');
            const strengthGoal = ns.nFormat(getSleeveSensibleSkillApproximation(s, Skill.Strength), '0');
            const expStrGain = ns.nFormat(s.info.earningsForPlayer.workStrExpGain, '0.00a');
            const shock = ns.nFormat(s.stats.shock, '0.00');
            const sync = ns.nFormat(s.stats.sync, '0.00');
            const task = s.task.type
            const totalTimeForTask = (s.info.timeWorked) / 1000;

            let extraInfoOne = "";
            let extraInfoTwo = "";
            let extraInfoThr = "";

            switch(task) {
                case SleeveTaskType.Crime: {
                    const crime = s.task.details as ISleeveTaskCrime;
                    const mps =  ns.nFormat(crime.moneyPerSecond, '$0.000a');
                    const mpsStr = `${" ".repeat(11 - mps.length) + mps}`;
                    const totalM = ns.nFormat(s.info.earningsForTask.workMoneyGain, '$0.000a');
                    const totalMStr = `${" ".repeat(11 - totalM.length) + totalM}`;
                    const kps = ns.nFormat(crime.karmaPerSecond, '0.000a');
                    const kpsStr = `${" ".repeat(10 - kps.length) + kps} Ka`;
                    const totalK = ns.nFormat(crime.karmaPerSecond * totalTimeForTask, '0.000a');
                    const totalKStr = `${" ".repeat(10 - totalK.length) + totalK} Ka`;
                    extraInfoOne = `${crime.name} (${ns.nFormat(crime.successChance, '0.00%')})`;
                    extraInfoTwo = `Δ: ${mpsStr}, ${kpsStr}`;
                    extraInfoThr = `Σ: ${totalMStr}, ${totalKStr}`;
                    break;
                }
                case SleeveTaskType.FactionWork: {
                    const work = s.task.details as ISleeveTaskFactionWork;
                    const rps = ns.nFormat(work.repGain, '0.000a');
                    const rpsStr = `${" ".repeat(10 - rps.length) + rps} Rp`;
                    const totalR = ns.nFormat(work.repGain * totalTimeForTask, '0.000a');
                    const totalRStr = `${" ".repeat(10 - totalR.length) + totalR} Rp`;
                    extraInfoOne = `${getFactionWorkTypeFromEnum(work.factionWork)} for ${work.faction}`;
                    extraInfoTwo = `Δ: ${rpsStr}`;
                    extraInfoThr = `Σ: ${totalRStr}`;
                    break;
                }
                case SleeveTaskType.CompanyWork: {
                    const work = s.task.details as ISleeveTaskCompanyWork;
                    const mps =  ns.nFormat(s.info.earningsForTask.workMoneyGain / totalTimeForTask, '$0.000a');
                    const mpsStr = `${" ".repeat(11 - mps.length) + mps}`;
                    const totalM = ns.nFormat(s.info.earningsForTask.workMoneyGain, '$0.000a');
                    const totalMStr = `${" ".repeat(11 - totalM.length) + totalM}`;
                    const rps = ns.nFormat(work.repGain, '0.000a');
                    const rpsStr = `${" ".repeat(10 - rps.length) + rps} Rp`;
                    const totalR = ns.nFormat(work.repGain * totalTimeForTask, '0.000a');
                    const totalRStr = `${" ".repeat(10 - totalR.length) + totalR} Rp`;
                    extraInfoOne = `${work.company}`;
                    extraInfoTwo = `Δ: ${mpsStr}, ${rpsStr}`;
                    extraInfoThr = `Σ: ${totalMStr}, ${totalRStr}`;
                    break;
                }
                case SleeveTaskType.Train: {
                    const train = s.task.details as ISleeveTaskTrain;
                    const mps =  ns.nFormat(s.info.earningsForTask.workMoneyGain / totalTimeForTask, '$0.000a');
                    const mpsStr = `${" ".repeat(11 - mps.length) + mps}`;
                    const totalM = ns.nFormat(s.info.earningsForTask.workMoneyGain, '$0.000a');
                    const totalMStr = `${" ".repeat(11 - totalM.length) + totalM}`;
                    const eps = ns.nFormat(train.expGain / totalTimeForTask, '0.000a');
                    const epsStr = `${" ".repeat(10 - eps.length) + eps} XP`;
                    const totalE = ns.nFormat(train.expGain, '0.000a');
                    const totalEStr = `${" ".repeat(10 - totalE.length) + totalE} XP`;
                    extraInfoOne = `${getSkillFromEnum(train.skill)} > ${train.location.trim()}`;
                    extraInfoTwo = `Δ: ${mpsStr}, ${epsStr}`;
                    extraInfoThr = `Σ: ${totalMStr}, ${totalEStr}`;
                    break;
                }
                case SleeveTaskType.Synchronise:
                    extraInfoOne = `Synchronising with Host...`;
                    extraInfoTwo = `Elapsed ${ns.nFormat(totalTimeForTask, '00:00:00')}`;
                    extraInfoThr = `Time Remaining: ${ns.nFormat((100 - s.stats.sync) / 0.001, '00:00:00')}`;
                    break;
                case SleeveTaskType.ShockRecovery:
                    extraInfoOne = `Recovering from Shock...`;
                    extraInfoTwo = `Elapsed ${ns.nFormat(totalTimeForTask, '00:00:00')}`;
                    extraInfoThr = `Time Remaining: ${ns.nFormat(s.stats.shock / 0.003, '00:00:00')}`;
                    break;
                default:
                    break;
            }

            const nStr = `Sleeve #${n}`;
            const hpCurStr = `${" ".repeat(3 - hpCur.length) + hpCur}`;
            const hpMaxStr = `${" ".repeat(3 - hpMax.length) + hpMax}`;
            const agilityStr = `${" ".repeat(4 - agility.length) + agility}`;
            const agilityGoalStr = `${" ".repeat(6 - agilityGoal.length) + agilityGoal}`;
            const expAgiGainStr = `${" ".repeat(7 - expAgiGain.length) + expAgiGain}`;
            const charismaStr = `${" ".repeat(4 - charisma.length) + charisma}`;
            const charismaGoalStr = `${" ".repeat(6 - charismaGoal.length) + charismaGoal}`;
            const expChaGainStr = `${" ".repeat(7 - expChaGain.length) + expChaGain}`;
            const defenseStr = `${" ".repeat(4 - defense.length) + defense}`;
            const defenseGoalStr = `${" ".repeat(6 - defenseGoal.length) + defenseGoal}`;
            const expDefGainStr = `${" ".repeat(7 - expDefGain.length) + expDefGain}`;
            const dexterityStr = `${" ".repeat(4 - dexterity.length) + dexterity}`;
            const dexterityGoalStr = `${" ".repeat(6 - dexterityGoal.length) + dexterityGoal}`;
            const expDexGainStr = `${" ".repeat(7 - expDexGain.length) + expDexGain}`;
            const hackingStr = `${" ".repeat(4 - hacking.length) + hacking}`;
            const hackingGoalStr = `${" ".repeat(6 - hackingGoal.length) + hackingGoal}`;
            const expHackGainStr = `${" ".repeat(7 - expHackGain.length) + expHackGain}`;
            const strengthStr = `${" ".repeat(4 - strength.length) + strength}`;
            const strengthGoalStr = `${" ".repeat(6 - strengthGoal.length) + strengthGoal}`;
            const expStrGainStr = `${" ".repeat(7 - expStrGain.length) + expStrGain}`;
            const shockStr = `${" ".repeat(6 - shock.length) + shock}%`;
            const syncStr = `${" ".repeat(6 - sync.length) + sync}%`;
            const taskStr = `${getSleeveTaskTypeFromEnum(task) + " ".repeat(15 - getSleeveTaskTypeFromEnum(task).length)}`;
            const extraInfoOneStr = `${extraInfoOne + " ".repeat(29 - extraInfoOne.length)}`;
            const extraInfoTwoStr = `${extraInfoTwo + " ".repeat(29 - extraInfoTwo.length)}`;
            const extraInfoThrStr = `${extraInfoThr + " ".repeat(29 - extraInfoThr.length)}`;

            const lineStart = (n < 4) ? 0 : 17;
            lines[0 + lineStart]  += `┌───────────────────────────────┐`;
			lines[1 + lineStart]  += `| [ ${nStr} ]    HP ${hpCurStr} / ${hpMaxStr} |`;
            lines[2 + lineStart]  += `| Shock ${shockStr}    Sync ${syncStr} |`;
            lines[3 + lineStart]  += `| ─────────── ──────── ──────── |`;
            lines[4 + lineStart]  += `| Stats      | Goal   | Sync XP |`;
            lines[5 + lineStart]  += `| Hack: ${hackingStr} | ${hackingGoalStr} | ${expHackGainStr} |`;
            lines[6 + lineStart]  += `| Str:  ${strengthStr} | ${strengthGoalStr} | ${expStrGainStr} |`;
            lines[7 + lineStart]  += `| Def:  ${defenseStr} | ${defenseGoalStr} | ${expDefGainStr} |`;
            lines[8 + lineStart]  += `| Dex:  ${dexterityStr} | ${dexterityGoalStr} | ${expDexGainStr} |`;
            lines[9 + lineStart]  += `| Agi:  ${agilityStr} | ${agilityGoalStr} | ${expAgiGainStr} |`;
            lines[10 + lineStart] += `| Cha:  ${charismaStr} | ${charismaGoalStr} | ${expChaGainStr} |`;
            lines[11 + lineStart] += `| ─────────── ──────── ──────── |`;
            lines[12 + lineStart] += `| Current Task: ${taskStr} |`;
            lines[13 + lineStart] += `| ${extraInfoOneStr} |`;
            lines[14 + lineStart] += `| ${extraInfoTwoStr} |`;
            lines[15 + lineStart] += `| ${extraInfoThrStr} |`;
            lines[16 + lineStart] += `└───────────────────────────────┘`;
		}

        for (const line of lines) {
            if (line !== " ") ns.print(line);
        }

        ns.print(` ╭─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮`);
        ns.print(` ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────${smallConnectionStr}─╯`);

		await ns.asleep(1000);
	}
}
