import { NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';

function isSensiblePurchase(money : number, cost : number, debt : number) : boolean {
	return money > cost * 25 && debt + cost < 1e5;
}

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns : NS) : Promise<void> {
	ns.disableLog("ALL");
	const logger = new ScriptLogger(ns, "HACKNET-DAE", "Hacknet Purchase Daemon");

	const LEVEL_MAX = 200;
	const RAM_MAX = 64;
	const CORES_MAX = 16;

	// How much more we have spent on hacknet nodes than we have produced
	let productionDebt = 0;
	let production = 0;

	let money = ns.getServerMoneyAvailable("home");

    logger.initialisedMessage(true, false);

	while (true) {

		// How bad is it..? :s
		const timeUntilDebtFree = Math.max(0, Math.round(productionDebt / production));
		const debtTimerStr = timeUntilDebtFree > 0 ? ` | ${timeUntilDebtFree}s until safe` : "";
		logger.log(`Hacknet Debt: ${ns.nFormat(Math.round(productionDebt), '$0.00a')} (${Math.max(0, (productionDebt/1e3)).toFixed(2)}%)${debtTimerStr}`);

		// How much dollah we got?
		money = ns.getServerMoneyAvailable("home");

		// Buy a new node perhaps?
		if (ns.hacknet.numNodes() === 0 || (ns.hacknet.numNodes() < ns.hacknet.maxNumNodes() && isSensiblePurchase(money, ns.hacknet.getPurchaseNodeCost(), productionDebt))) {
			productionDebt += ns.hacknet.getPurchaseNodeCost();
			ns.hacknet.purchaseNode();
			logger.log(`New Hacknet Node Purchased - Node ${ns.hacknet.numNodes()}`, { type: MessageType.info, sendToast: true });
		}

		// Loop through all hacknet nodes and purchase upgrades
		for (let i = 0; i < ns.hacknet.numNodes(); i++) {

			// Capture the current state
			const oldLevel = ns.hacknet.getNodeStats(i).level;
			const oldRAM = ns.hacknet.getNodeStats(i).ram;
			const oldCores = ns.hacknet.getNodeStats(i).cores;

			// Check if a node isn't at max level
			if (oldLevel < LEVEL_MAX) {

				// Determine how many LEVEL upgrades we can purchase
				let upgrades = 0;

				for (upgrades = 1; upgrades <= LEVEL_MAX - oldLevel; upgrades++) {
					if (!isSensiblePurchase(money, ns.hacknet.getLevelUpgradeCost(i, upgrades), productionDebt)) {
						upgrades -= 1;
						break;
					}
				}

				if (upgrades > 0) {
					productionDebt += ns.hacknet.getLevelUpgradeCost(i, upgrades);
					ns.hacknet.upgradeLevel(i, upgrades);
					logger.log(`Upgraded Hacknet Node: Node ${i+1}, Level ${oldLevel} --> ${ns.hacknet.getNodeStats(i).level}`, { type: MessageType.info, sendToast: true });
				}
			}

			// Check if a node isn't at max RAM
			if (oldRAM < RAM_MAX) {

				// Determine how many RAM upgrades we can purchase
				let upgrades = 0;

				for (upgrades = 1; upgrades <= Math.log2(RAM_MAX / oldRAM); upgrades++) {
					if (!isSensiblePurchase(money, ns.hacknet.getRamUpgradeCost(i, upgrades), productionDebt)) {
						upgrades -= 1;
						break;
					}
				}

				if (upgrades > 0) {
					productionDebt += ns.hacknet.getRamUpgradeCost(i, upgrades);
					ns.hacknet.upgradeRam(i, upgrades);
					logger.log(`Upgraded Hacknet Node: Node ${i+1}, RAM ${oldRAM}GB --> ${ns.hacknet.getNodeStats(i).ram}GB`, { type: MessageType.info, sendToast: true });
				}
			}

			// Check if a node isn't at max cores
			if (oldCores < CORES_MAX) {

				// Determine how many CORE upgrades we can purchase
				let upgrades = 0;

				for (upgrades = 1; upgrades < CORES_MAX; upgrades++) {
					if (!isSensiblePurchase(money, ns.hacknet.getCoreUpgradeCost(i, upgrades), productionDebt)) {
						upgrades -= 1;
						break;
					}
				}

				if (upgrades > 0) {
					productionDebt += ns.hacknet.getCoreUpgradeCost(i, upgrades);
					ns.hacknet.upgradeCore(i, upgrades);
					logger.log(`Upgraded Hacknet Node: Node ${i+1}, CPU Cores ${oldCores} --> ${ns.hacknet.getNodeStats(i).cores}`, { type: MessageType.info, sendToast: true });
				}
			}
		}

		await ns.asleep(30000);

		// Update debt status

		production = 0;
		// Determine total hacknet node production - remove this amount from our debt
		for (let i = 0; i < ns.hacknet.numNodes(); i++) {
			production += ns.hacknet.getNodeStats(i).production;
		}

		// 67% goes to debt relief, 33% goes to profits
		productionDebt -= production * 20;
	}
}
