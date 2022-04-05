import { NS } from '@ns'
import { ScriptLogger, MessageType } from '/libraries/script-logger.js';
import { ALL_FACTIONS, CITY_FACTIONS, COMPANIES, COMPANY_JOBS, DONATE_REP_DIVISOR, FACTION_REQUIREMENTS, IAugmentInfo, IFactionReqs, ILevelReqs } from '/libraries/constants.js';
import { readAugmentData } from '/data/read-augment-data.js';
import { genPlayer, IPlayerObject } from '/libraries/player-factory.js';
import { genServer, IServerObject } from '/libraries/server-factory.js';
import { Skill } from '/data-types/skill-data';
import { doSkillTraining } from '/helpers/skill-helper';

// Script logger
let logger : ScriptLogger;

// Flags
const flagSchema : [string, string | number | boolean | string[]][] = [
	["h", false],
	["help", false],
    ["v", false],
    ["verbose", false],
    ["d", false],
    ["debug", false],
	["no-focus", false],
	["all", false],
	["prefer-reputation", false],
	["prefer-hacking", false],
	["prefer-combat", false],
	["prefer-crime", false],
	["prefer-hacknet", false],
	["prefer-bladeburner", false],
	["prefer-money", false],
	["only-red-pill", false],
	["only-faction", ""]
];

let help = false;
let verbose = false;
let debug = false;
let noFocus = false;
let all = false;
let preferReputation = false;
let preferHacking = false;
let preferCombat = false;
let preferCrime = false;
let preferHacknet = false;
let preferBladeburner = false;
let preferMoney = false;
let onlyRedPill = false;
let onlyFaction = "";

// This player and server objects 
let player : IPlayerObject;
let machine : IServerObject;

/* 
 * ------------------------
 * > DESIRED AUG CHECKER FUNCTIONS
 * ------------------------
*/

/**
 * Check if the provided augment is desired based on the initial augment criteria.
 * @param aug Augment Info object.
 * @returns True if the augment is desireable; false otherwise.
 */
function isDesiredAug(aug : IAugmentInfo) : boolean {
	return all || (
		(!onlyRedPill || (onlyRedPill && aug.name === "The Red Pill"))
		&&
		(onlyFaction === "" || (onlyFaction !== "" && aug.factions.includes(onlyFaction as string)))
		
		&&

		(
			(preferReputation && hasReputationStats(aug)) ||
			(preferHacking && (hasHackingStats(aug) || aug.name === "ECorp HVMind Implant")) ||
			(preferCombat && hasCombatStats(aug)) ||
			(preferCrime && hasCrimeStats(aug)) ||
			(preferHacknet && hasHacknetStats(aug)) ||
			(preferBladeburner && aug.factions.includes("Bladeburners")) ||
			(preferMoney && hasMoneyStats(aug))
		)
	);
}

/**
 * Check if the provided augment provides reputation bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies reputation bonuses; false otherwise.
 */
function hasReputationStats(aug : IAugmentInfo) : boolean {
	return !(!aug.stats.faction_rep_mult && !aug.stats.company_rep_mult);
}

/**
 * Check if the provided augment provides hacking bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies hacking bonuses; false otherwise.
 */
function hasHackingStats(aug : IAugmentInfo) : boolean {
	return !(
		!aug.stats.hacking_chance_mult && !aug.stats.hacking_exp_mult && !aug.stats.hacking_grow_mult &&
		!aug.stats.hacking_money_mult && !aug.stats.hacking_mult && !aug.stats.hacking_speed_mult
	);
}

/**
 * Check if the provided augment provides combat bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies combat bonuses; false otherwise.
 */
function hasCombatStats(aug : IAugmentInfo) : boolean {
	return !(
		!aug.stats.agility_exp_mult && !aug.stats.agility_mult && !aug.stats.defense_exp_mult && !aug.stats.defense_mult &&
		!aug.stats.dexterity_exp_mult && !aug.stats.dexterity_mult && !aug.stats.strength_exp_mult && !aug.stats.strength_mult
	);
}

/**
 * Check if the provided augment provides crime bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies crime bonuses; false otherwise.
 */
function hasCrimeStats(aug : IAugmentInfo) : boolean {
	return !(!aug.stats.crime_money_mult && !aug.stats.crime_success_mult);
}

/**
 * Check if the provided augment provides hacknet bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies hacknet bonuses; false otherwise.
 */
function hasHacknetStats(aug : IAugmentInfo) : boolean {
	return !(
		!aug.stats.hacknet_node_core_cost_mult && !aug.stats.hacknet_node_level_cost_mult && !aug.stats.hacknet_node_money_mult &&
		!aug.stats.hacknet_node_purchase_cost_mult && !aug.stats.hacknet_node_ram_cost_mult
	);
}

/**
 * Check if the provided augment provides money bonuses.
 * @param aug Augment Info object.
 * @returns True if the augment provies money bonuses; false otherwise.
 */
function hasMoneyStats(aug : IAugmentInfo) : boolean {
	return !(
		!aug.stats.work_money_mult && !aug.stats.crime_money_mult &&
		!aug.stats.hacking_money_mult && !aug.stats.hacknet_node_money_mult
	);
}


/* 
 * ------------------------
 * > REQUIREMENT PROCESSING FUNCTIONS
 * ------------------------
*/

function checkLevelRequirements(ns : NS, levelReq : ILevelReqs, offset? : number) : boolean {
	/*for (const skill in levelReq) {
		const lvl = levelReq[skill];
		const ofs = (offset ? offset : 0);
		if (!lvl) continue;
		if (getPlayerSkillLevel(ns, skill) < lvl + ofs) {
			logger.log(`Insufficient ${skill} level - ${getPlayerSkillLevel(ns, skill)} / ${lvl + ofs}`, { type: MessageType.warning });
			return false;
		}
	}*/

	return true;
}


async function processLevelRequirements(ns : NS, levelReq : ILevelReqs, offset? : number) : Promise<void> {
	if (levelReq.agility) {
		const goal = levelReq.agility + ((offset) ? offset : 0);
		if (player.stats.agility < goal) {
			logger.log(`Training to ${goal} Agility...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Agility, goal);
		}
	}

	if (levelReq.charisma) {
		const goal = levelReq.charisma + ((offset) ? offset : 0);
		if (player.stats.charisma < goal) {
			logger.log(`Training to ${goal} Charisma...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Charisma, goal); 
		}
	}

	if (levelReq.defense) {
		const goal = levelReq.defense + ((offset) ? offset : 0);
		if (player.stats.defense < goal) { 
			logger.log(`Training to ${goal} Defense...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Defense, goal); 
		}
	}

	if (levelReq.dexterity) {
		const goal = levelReq.dexterity + ((offset) ? offset : 0);
		if (player.stats.dexterity < goal) { 
			logger.log(`Training to ${goal} Dexterity...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Dexterity, goal); 
		}
	}

	if (levelReq.hacking) {
		const goal = levelReq.hacking + ((offset) ? offset : 0);
		if (player.stats.hacking < goal) { 
			logger.log(`Training to ${goal} Hacking...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Hacking, goal); 
		}
	}

	if (levelReq.strength) {
		const goal = levelReq.strength + ((offset) ? offset : 0);
		if (player.stats.strength < goal) { 
			logger.log(`Training to ${goal} Strength...`, { type: MessageType.debugLow });
			await doSkillTraining(ns, Skill.Strength, goal); 
		}
	}
}

/* 
 * ------------------------
 * > FACTION INVITE CHECKER FUNCTION
 * ------------------------
*/

function checkFactionInvites(ns : NS) : void {
	logger.log(`Checking faction invitations`, { type: MessageType.debugLow });
	for (const faction of ns.checkFactionInvitations()) {
		if (!CITY_FACTIONS.includes(faction)) ns.joinFaction(faction);
	}
}

/* 
 * ------------------------
 * > FACTION JOIN REQUIREMENT CHECKER FUNCTIONS
 * ------------------------
*/

function canJoinFactionNow(ns : NS, faction : string) : boolean {
	logger.log(`Testing if the player can join ${faction} immediately`, { type: MessageType.debugLow });
	const requirements = FACTION_REQUIREMENTS[faction];
	
	const objectivesMet = [
		!requirements.augCount || ns.getOwnedAugmentations(false).length >= requirements.augCount,
		!requirements.backdoor || ns.getServer(requirements.backdoor).backdoorInstalled,
		!requirements.companyRep || ns.getCompanyRep(requirements.companyRep.company) >= requirements.companyRep.rep,
		!requirements.hacknet,
		!requirements.highJobStatus,
		!requirements.karma || player.karma >= requirements.karma,
		!requirements.peopleKilled || player.peopleKilled >= requirements.peopleKilled,
		!requirements.levels || checkLevelRequirements(ns, requirements.levels),
		!requirements.location || requirements.location.includes(player.city),
		!requirements.money || player.money >= requirements.money
	];

	if (objectivesMet.every(x => x)) {
		logger.log(`Successfully joined ${faction} immediately`, { type: MessageType.debugHigh });
		return true;
	} else {
		logger.log(`Unable to join ${faction} immediately`, { type: MessageType.debugHigh });
		return false;
	}
}

async function processFactionRequirements(ns : NS, requirements : IFactionReqs) : Promise<boolean> {
	logger.log(`Trying to meet requirements to join faction: ${requirements.faction}`, { type: MessageType.info });

	if (!processAugmentCountRequirement(ns, requirements)) return false;
	if (!processLevelRequirement(ns, requirements)) return false;
	if (!await processBackdoorRequirement(ns, requirements)) return false;
	if (!await processKarmaRequirement(ns, requirements)) return false;
	if (!await processPeopleKilledRequirement(ns, requirements)) return false;
	if (!await processCompanyReputationRequirement(ns, requirements)) return false;
	if (!processHacknetLevelsRequirement(ns, requirements)) return false;
	if (!await processHighJobStatusRequirement(ns, requirements)) return false;
	if (!processLocationRequirement(ns, requirements)) return false;
	if (!processMoneyRequirement(ns, requirements)) return false;

	return true;
}

function processAugmentCountRequirement(ns : NS, requirements : IFactionReqs) : boolean {
	if (!requirements.augCount) return true;
	logger.log(`[${requirements.faction}] Processing augment count requirement`, { type: MessageType.debugLow });

	if (ns.getOwnedAugmentations(false).length >= requirements.augCount) {
		logger.log(`[${requirements.faction}] Passed augment count requirement`, { type: MessageType.debugLow });
		return true;
	} else {
		logger.log(`[${requirements.faction}] Failed augment count requirement`, { type: MessageType.debugLow });
		return false;
	}
}

function processLevelRequirement(ns : NS, requirements : IFactionReqs) : boolean {
	if (!requirements.levels) return true;	
	logger.log(`[${requirements.faction}] Processing level requirement`, { type: MessageType.debugLow });

	if (checkLevelRequirements(ns, requirements.levels)) { 
		logger.log(`[${requirements.faction}] Passed level requirement`, { type: MessageType.debugLow });
		return true; 
	} else {
		logger.log(`[${requirements.faction}] Failed level requirement`, { type: MessageType.debugLow });
		return false; 
	}
}

async function processBackdoorRequirement(ns : NS, requirements : IFactionReqs) : Promise<boolean> {
	if (!requirements.backdoor) return true;	
	logger.log(`[${requirements.faction}] Processing server backdoor requirement`, { type: MessageType.debugLow });

	const server = genServer(ns, requirements.backdoor);

	while (!server.isBackdoorInstalled) {
		if (player.stats.hacking >= server.hackLevel && server.hasRootAccess) {
			if (machine.ram.free >= BACKDOOR_SCRIPT_RAM && !ns.isRunning(BACKDOOR_SCRIPT, server.hostname)) {
				ns.run(BACKDOOR_SCRIPT, 1, server.hostname);
				await ns.asleep(5000);
			} else {
				logger.log("Insufficient RAM to start Backdoor script", { type: MessageType.warning, logToTerminal: true, sendToast: true });
				await ns.asleep(5000);
			}
		} else {
			logger.log(`${server.hostname} Root Access: ${server.hasRootAccess} | Hacking Level: ${player.stats.hacking} / ${server.hackLevel}`, { 
				type: MessageType.warning 
			});
			logger.log(`[${requirements.faction}] Failed backdoor requirement`, { type: MessageType.debugLow });
			return false; 
		}
	}

	logger.log(`[${requirements.faction}] Passed backdoor requirement`, { type: MessageType.debugLow });
	return true; 
}

async function processKarmaRequirement(ns : NS, requirements : IFactionReqs) : Promise<boolean> { 
	if (!requirements.karma) return true;	
	logger.log(`[${requirements.faction}] Processing karma requirement`, { type: MessageType.debugLow });
	
	while (player.karma < requirements.karma) {
		if (!ns.isRunning("/singularity/crime-committer.js", "home", "--karma", "--goal", `${requirements.karma}`)) {
			while (machine.ram.free < ns.getScriptRam("/singularity/crime-committer.js")) { await ns.asleep(1000); }
			ns.run("/singularity/crime-committer.js", 1, "--kills", "--goal", requirements.karma);
		}

		await ns.asleep(1000);
	}


	logger.log(`[${requirements.faction}] Passed karma requirement`, { type: MessageType.debugLow });
	return true;
}

async function processPeopleKilledRequirement(ns : NS, requirements : IFactionReqs) : Promise<boolean> {
	if (!requirements.peopleKilled) return true;	
	logger.log(`[${requirements.faction}] Processing kill count requirement`, { type: MessageType.debugLow });

	while (player.peopleKilled < requirements.peopleKilled) {
		if (!ns.isRunning("/singularity/crime-committer.js", "home", "--kills", "--goal", `${requirements.peopleKilled}`)) {
			while (machine.ram.free < ns.getScriptRam("/singularity/crime-committer.js")) { await ns.asleep(1000); }
			ns.run("/singularity/crime-committer.js", 1, "--kills", "--goal", requirements.peopleKilled);
		}

		await ns.asleep(1000);
	}

	logger.log(`[${requirements.faction}] Passed Kill count requirement`, { type: MessageType.debugLow });
	return true;
}

async function processCompanyReputationRequirement(ns : NS, requirements : IFactionReqs) : Promise<boolean> { 
	if (!requirements.companyRep) return true;
	logger.log(`[${requirements.faction}] Processing company reputation requirement`, { type: MessageType.debugLow });

	// Get the info we have on the company
	const company = requirements.companyRep.company;
	const companyInfo = COMPANY_JOBS.find((x) => (x.company === company));
	const rep = requirements.companyRep.rep;

	if (companyInfo) {
		let currentPosition = companyInfo.jobs.find(x => x.title === player.jobs[company]);

		// Check if we already work for this company
		if (!currentPosition) {
			const startPosition = companyInfo.jobs[0];

			if (startPosition) {
				logger.log(`Processing requirements to gain employment at ${company}`, { type: MessageType.debugLow });

				// Train stats to meet next job requirements
				if (startPosition.levelReq) {
					if (!checkLevelRequirements(ns, startPosition.levelReq, companyInfo.levelOffset)) { return false; }
				}

				// Apply for first position!
				if (!ns.applyToCompany(company, startPosition.field)) {
					await logger.abort("Failed to join company", { type: MessageType.error });
				}

				logger.log(`Gained employment as ${startPosition.title} at ${company}.`);
				currentPosition = startPosition;
			} else {
				await logger.abort("Unable to find entry position", { type: MessageType.error });
			}
		}

		while (ns.getCompanyRep(company) < rep) {

			// Check if we're elligible for promotion
			const nextPositionTitle = companyInfo.jobs.find(x => x.title === currentPosition?.title)?.nextPosition;
			const nextPositionInfo = companyInfo.jobs.find(x => x.title === nextPositionTitle);

			logger.log(`Processing requirements to receive promotion to: ${nextPositionTitle}\n` +
						`        | ${Math.round(ns.getCompanyRep(company))} / ${rep} company reputation`, { type: MessageType.debugLow }
			);

			// Do we meet the promotion requirements?
			if (nextPositionInfo) {
				
				// If either there isn't a reputation requirement, or there is and we meet it...
				if (!nextPositionInfo.repReq || (nextPositionInfo.repReq && ns.getCompanyRep(company) > nextPositionInfo.repReq)) {

					logger.log("Promotion reputation requirement met", { type: MessageType.info })

					// Train stats to meet next job requirements -- or break out if we have hit the required company threshold for faction invite
					if (nextPositionInfo.levelReq && ns.getCompanyRep(company) < rep) {
						logger.log("Processing skill level requirements for promotion", { type: MessageType.debugLow });
						await processLevelRequirements(ns, nextPositionInfo.levelReq, companyInfo.levelOffset);
					}

					// Apply for next position!
					if (!ns.applyToCompany(company, nextPositionInfo.field)) {
						await logger.abort("Failed to apply for promotion", { type: MessageType.error });
					} else {
						logger.log(`Promoted to ${nextPositionInfo.title}`, { type: MessageType.info })
						currentPosition = nextPositionInfo;
					}
				}
			} 

			// Work, work, work!
			ns.workForCompany(company, true);
			await ns.asleep(60000);
			
			// Stop for a bit to allow work gains to update
			ns.stopAction();
		}
	}

	logger.log(`[${requirements.faction}] Passed company reputation requirement`, { type: MessageType.debugLow });
	return true;
}

function processHacknetLevelsRequirement(ns : NS, requirements : IFactionReqs) : boolean {
	if (!requirements.hacknet) return true;	
	logger.log(`[${requirements.faction}] Processing hacket level requirement`, { type: MessageType.debugLow });

	let hacknetLevels = 0;
	let hacknetRam = 0;
	let hacknetCores = 0;

	for (let i = 0; i < ns.hacknet.numNodes(); i++) {
		const stats = ns.hacknet.getNodeStats(i);

		hacknetLevels += stats.level;
		hacknetRam += stats.ram;
		hacknetCores += stats.cores;
	}

	if (hacknetLevels >= 100 && hacknetRam >= 8 && hacknetCores >= 4) {
		logger.log(`[${requirements.faction}] Passed hacknet level requirement`, { type: MessageType.debugLow });
		return true;
	} else {
		logger.log(`Insufficient Hacknet upgrades - Levels ${hacknetLevels} / 100 | RAM ${hacknetRam} / 8 | Cores ${hacknetCores} / 4`, { type: MessageType.warning });
		logger.log(`[${requirements.faction}] Failed hacknet level requirement`, { type: MessageType.debugLow });
		return false;
	}
}

async function processHighJobStatusRequirement(ns : NS, requirements : IFactionReqs) : Promise<boolean> {
	if (!requirements.highJobStatus) return true;
	logger.log(`[${requirements.faction}] Processing job status requirement`, { type: MessageType.debugLow });

	// Get the company with which we have the most reputation
	const company = COMPANIES.map((x) => ({ company: x, rep: ns.getCompanyRep(x) })).reduce((a, b) => (a.rep >= b.rep ? a : b)).company;
	const companyInfo = COMPANY_JOBS.find(x => x.company === company);

	if (companyInfo) {
		let currentPosition = companyInfo.jobs.find(x => x.title === player.jobs[company]);
		const lastPostition = companyInfo.jobs.at(-1)?.title;

		// Check if we already work for this company
		if (!currentPosition) {
			const startPosition = companyInfo.jobs[0];

			if (startPosition) {
				logger.log(`Processing requirements to gain employment at ${company}`, { type: MessageType.debugLow });

				// Train stats to meet next job requirements
				if (startPosition.levelReq) {
					await processLevelRequirements(ns, startPosition.levelReq, companyInfo.levelOffset);
				}

				// Apply for first position!
				if (!ns.applyToCompany(company, startPosition.field)) {
					await logger.abort("Failed to join company", { type: MessageType.error });
				}

				logger.log(`Gained employment as ${startPosition.title} at ${company}.`);
				currentPosition = startPosition;
			} else {
				await logger.abort("Unable to find entry position", { type: MessageType.error });
			}
		}

		logger.log(`Aiming for company position '${lastPostition}' at ${company}`, { type: MessageType.info });
		logger.log(`Current company position: ${currentPosition}`, { type: MessageType.info });

		while (currentPosition?.title !== lastPostition) {

			// Check if we're elligible for promotion
			const nextPositionTitle = companyInfo.jobs.find(x => x.title === currentPosition?.title)?.nextPosition;
			let nextPositionInfo = companyInfo.jobs.find(x => x.title === nextPositionTitle);

			logger.log(`Processing requirements to receive promotion to: ${nextPositionTitle}`, { type: MessageType.debugLow });

			// Do we meet the promotion requirements?
			if (nextPositionInfo) {
				
				// If either there isn't a reputation requirement, or there is and we meet it...
				if (!nextPositionInfo.repReq || (nextPositionInfo.repReq && ns.getCompanyRep(company) > nextPositionInfo.repReq)) {

					logger.log("Promotion reputation requirement met", { type: MessageType.info })

					// Train stats to meet next job requirements
					if (nextPositionInfo.levelReq) {
						logger.log("Processing skill level requirements for promotion", { type: MessageType.debugLow });
						await processLevelRequirements(ns, nextPositionInfo.levelReq, companyInfo.levelOffset);
					}

					// Apply for next position!
					if (!ns.applyToCompany(company, nextPositionInfo.field)) {
						await logger.abort("Failed to apply for promotion", { type: MessageType.error });
					} else {
						logger.log(`Promoted to ${nextPositionInfo.title}`, { type: MessageType.info })
						currentPosition = nextPositionInfo;
						nextPositionInfo = companyInfo.jobs.find(x => x.title === currentPosition?.nextPosition);
					}
				}
			} 

			// Log current reputation progress
			logger.log(`${Math.round(ns.getCompanyRep(company))} / ${nextPositionInfo?.repReq} company reputation`, { type: MessageType.debugLow })

			// Work, work, work!
			ns.workForCompany(company, true);
			await ns.asleep(60000);
			
			// Stop for a bit to allow work gains to update
			ns.stopAction();
		}
	}

	logger.log(`[${requirements.faction}] High job status requirement met`, { type: MessageType.info });
	return true;
}

function processLocationRequirement(ns : NS, requirements : IFactionReqs) : boolean {
	if (!requirements.location) return true;
	logger.log(`[${requirements.faction}] Processing location requirement`, { type: MessageType.debugLow });

	if (player.factions.joinedFactions.some(x => CITY_FACTIONS.includes(x))) return false;

	if (requirements.location.includes(player.city)) {
		logger.log(`[${requirements.faction}] Passed location requirement`, { type: MessageType.debugLow });
		return true;
	} else {
		if (player.money > 200e3) {
			ns.travelToCity(requirements.location[0]);
			logger.log(`[${requirements.faction}] Passed location requirement`, { type: MessageType.debugLow });
			return true;
		} else {
			logger.log(`Insufficient funds to travel to ${requirements.location[0]} - require ${ns.nFormat(200e3, '$0.00a')}`, { type: MessageType.warning });
			logger.log(`[${requirements.faction}] Failed location requirement`, { type: MessageType.debugLow });
			return false;
		}
	}
}

function processMoneyRequirement(ns : NS, requirements : IFactionReqs) : boolean {
	if (!requirements.money) return true;
	logger.log(`[${requirements.faction}] Processing money requirement`, { type: MessageType.debugLow });

	if (player.money >= requirements.money) { 
		logger.log(`[${requirements.faction}] Passed money requirement`, { type: MessageType.debugLow });
		return true; 
	} else {
		logger.log(`Insufficient funds for faction invitation - require ${ns.nFormat(requirements.money, '$0.00a')}`, { type: MessageType.warning });
		logger.log(`[${requirements.faction}] Failed money requirement`, { type: MessageType.debugLow });
		return false; 
	}
}

/**
 * Given some requirements, complete various tasks such that by the player is able to join the specified faction.
 * @param {NS} ns 'ns' namespace parameter.
 * @param logger Logger object to output messages to the console.
 * @param faction Faction to try and join.
 */
async function tryJoinFaction(ns : NS, logger : ScriptLogger, faction : string) : Promise<boolean> {
	if (isInFaction(faction)) {
		logger.log(`Already in faction`, { type: MessageType.debugHigh });
		return true;
	}

	logger.log(`Trying to join ${faction} by meeting requirements`, { type: MessageType.debugLow });
	const requirements = FACTION_REQUIREMENTS[faction];
	if (!requirements) return false;


	const requirementsMet = await processFactionRequirements(ns, requirements);

	if (requirementsMet) {
		logger.log(`Successfully met requirements to join ${faction}`, { type: MessageType.debugLow });
		logger.log("Awaiting faction invitation acceptence", { type: MessageType.info });

		while (!isInFaction(faction)) {
			for (const faction of ns.checkFactionInvitations()) {
				if (faction === requirements.faction) ns.joinFaction(faction);
			}
			
			await ns.asleep(1000);
		}
	
		logger.log("Invitation accepted", { type: MessageType.success });
	
		return true;
	} else {
		logger.log(`Failed to meet requirements to join ${faction}`, { type: MessageType.debugLow });
		return false
	}	
}

function isInFaction(faction : string) : boolean {
	return player.factions.joinedFactions.includes(faction);
}

async function getDesireableAugmentations(ns : NS) : Promise<IAugmentInfo[]> {
	logger.log("Getting all desireable augmentations", { type: MessageType.debugLow });

	// Get a list of current owned and purchased augmentations
	const ownedAugs = ns.getOwnedAugmentations(true);

	// Can't do normal work for the faction we're in a gang with, so filter that out
	const gangFaction = ns.gang.inGang() ? ns.gang.getGangInformation().faction : "";

	// If the player is already in a city faction, filter them from the augmentation search process following
	const inCityFaction = player.factions.joinedFactions.some(x => CITY_FACTIONS.includes(x));

	// Compile a list of all augments
	let allAugs = await readAugmentData(ns);

	// NeuroFlux bad
	allAugs = allAugs.filter(x => x.name !== "NeuroFlux Governor");

	// Sort factions list for each aug by count of desired augs obtainable from that faction
	allAugs.forEach((aug) => {
		aug.factions = aug.factions.sort((a, b) => (
			allAugs.filter(x => x.factions.includes(b) && isDesiredAug(x)).length - allAugs.filter(x => x.factions.includes(a) && isDesiredAug(x)).length
		));
	});

	const facAugCount : { [key : string] : number } = {};
	for (const aug of allAugs) {
		if (facAugCount[aug.factions[0]]) {
			facAugCount[aug.factions[0]] += 1
		} else {
			facAugCount[aug.factions[0]] = 1
		}
	}

	// Construct a list of desireable augs and their properties
	const desiredAugs : IAugmentInfo[] = [];
	const favourAugs : IAugmentInfo[] = [];

	// For every faction (excluding the player's gang faction, plus city factions if the player is already in one) get all augments offered
	for (const faction of ALL_FACTIONS.filter(x => x !== gangFaction && !(inCityFaction && CITY_FACTIONS.includes(x)))) {

		// Get all augs from this faction
		const augsFromFaction = allAugs.filter((aug) => aug.factions[0] === faction);

		// Filter based on select criteria
		const desirableAugsFromFaction = augsFromFaction.filter((aug) =>
			isDesiredAug(aug) &&
			!ownedAugs.includes(aug.name) &&
			aug.factions.every(f => ns.getFactionRep(f) < aug.repReq) &&
			aug.preReq.every((y) => {
				const preReqAug = allAugs.find(z => z.name === y);
				return ownedAugs.includes(y) || (preReqAug && preReqAug.factions.some(z => ns.getFactionRep(z) > preReqAug.repReq));
			})
		);

		// Calculate how much reputation we need to reach the next faction favour threshold
		let repForNextFavourThreshold = Infinity;
		let favourAug : IAugmentInfo | undefined;

		for (const favourThreshold of [30, 75, 150]) { 

			// If we have less than x favour... 
			if (ns.getFactionFavor(faction) < favourThreshold) {
				const totalRepRequired = 25000 * (Math.pow(1.02, favourThreshold) - 1);
				const totalRepFromFavour = 25000 * (Math.pow(1.02, ns.getFactionFavor(faction)) - 1);
				const totalRepNow = (25000 * (Math.pow(1.02, ns.getFactionFavor(faction)) - 1)) + ns.getFactionRep(faction);

				repForNextFavourThreshold = totalRepRequired - totalRepFromFavour;

				if (totalRepNow < totalRepRequired) {
					favourAug = {
						name: `Favour Threshold for ${faction}`,
						factions: [faction],
						cost: 0,
						repReq: repForNextFavourThreshold,
						preReq: [],
						stats: {}
					};
				}
				break;
			}
		}

		if (desirableAugsFromFaction.length > 0) {

			// Push all desirable augs from this faction
			desiredAugs.push(...desirableAugsFromFaction.filter((aug) => 
				desiredAugs.findIndex(x => x.name === aug.name) < 0 &&
				aug.repReq <= repForNextFavourThreshold)
			);
	
			// Push the favour threshold aug - if there is one
			if (favourAug) favourAugs.push(favourAug);
		}
	}
	
	// Sort by reputation left to gain in ascending order, then append the favour threshold augs in order of difficulty to join the faction
	const augmentations = [
		...desiredAugs.sort((a, b) => {
			const diffModA = FACTION_REQUIREMENTS[a.factions[0]].difficulty * 2.75;
			const diffModB = FACTION_REQUIREMENTS[b.factions[0]].difficulty * 2.75;
			return ((a.repReq * diffModA) - ns.getFactionRep(a.factions[0]) - ((b.repReq * diffModB) - ns.getFactionRep(b.factions[0])))
		}),
		...favourAugs.sort((a, b) => {
			if (FACTION_REQUIREMENTS[a.factions[0]].companyRep && FACTION_REQUIREMENTS[b.factions[0]].companyRep) {
				return facAugCount[b.factions[0]] - facAugCount[a.factions[0]];
			} else {
				return FACTION_REQUIREMENTS[a.factions[0]].difficulty - FACTION_REQUIREMENTS[b.factions[0]].difficulty;
			}
		})
	];

	return augmentations;
}

async function tryGetOrJoinNextAugFaction(ns : NS, aug : IAugmentInfo) : Promise<string | undefined> {
	logger.log("Trying to get or join the next augmentation faction", { type: MessageType.debugLow });
	if (canJoinFactionNow(ns, aug.factions[0])) {
		return aug.factions[0];
	} else {
		return tryJoinNextAugFaction(ns, aug);
	}
}

async function tryJoinNextAugFaction(ns : NS, aug : IAugmentInfo) : Promise<string | undefined> {
	logger.log(`Trying to join an augmentation faction by meeting requirements`, { type: MessageType.debugLow });
	for (const f of aug.factions.sort((a, b) => FACTION_REQUIREMENTS[a].difficulty - FACTION_REQUIREMENTS[b].difficulty)) {
		const hasJoinedFaction = await tryJoinFaction(ns, logger, f);
		if (hasJoinedFaction) return f;
	}

	return;
}

/* 
 * ------------------------
 * > FACTION REPUTATION GAIN FUNCTIONS
 * ------------------------
*/

function doDonation(ns : NS, faction : string, aug : IAugmentInfo) : boolean {
	logger.log("Trying to do donation", { type: MessageType.debugHigh });
	const currRep = ns.getFactionRep(faction);
	const goalRep = Math.floor(aug.repReq);
	const repToGain = goalRep - currRep;
	const donationAmount = Math.ceil((repToGain / player.factions.factionRepMult) * DONATE_REP_DIVISOR);
	
	if (canDonateToFaction(ns, faction, donationAmount)) {
		ns.donateToFaction(faction, donationAmount);
		logger.log(`Donated ${ns.nFormat(donationAmount, '$0.000a')} to ${faction} for ${Math.floor(repToGain)} reputation`, { type: MessageType.info });
		return true;
	}

	return false;
}

function canDonateToFaction(ns : NS, faction : string, donationAmount : number) : boolean {
	return ns.getFactionFavor(faction) >= ns.getFavorToDonate() && donationAmount * 25 < player.money;
}

async function doFactionWork(ns : NS, faction : string, aug : IAugmentInfo) : Promise<void> {
	logger.log("Trying to do faction work", { type: MessageType.debugHigh });
	const currRep = ns.getFactionRep(faction);
	const goalRep = Math.floor(aug.repReq);
	logger.log(`Working for ${faction} [${Math.floor(currRep)} / ${goalRep}]`, { type: MessageType.info });

	let working = false;
	for (const task of getFactionWorkTypeByValue()) {
		working = ns.workForFaction(faction, task);
		if (working) break;
	}
	
	if (!working) logger.log("Failed to find work", { type: MessageType.error });

	ns.setFocus(!noFocus);
	await ns.asleep(60000);
	ns.stopAction();
}

function getFactionWorkTypeByValue() : string[] {
	return [
		{ type: "Hacking Contracts", weight: player.factionWorkWeight.hacking },
		{ type: "Field Work", weight: player.factionWorkWeight.field },
		{ type: "Security Work", weight: player.factionWorkWeight.security }
	].sort((a, b) => (b.weight - a.weight)).map(x => x.type);
}

function hasMetReputationRequirement(ns : NS, faction : string, aug : IAugmentInfo) : boolean {
	return ns.getFactionRep(faction) >= Math.floor(aug.repReq);
}


/** @param {NS} ns 'ns' namespace parameter. */ 
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
	logger = new ScriptLogger(ns, "FACTION-DAE", "Faction Daemon")

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
	noFocus = flags["no-focus"];
	all = flags["all"];
	preferReputation = flags["prefer-reputation"];
	preferHacking = flags["prefer-hacking"];
	preferCombat = flags["prefer-combat"];
	preferCrime = flags["prefer-crime"];
	preferHacknet = flags["prefer-hacknet"];
	preferBladeburner = flags["prefer-bladeburner"];
	preferMoney = flags["prefer-money"];
	onlyRedPill = flags["only-red-pill"];
	onlyFaction = flags["only-faction"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf(
			`Faction Daemon Helper:\n`+
			`Description:\n` +
			`   Aims to attain the required reputation for factions in order to quality for specified augmentations.\n` +
			`   This script will also automatically meet faction join requirements.\n` +
			`Usage: run /singularity/faction-rep-daemon.js [flags]\n` +
			`Flags:\n` +
			`   [--h or help]          : boolean |>> Prints this.\n` +
			`   [--v or --verbose]     : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   [--d or --debug]       : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   [--only-red-pill]      : boolean |>> Only focus on acquiring enough reputation for the 'The Red Pill' augmentation. (Takes highest prescendent)\n` +
			`   [--only-faction]       : string  |>> Only focus on getting reputation of the specified faction. (Takes 2nd highest prescendent) \n` +
			`   [--no-focus]           : boolean |>> Auto un-focus when starting faction gain.\n` +
			`   [--all]                : boolean |>> Set to meet requirements for all and any augmentation.\n` +
			`   [--prefer-reputation]  : boolean |>> Focus meeting requirements for reputation-boosting augmentations.\n` +
			`   [--prefer-hacking]     : boolean |>> Focus meeting requirements for hacking-boosting augmentations.\n` +
			`   [--prefer-combat]      : boolean |>> Focus meeting requirements for combat-boosting augmentations.\n` +
			`   [--prefer-crime]       : boolean |>> Focus meeting requirements for crime-boosting augmentations.\n` +
			`   [--prefer-hacknet]     : boolean |>> Focus meeting requirements for hacknet-boosting augmentations.\n` +
			`   [--prefer-bladeburner] : boolean |>> Focus meeting requirements for bladeburner-boosting augmentations.\n` +
			`   [--prefer-money]       : boolean |>> Focus meeting requirements for money gain-boosting augmentations.`
		);

		return;
	}

	if (onlyRedPill) 		logger.log("Focussing on gaining reputation with Daedelus for 'The Red Pill'", { type: MessageType.info });
	if (onlyFaction) 		logger.log(`Focussing on gaining reputation for ${onlyFaction}`, { type: MessageType.info });
	if (preferReputation) 	logger.log("Working towards augmentations that boost Reputation multipliers.", { type: MessageType.info });
	if (preferHacking) 		logger.log("Working towards augmentations that boost Hacking multipliers.", { type: MessageType.info });
	if (preferCombat) 		logger.log("Working towards augmentations that boost Combat multipliers.", { type: MessageType.info });
	if (preferCrime) 		logger.log("Working towards augmentations that boost Crim multipliers.", { type: MessageType.info });
	if (preferHacknet) 		logger.log("Working towards augmentations that boost Hacknet multipliers.", { type: MessageType.info });
	if (preferBladeburner) 	logger.log("Working towards augmentations that boost Bladeburner multipliers.", { type: MessageType.info });
	if (preferMoney) 		logger.log("Working towards augmentations that boost Money multipliers.", { type: MessageType.info });
	
    // Define player and current server    
    player = genPlayer(ns);
    machine = genServer(ns, ns.getHostname());

	logger.initialisedMessage(true, false);

	while (true) {

		const augmentations = await getDesireableAugmentations(ns);
		logger.log(`Found ${augmentations.length} desirable augmentations`, { type: MessageType.debugLow });

		if (augmentations.length === 0) {
			logger.log("No available augmentations to work for", { type: MessageType.warning });
		}

		for (const aug of augmentations) {

			checkFactionInvites(ns)

			logger.log(`Next => ${aug.name} [${ns.nFormat(aug.cost, '$0.00a')} | ${ns.nFormat(aug.repReq, '0.00a')} Reputation]`, {
				type: MessageType.info,
				sendToast: true
			});

			const faction = await tryGetOrJoinNextAugFaction(ns, aug);
			if (!faction) {
				logger.log(`Failed to join any faction to work for this augmentation`, { type: MessageType.debugLow });
				continue;
			}

			while (!hasMetReputationRequirement(ns, faction, aug)) {
				const donated = doDonation(ns, faction, aug);				
				if (!donated) await doFactionWork(ns, faction, aug);
				checkFactionInvites(ns);
			}

			logger.log(`Successfully met reputation requirement for ${aug.name}`, { type: MessageType.success, sendToast: true});
			break;
		}

		await ns.asleep(15000);
	}
}