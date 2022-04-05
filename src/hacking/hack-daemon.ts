import { NS } from '@ns'
import { IPlayerObject, genPlayer } from '/libraries/player-factory.js';
import { IServerObject, genServer } from '/libraries/server-factory.js';
import { peekPort, PortNumber } from '/libraries/port-handler.js';
import { MessageType, ScriptLogger } from '/libraries/script-logger.js';
import { HackInstruction, HackMode, IBatchInfo, IGrowCycle, IHackCycle, IWeakenCycle} from '/data-types/hacking-data.js';
import { IStockData, symToHostname } from '/data-types/stock-data.js';
import { getAllServers } from '/helpers/server-helper';

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
    ["stock-mode", false],
    ["xp-farm-mode", false],
    ["share-mode", false],
];

let help = false;
let verbose = false;
let debug = false;
let stockMode = false;
let xpFarmMode = false;
let shareMode = false;

let currentMode = HackMode.Normal;

// This player and server objects
let player : IPlayerObject;

// List of files to send to hacking servers
const requiredFiles = [
    "/hacking/hack-daemon-worker.js",
    "/hacking/single/hack.js", "/hacking/single/grow.js", "/hacking/single/weak.js", "/sharing/share.js",
    "/libraries/script-logger.js", "/libraries/port-handler.js",
    "/libraries/server-factory.js", "/libraries/player-factory.js", "/data-types/hacking-data.js"
];

// List of files to kill on startup
const killScripts = ["/hacking/hack-daemon-worker.js", "/hacking/single/hack.js", "/hacking/single/grow.js", "/hacking/single/weak.js", "/sharing/share.js"];

// Server lists prepared for various hacking scenarios
let servers : IServerObject[];
let purchasedServers : IServerObject[];

let targetServers : IServerObject[];
let hackingServers : IServerObject[];

let serversByHackRating : IServerObject[];
let serversByStockBenefit : IServerObject[];
const stockInfluenceMode : { [key : string] : HackInstruction } = {};

// Flag to warn that we can't assign any stock mode orders this cycle
let stockModeImpossible = false;

// Map of servers if they are currently busy (do not hack)
const targetNextAvailability : { [key : string] : number } = {};

// Scripts and RAM costs
const HACK_SCRIPT = "/hacking/single/hack.js";
const HACK_SCRIPT_RAM = 1.7;
const GROW_SCRIPT = "/hacking/single/grow.js";
const GROW_SCRIPT_RAM = 1.75;
const WEAK_SCRIPT = "/hacking/single/weak.js";
const WEAK_SCRIPT_RAM = 1.75;
const SHARE_SCRIPT = "/sharing/share.js";
const SHARE_SCRIPT_RAM = 4;

const HACK_FORITFY = 0.002;
const GROW_FORTIFY = 0.004;
let WEAKEN_POTENCY = 0.05;

let WEAKENS_PER_GROW = GROW_FORTIFY / WEAKEN_POTENCY;
let WEAKENS_PER_HACK = HACK_FORITFY / WEAKEN_POTENCY;

const BATCH_DELAY = 1500;
const STEP_DELAY = 300;
const GRACE_PERIOD = 100;

const maxHackPercentage = 0.75;

const queuedWeakEvents : { [key : string] : {
    uid : number;
    assignee : string;
    power : number;
}[]} = {};


const queuedGrowEvents : { [key : string] : {
    uid : number;
    assignee : string;
    power : number;
}[]} = {};

const activeBatches : IBatchInfo[] = [];

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
async function setupEnvironment(ns : NS) : Promise<void> {
    player = genPlayer(ns);
    servers = getAllServers(ns).filter(x => x.slice(0, 6) !== "server" && x.slice(0, 7) !== "hacknet").map(x => genServer(ns, x));

    targetServers = servers.filter((server) => server.money.max > 0);
    targetServers.forEach((target) => {
        targetNextAvailability[target.hostname] = 0;
        queuedWeakEvents[target.hostname] = [];
        queuedGrowEvents[target.hostname] = [];
    });

    purchasedServers = ns.getPurchasedServers().map((server) => genServer(ns, server));

    hackingServers = servers.filter((server) => server.ram.max > 0);
    for (const server of [...hackingServers, ...purchasedServers]) {
        ns.ps(server.hostname).filter(x => killScripts.includes(x.filename)).forEach((proc) => ns.kill(proc.pid));
        await ns.scp(requiredFiles, server.hostname);
    }


    WEAKEN_POTENCY = ns.getBitNodeMultipliers().ServerWeakenRate * WEAKEN_POTENCY;

    WEAKENS_PER_GROW = GROW_FORTIFY / WEAKEN_POTENCY;
    WEAKENS_PER_HACK = HACK_FORITFY / WEAKEN_POTENCY;
}

/*
 * ------------------------
 * > SERVER LIST UPDATE FUNCTION
 * ------------------------
*/

async function checkForPurchasedServerUpdates(ns : NS) : Promise<void> {
    const purchasedServerNames = ns.getPurchasedServers();

    const oldServerNames = purchasedServers.map((server) => server.hostname).filter((hostname) => !purchasedServerNames.includes(hostname));
    await processOldServers(oldServerNames);

    const newServerNames = purchasedServerNames.filter((hostname) => !purchasedServers.map((server) => server.hostname).includes(hostname));
    await processNewServers(ns, newServerNames);

    purchasedServers = purchasedServerNames.map(x => genServer(ns, x));
}

async function processOldServers(serverNames : string[]) : Promise<void> {
    for (const server of serverNames) {
        const batchesToKill : number[] = [];

        for (let i = 0; i < activeBatches.length; i++) {
            const batch = activeBatches[i];

            if (batch.assignee === server) {
                batchesToKill.push(i);
            }
        }

        for (const i of batchesToKill.reverse()) {
            const batch = activeBatches[i];

            switch (batch.type) {
                case HackInstruction.Weaken: {
                    const eventIndex = queuedWeakEvents[batch.target].findIndex((event) => event.uid === activeBatches[i].uid);
                    if (eventIndex >= 0) queuedWeakEvents[batch.target].splice(eventIndex);
                    break;
                }
                case HackInstruction.Grow: {
                    const eventIndex = queuedGrowEvents[batch.target].findIndex((event) => event.uid === activeBatches[i].uid);
                    if (eventIndex >= 0) queuedGrowEvents[batch.target].splice(eventIndex);
                    break;
                }
            }

            activeBatches.splice(i);
        }
    }
}

async function processNewServers(ns : NS, serverNames : string[]) : Promise<void> {
    for (const server of serverNames) {
        await ns.scp(requiredFiles, server);
    }
}

/**
 * Updates the list of servers for the hacking modes to utilise.
 * @param ns NS object parameter.
 */
async function updateServerLists(ns : NS) : Promise<void> {
    logger.log("Updating server lists", { type: MessageType.debugHigh });

    await checkForPurchasedServerUpdates(ns);

    const highRamServerCount = purchasedServers.filter((server) => server.ram.max >= 256).length;

    if (highRamServerCount >= 20) {
        hackingServers = servers.filter((server) => server.isHackingServer && server.ram.max >= 256)
    } else if (highRamServerCount >= 10) {
        hackingServers = servers.filter((server) => server.isHackingServer && server.ram.max >= 128)
    } else {
        hackingServers = servers.filter((server) => server.isHackingServer && server.ram.max >= 16)
    }

    serversByHackRating = targetServers.filter((server) => server.isHackableServer && server.weakenTime.min <= (60000 * 8)).sort((a, b) => b.hackAttractiveness - a.hackAttractiveness);
    serversByStockBenefit = [];

    const stockData = peekPort<IStockData>(ns, PortNumber.StockData);
    if (!stockData) return;

    const stockDataByReturn = stockData.stocks.filter(x =>
        symToHostname.filter(y => y.sym === x.sym).length > 0 &&
        (x.longPos.shares > 0 || x.shortPos.shares > 0)
    ).sort((a, b) => {
        const hostnameA = symToHostname.find(y => y.sym === a.sym)?.server;
        const hostnameB = symToHostname.find(y => y.sym === b.sym)?.server;
        const serverA = servers.find(x => x.hostname === hostnameA);
        const serverB = servers.find(x => x.hostname === hostnameB);
        if (!serverA || !serverB) return -Infinity;
        return (
            (((b.longPos.shares * b.longPos.price) + (b.shortPos.shares * b.shortPos.price)) / (serverB?.hackTime.current * (1 + b.forecast.abs))) -
            (((a.longPos.shares * a.longPos.price) + (a.shortPos.shares * a.shortPos.price)) / (serverA?.hackTime.current * (1 + a.forecast.abs)))
        );
    }
    );

    for (const stock of stockDataByReturn) {
        const hostname = symToHostname.find(y => y.sym === stock.sym)?.server;
        if (!hostname) continue;

        const server = servers.find(x => x.hostname === hostname);
        if (!server) continue;

        if (player.stats.hacking >= server.hackLevel && server.hasRootAccess && server.weakenTime.min <= (60000 * 8)) {
            serversByStockBenefit.push(server);
            stockInfluenceMode[server.hostname] = stock.expectedReturn > 0 ? HackInstruction.Grow : HackInstruction.Hack;
        }
    }

    if (serversByStockBenefit.length === 0 && currentMode === HackMode.StockMarket) {
        logger.log("Unable to push any servers to hack for stock influence - script will instead push XP Farm commands", { type: MessageType.warning });
        stockModeImpossible = true;
    } else {
        stockModeImpossible = false;
    }
}

/*
 * ------------------------
 * > SERVER NUKE FUNCTION
 * ------------------------
*/

/**
 * Test if we can nuke any servers - and do so if possible.
 * @param ns NS object parameter.
 */
function tryNukeServers(ns : NS) : void {
    logger.log("Trying to nuke any new servers", { type: MessageType.debugHigh });
    servers.filter((s) => s.hostname !== "home" && s.hostname.substring(0, 6) !== "server" && !s.hasRootAccess).forEach((s) => {
        if (!s.ports.isSSHOpen  && ns.fileExists("BruteSSH.exe"))   { ns.brutessh(s.hostname);  }
        if (!s.ports.isFTPOpen  && ns.fileExists("FTPCrack.exe"))   { ns.ftpcrack(s.hostname);  }
        if (!s.ports.isSMTPOpen && ns.fileExists("RelaySMTP.exe"))  { ns.relaysmtp(s.hostname); }
        if (!s.ports.isHTTPOpen && ns.fileExists("HTTPWorm.exe"))   { ns.httpworm(s.hostname);  }
        if (!s.ports.isSQLOpen  && ns.fileExists("SQLInject.exe"))  { ns.sqlinject(s.hostname); }

        if (!s.hasRootAccess && s.ports.openCount >= s.ports.requiredCount && player.stats.hacking >= s.hackLevel) {
            ns.nuke(s.hostname);
            logger.log(`Nuked ${s.hostname}`, { type: MessageType.success, sendToast: true });
        }
    });
}

/*
 * ------------------------
 * > HACK ORDER CYCLE CALCULATION FUNCTIONS
 * ------------------------
*/

/**
 * Calculate how many weaken threads are required.
 * @param targetServer Hostname of the target server.
 * @returns Weaken Cycle information object.
 */
function calculateWeakenCycles(assignee : IServerObject, targetServer : IServerObject) : IBatchInfo {
    logger.log("Calculating weaken cycles", { type: MessageType.debugHigh });

    const weakenThreads = Math.floor(assignee.ram.free / WEAK_SCRIPT_RAM);

    const weakTime = targetServer.weakenTime.current;

    const availableTime = targetNextAvailability[targetServer.hostname];
    const weakenAtTime = Math.ceil(Math.max(performance.now() + (weakTime - weakTime), availableTime - weakTime) + (STEP_DELAY * 0));

    const cycleAmount = (weakenThreads > 0 ? 1 : 0);

    const batch : IBatchInfo = {
        uid: Math.floor(performance.now()),
        linkedEventId: Infinity,
        processUids: [],
        assignee: assignee.hostname,
        target: targetServer.hostname,
        startingHackLevel: player.stats.hacking,
        type: HackInstruction.Weaken,
        levelTimeCutOff: 0,
        reservedStartTime: weakenAtTime + weakTime - GRACE_PERIOD,
        reservedEndTime: weakenAtTime + weakTime + GRACE_PERIOD + (STEP_DELAY * 1 * (cycleAmount - 1)),
        cycles: cycleAmount,
        cycleInfo:  {
            w: {
                threads: weakenThreads,
                startTime: weakenAtTime,
                executionTime: weakTime,
                power: weakenThreads * WEAKEN_POTENCY
            }
        }
    }

    return batch;
}

/**
 * Calculate how many grow + weaken threads are required.
 * @param ns NS object parameter.
 * @param targetServer Hostname of the target server.
 * @returns Grow Cycle information object.
 */
function calculateGrowCycles(ns : NS, assignee : IServerObject, targetServer : IServerObject) : IBatchInfo {
    logger.log("Calculating grow cycles", { type: MessageType.debugHigh });
    const cycleRAMCost = GROW_SCRIPT_RAM + (WEAK_SCRIPT_RAM * WEAKENS_PER_GROW);

    // Force at least one weaken thread to be considered
    const growThreads = Math.floor((assignee.ram.free - WEAK_SCRIPT_RAM) / cycleRAMCost);
    const weakenThreads = Math.ceil(growThreads * WEAKENS_PER_GROW);

    const growTime = targetServer.growTime.min;
    const weakTime = targetServer.weakenTime.min;

    const availableTime = targetNextAvailability[targetServer.hostname];
    const growAtTime   = Math.ceil(Math.max(performance.now() + (weakTime - growTime), availableTime - growTime) + (STEP_DELAY * 0));
    const weakenAtTime = Math.ceil(Math.max(performance.now() + (weakTime - weakTime), availableTime - weakTime) + (STEP_DELAY * 1));

    const cycleAmount = (growThreads > 0 ? 1 : 0);

    const batch : IBatchInfo = {
        uid: Math.floor(performance.now()),
        linkedEventId: Infinity,
        processUids: [],
        assignee: assignee.hostname,
        target: targetServer.hostname,
        startingHackLevel: player.stats.hacking,
        type: HackInstruction.Grow,
        levelTimeCutOff: growAtTime,
        reservedStartTime: growAtTime + growTime - GRACE_PERIOD,
        reservedEndTime: weakenAtTime + weakTime + GRACE_PERIOD + (STEP_DELAY * 2 * (cycleAmount - 1)),
        cycles: cycleAmount,
        cycleInfo:  {
            g: {
                threads: growThreads,
                executionTime: growTime,
                startTime: growAtTime,
                power: ns.formulas.hacking.growPercent(targetServer.server, growThreads, player.player, assignee.cores)
            },
            wg: {
                threads: weakenThreads,
                executionTime: weakTime,
                startTime: weakenAtTime,
                power: weakenThreads * WEAKEN_POTENCY
            }
        }
    }

    return batch;
}

/**
 * Calculate how many hack + grow + weaken threads are required.
 * @param ns NS object parameter.
 * @param targetServer Hostname of the target server.
 * @returns Hack Cycle information object.
 */
function calculateHackCycles(ns : NS, assignee : IServerObject, targetServer : IServerObject) : IBatchInfo {
    logger.log("Calculating hack cycles", { type: MessageType.debugHigh });

    // Calculate the optimal amount of threads
    let hackThreads = 0;
    let growThreads = 0;
    let weakHackThreads = 0;
    let weakGrowThreads = 0;

    // Find the sweet spot
    let totalCycles = 0;

    let minThreads = 1;
    //ns.hackAnalyze(targetServer.hostname) sometimes returns Infinity?
    let hackPercent = ns.hackAnalyze(targetServer.hostname);
    hackPercent = (hackPercent === 0 ? 1 : hackPercent);
    hackPercent = (hackPercent === Infinity ? 1 : hackPercent);
    let maxThreads = Math.floor(maxHackPercentage / hackPercent);
    //ns.print(hackPercent)

    let adjustments = 0;
    const maxAdjustments = 10;

    let growFrac = 0;

    while (minThreads !== maxThreads && adjustments++ < maxAdjustments) {

        // Calculate how much money we plan on stealing, and how many threads that will take
        hackThreads = Math.floor((minThreads + maxThreads) / 2);
        const hackFrac = hackThreads * hackPercent;

        // Calculate how many grow threads we need to restore the money we plan on stealing
        growFrac = (1 / (1 - hackFrac));
        growThreads = Math.ceil((ns.growthAnalyze(targetServer.hostname, growFrac, assignee.cores) * 1.05));

        //ns.print(`${assignee.hostname} ${targetServer.hostname} ${growFrac} ${hackFrac} ${hackThreads} ${minThreads} ${maxThreads} ${maxHackPercentage}`);

        // Calculate the number of weaken threads we need to counteract the hacks and grows earlier
        weakHackThreads = Math.ceil(hackThreads * WEAKENS_PER_HACK);
        weakGrowThreads = Math.ceil(growThreads * WEAKENS_PER_GROW);

        // Calculate how many cycles we would be able to run at once (hypothetically)
        const totalCycleCost =
            (hackThreads * HACK_SCRIPT_RAM) +
            (growThreads * GROW_SCRIPT_RAM) +
            ((weakHackThreads + weakGrowThreads) * WEAK_SCRIPT_RAM);

        //ns.print(`${minThreads} --> ${maxThreads}`);
        //ns.print(`Free = ${machine.ram.free * ramUsageMult}GB | (${hackThreads}xH + ${growThreads}xG + ${weakHackThreads + weakGrowThreads}xW) = ${totalCycleCost}GB`);
        totalCycles = assignee.ram.free / totalCycleCost;

        // Determine if we are able to run more than a single cycle of HWGW
        if (totalCycles > 1) {
            minThreads = hackThreads;
        } else if (totalCycles < 1) {
            maxThreads = hackThreads;
        }
    }

    const hackTime = targetServer.hackTime.min;
    const growTime = targetServer.growTime.min;
    const weakTime = targetServer.weakenTime.min;

    const availableTime = targetNextAvailability[targetServer.hostname];

    let hackAtTime    = Math.ceil(Math.max(performance.now() + (weakTime - hackTime), availableTime - hackTime) + (STEP_DELAY * 0));
    let weakenHAtTime = Math.ceil(Math.max(performance.now() + (weakTime - weakTime), availableTime - weakTime) + (STEP_DELAY * 1));
    let growAtTime    = Math.ceil(Math.max(performance.now() + (weakTime - growTime), availableTime - growTime) + (STEP_DELAY * 2));
    let weakenGAtTime = Math.ceil(Math.max(performance.now() + (weakTime - weakTime), availableTime - weakTime) + (STEP_DELAY * 3));

    let cycleAmount = Math.min(25, Math.floor(totalCycles));

    if (hackThreads === 0 || growThreads === 0) cycleAmount = 0;

    // If any cycle of this batch would overlap a danger period, cut off all cycles from then onwards.
    for (let i = 0; i < cycleAmount; i++) {
        const totalStepDelay = (STEP_DELAY * 4 * i);
        const testHackTime  = hackAtTime + totalStepDelay;
        const testWeakHTime = weakenHAtTime + totalStepDelay;
        const testGrowTime  = growAtTime + totalStepDelay;
        const testWeakGTime = weakenGAtTime + totalStepDelay;

        const dangerBatchCount = activeBatches.filter((batch) => batch.target === targetServer.hostname && (
            (testHackTime >= batch.reservedStartTime && testHackTime <= batch.reservedEndTime) ||
            (testWeakHTime >= batch.reservedStartTime && testWeakHTime <= batch.reservedEndTime) ||
            (testGrowTime >= batch.reservedStartTime && testGrowTime <= batch.reservedEndTime) ||
            (testWeakGTime >= batch.reservedStartTime && testWeakGTime <= batch.reservedEndTime)
        )).length;

        if (dangerBatchCount > 0) {
            if (i === 0) {
                // Delay batch by one cycle
                hackAtTime += BATCH_DELAY;
                weakenHAtTime += BATCH_DELAY;
                growAtTime += BATCH_DELAY;
                weakenGAtTime += BATCH_DELAY;
                logger.log(`Delaying batch for ${assignee.hostname} due to overlap...`, { type: MessageType.warning });

                // Reset the loop
                i = 0;
            } else {
                // Cut batch to maximum number of safe cycles
                logger.log(`Batch for ${assignee.hostname} would overlap reserved time; cutting from ${cycleAmount} cycles to ${i} cycles`, { type: MessageType.warning });
                cycleAmount = i;
            }
        }
    }

    // DELAYS BATCHES BY 50MS UNTIL IT WORKS

    const batch : IBatchInfo = {
        uid: Math.floor(performance.now()),
        linkedEventId: Infinity,
        processUids: [],
        assignee: assignee.hostname,
        target: targetServer.hostname,
        startingHackLevel: player.stats.hacking,
        type: HackInstruction.Grow,
        levelTimeCutOff: growAtTime,
        reservedStartTime: hackAtTime + hackTime - GRACE_PERIOD,
        reservedEndTime: weakenGAtTime + weakTime + GRACE_PERIOD + (STEP_DELAY * 4 * (cycleAmount - 1)),
        cycles: cycleAmount,
        cycleInfo:  {
            h: {
                threads: hackThreads,
                executionTime: hackTime,
                startTime: hackAtTime,
                power: hackPercent
            },
            wh: {
                threads: weakHackThreads,
                executionTime: weakTime,
                startTime: weakenHAtTime,
                power: weakHackThreads * WEAKEN_POTENCY
            },
            g: {
                threads: growThreads,
                executionTime: growTime,
                startTime: growAtTime,
                power: growFrac
            },
            wg: {
                threads: weakGrowThreads,
                executionTime: weakTime,
                startTime: weakenGAtTime,
                power: weakGrowThreads * WEAKEN_POTENCY
            }
        }
    }

    return batch;
}

/*
 * ------------------------
 * > SHARE.JS INSTANCE STARTER/KILLER FUNCTIONS
 * ------------------------
*/

/**
 * Start a number of share instances on this server.
 * @param ns NS object parameter.
 * @param max True if the script should be run at max threads.
 */
function startShareInstances(ns : NS, assignee : IServerObject, max = false) : void {
    killShareInstances(ns);
    logger.log("Starting share instances", { type: MessageType.debugLow });
    const threadCountModifier = max ? 1 : 0.03 * Math.log(assignee.ram.max) / Math.log(2);
    const threads = Math.floor(assignee.ram.free * threadCountModifier / SHARE_SCRIPT_RAM);
    ns.exec(SHARE_SCRIPT, assignee.hostname, threads);
}

/**
 * Kill all current active share script instances on this server.
 * @param ns NS object parameter.
 */
function killShareInstances(ns : NS) : void {
    logger.log("Killing share instances", { type: MessageType.debugLow });
    const shareProcessInstances = ns.ps().filter(x => x.filename === SHARE_SCRIPT)
    shareProcessInstances.forEach((proc) => ns.kill(proc.pid));
}

/*
 * ------------------------
 * > HACK ORDER ASSIGNING FUNCTIONS
 * ------------------------
*/

async function processOrderAssignments(ns : NS) : Promise<void> {
    for (const server of [...hackingServers, ...purchasedServers].filter((server) => server.ram.free >= 5)) {
        if (!ns.serverExists(server.hostname)) continue;
        if (ns.ls(server.hostname, "/tmp/delete.txt").length > 0) continue;
        logger.log(`Processing order assignment for server: ${server.hostname}`, { type: MessageType.debugHigh });
        await processServerOrderAssignment(ns, server)
    }
}

/**
 * Process the order request, attempting to assign the requestee an order based on the current hack mode.
 * @param ns NS object paramter
 * @param request Order request object.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function processServerOrderAssignment(ns : NS, server : IServerObject) : Promise<boolean> {
    switch (currentMode) {
        case HackMode.Normal: return tryAssignNormalOrder(ns, server);
        case HackMode.StockMarket: return stockModeImpossible ? tryAssignNormalOrder(ns, server) : tryAssignStockMarketOrder(ns, server);
        case HackMode.XPFarm: return tryAssignXPFarmOrder(ns, server);
        case HackMode.ShareAll: return tryAssignShareAllOrder(ns, server);
    }
}

/**
 * Try to assign a normal hacking order to a hacking server.
 * @param ns NS object parameter.
 * @param request Order request object.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignNormalOrder(ns : NS, assignee : IServerObject) : Promise<boolean> {
    logger.log("Trying to assign Normal mode order", { type: MessageType.debugHigh });
    for (const target of serversByHackRating) {
        const assigned = await tryAssignOrder(ns, assignee, target);
        if (assigned) return true;
    }

    return false;
}

async function tryAssignOrder(ns : NS, assignee : IServerObject, target : IServerObject, stockInfluence? : HackInstruction) : Promise<boolean> {
    if (targetRequiresWeaken(target))    return tryAssignWeakenOrder(ns, assignee, target);
    else if (targetRequiresGrow(target)) return tryAssignGrowOrder(ns, assignee, target, stockInfluence);
    else                                 return tryAssignHackOrder(ns, assignee, target, stockInfluence);
}

function targetRequiresWeaken(target : IServerObject) : boolean {
    const queuedWeakens = queuedWeakEvents[target.hostname];
    return (
        queuedWeakens.length > 0
            ? target.security.current - queuedWeakens.map(x => x.power).reduce((a, b) => a + b, 0) > target.security.min
            : !target.security.isMin
    );
}

function targetRequiresGrow(target : IServerObject) : boolean {
    const queuedGrows = queuedGrowEvents[target.hostname];
    return (
        !targetRequiresWeaken(target) &&
        queuedGrows.length > 0
            ? target.money.current * queuedGrows.map(x => x.power).reduce((a, b) => a * b) < target.money.max
            : !target.money.isMax
    );
}

/**
 * Try to assign a stock market affecting hacking order to a hacking server.
 * @param ns NS object parameter.
 * @param request Order request object.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignStockMarketOrder(ns : NS, assignee : IServerObject) : Promise<boolean> {
    logger.log("Trying to assign Stock Market mode order", { type: MessageType.debugHigh });
    for (const target of serversByStockBenefit) {
        const influence = stockInfluenceMode[target.hostname];
        const assigned = await tryAssignOrder(ns, assignee, target, influence);
        if (assigned) return true;
    }

    let assigned = await tryAssignNormalOrder(ns, assignee);
    if (!assigned) assigned = await tryAssignXPFarmOrder(ns, assignee);
    return assigned;
}

/**
 * Try to assign an xp farm hacking order to a hacking server.
 * @param ns NS object parameter.
 * @param request Order request object.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignXPFarmOrder(ns : NS, assignee : IServerObject) : Promise<boolean> {
    logger.log("Trying to assign XP Farm mode order", { type: MessageType.debugHigh });
    if (player.stats.hacking >= ns.getServer("joesguns").requiredHackingSkill) {
        return tryAssignWeakenOrder(ns, assignee, genServer(ns, "joesguns"));
    } else {
        return tryAssignWeakenOrder(ns, assignee, genServer(ns, "n00dles"));
    }
}

/**
 * Try to assign a share all order to a hacking server.
 * @param ns NS object parameter.
 * @param request Order request object.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignShareAllOrder(ns : NS, assignee : IServerObject) : Promise<boolean> {
    logger.log("Trying to assign Share All mode order", { type: MessageType.debugHigh });
    startShareInstances(ns, assignee, true);
    return true;
}

/**
 * Try to assign a weaken order to a hacking server.
 * @param ns NS object parameter.
 * @param requester Name of hacking server.
 * @param target Name of target server.
 * @param mode Hacking mode.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignWeakenOrder(ns : NS, assignee : IServerObject, target : IServerObject) : Promise<boolean> {
    logger.log("Trying to assign weaken order", { type: MessageType.debugHigh });
    const weakenBatch = calculateWeakenCycles(assignee, target);
    if (weakenBatch.cycles === 0) {
        return false;
    } else {
        await doAssignWeakenOrder(ns, assignee, target, weakenBatch);
        return true;
    }
}

/**
 * Process the cycle by executing the specified threads.
 * @param ns NS object parameter.
 * @param cycle Cycle information.
 * @param target Target server to be weakened.
 */
async function doAssignWeakenOrder(ns : NS, assignee : IServerObject, target : IServerObject, batch : IBatchInfo) : Promise<void> {
    const cycle = (batch.cycleInfo as IWeakenCycle);

    const formatStartTime = ns.nFormat(Math.max(0, cycle.w.startTime - performance.now()) / 1000, '00:00');

    logger.log(`${assignee.hostname} to weaken ${target.hostname} by ${ns.nFormat(cycle.w.power, '0.00')} starting in ${formatStartTime}`, { type: MessageType.info });
    logger.log(`Starting weaken cycle on ${target.hostname} for ${cycle.w.threads} threads`, { type: MessageType.debugLow });

    const weakStart = cycle.w.startTime;

    const weakPID = ns.exec(WEAK_SCRIPT, assignee.hostname, cycle.w.threads, target.hostname, weakStart, false, batch.uid, weakStart + cycle.w.executionTime);

    if (weakPID === 0) {
        logger.log(`Failed to start: WEAK against ${target.hostname} from ${assignee.hostname}; ${cycle.w.threads} threads`, { type: MessageType.fail, sendToast: true });
    }

    const uid = Math.floor(performance.now());

    // Update batch info
    batch.uid = uid;
    batch.processUids.push(weakPID);
    activeBatches.push(batch);

    // Update active events
    queuedWeakEvents[target.hostname].push({
        uid: uid,
        assignee: assignee.hostname,
        power: cycle.w.power
    });

    // Update availablity info
    targetNextAvailability[target.hostname] = batch.reservedEndTime + BATCH_DELAY;

}

/**
 * Try to assign a grow order to a hacking server.
 * @param ns NS object parameter.
 * @param assignee Name of hacking server.
 * @param target Name of target server.
 * @param stockInfluence True if this instruction will affect the stock market.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignGrowOrder(ns : NS, assignee : IServerObject, target : IServerObject, stockInfluence? : HackInstruction) : Promise<boolean> {
    logger.log("Trying to assign grow order", { type: MessageType.debugHigh });
    const growBatch = calculateGrowCycles(ns, assignee, target);
    if (growBatch.cycles === 0) {
        return false;
    } else {
        await doAssignGrowOrder(ns, assignee, target, growBatch, stockInfluence === HackInstruction.Grow);
        return true;
    }
}

/**
 * Process the cycle by executing the specified threads.
 * @param ns NS object parameter.
 * @param cycle Cycle information.
 * @param target Target server to be grown.
 * @param growInfluence True if this grow instruction should affect the stock market.
 */
 async function doAssignGrowOrder(ns : NS, assignee : IServerObject, target : IServerObject, batch : IBatchInfo, growInfluence : boolean) : Promise<void> {
    const cycle = (batch.cycleInfo as IGrowCycle);

    const formatStartTime = ns.nFormat(Math.max(0, cycle.wg.startTime - performance.now()) / 1000, '00:00');

    logger.log(`${assignee.hostname} to grow ${target.hostname} by ${ns.nFormat(cycle.g.power, '0.00')}% starting in ${formatStartTime}`, { type: MessageType.info });
    logger.log(`Starting grow cycle on ${target.hostname} for ${cycle.g.threads} grow threads and ${cycle.wg.threads} weaken threads`, { type: MessageType.debugLow });

    const growStart = cycle.g.startTime;
    const weakGStart = cycle.wg.startTime;

    const growPID = ns.exec(GROW_SCRIPT, assignee.hostname, cycle.g.threads,  target.hostname, growStart,  growInfluence, batch.uid, growStart + cycle.g.executionTime);
    const weakPID = ns.exec(WEAK_SCRIPT, assignee.hostname, cycle.wg.threads, target.hostname, weakGStart, false,         batch.uid, weakGStart + cycle.wg.executionTime);

    if (growPID === 0) {
        logger.log(`Failed to start: GROW against ${target.hostname} from ${assignee.hostname}; ${cycle.g.threads} threads`, { type: MessageType.fail, sendToast: true });
    }

    if (weakPID === 0) {
        logger.log(`Failed to start: WEAK against ${target.hostname} from ${assignee.hostname}; ${cycle.wg.threads} threads`, { type: MessageType.fail, sendToast: true });
    }

    const uid = Math.floor(performance.now());

    // Update batch info
    batch.uid = uid;
    batch.processUids.push(growPID, weakPID);
    activeBatches.push(batch);

    // Update active events
    queuedGrowEvents[target.hostname].push({
        uid: uid,
        assignee: assignee.hostname,
        power: cycle.g.power,
    });

    // Update availablity info
    targetNextAvailability[target.hostname] = batch.reservedEndTime + BATCH_DELAY;

}

/**
 * Try to assign a hack order to a hacking server.
 * @param ns NS object parameter.
 * @param requester Name of hacking server.
 * @param target Name of target server.
 * @param mode Hacking mode.
 * @returns True if an order was successfully assigned; false otherwise.
 */
async function tryAssignHackOrder(ns : NS, assignee : IServerObject, target : IServerObject, stockInfluence? : HackInstruction) : Promise<boolean> {
    logger.log("Trying to assign hack order", { type: MessageType.debugHigh });
    const hackBatch = calculateHackCycles(ns, assignee, target);
    if (hackBatch.cycles === 0) return false;
    if ((hackBatch.cycleInfo as IHackCycle).wh.startTime - performance.now() >= 60000 * 2.5) return false;
    await doAssignHackOrder(ns, assignee.hostname, hackBatch, target.hostname, stockInfluence === HackInstruction.Grow, stockInfluence === HackInstruction.Hack);
    return true;
}

/**
 * Process the cycle by executing the specified threads.
 * @param ns NS object parameter.
 * @param cycle Cycle information.
 * @param target Target server to be hacked.
 * @param growInfluence True if this grow instruction should affect the stock market.
 * @param hackInfluence True if this hack instruction should affect the stock market.
 */
async function doAssignHackOrder(ns : NS, assignee : string, batch : IBatchInfo, target : string, growInfluence : boolean, hackInfluence : boolean) : Promise<void> {
    const cycle = (batch.cycleInfo as IHackCycle);

    const formatPercentStolen = (cycle.h.threads * ns.hackAnalyze(target) * 100).toFixed(2);
    const formatStartTime = ns.nFormat(Math.max(0, cycle.wh.startTime - performance.now()) / 1000, '00:00');

    logger.log(`${assignee} to steal ${formatPercentStolen}% of funds from ${target} for ${batch.cycles} cycles starting in ${formatStartTime}`, { type: MessageType.info });
    logger.log(`Hacks = ${cycle.h.threads}, Weakens = ${cycle.wh.threads} Grows = ${cycle.g.threads}, Weakens = ${cycle.wg.threads}`, { type: MessageType.debugLow });

    const pids : number[] = [];

    for (let i = 0; i < batch.cycles; i++) {
        logger.log(`Executing cycle: ${i}`, { type: MessageType.debugLow });

        const totalStepDelay = (STEP_DELAY * 4 * i);
        const hackStart  = cycle.h.startTime  + totalStepDelay;
        const weakHStart = cycle.wh.startTime + totalStepDelay;
        const growStart  = cycle.g.startTime  + totalStepDelay;
        const weakGStart = cycle.wg.startTime + totalStepDelay;

        const hackPID  = ns.exec(HACK_SCRIPT, assignee, cycle.h.threads,  target, hackStart,  hackInfluence, batch.uid, hackStart + cycle.h.executionTime);
        const whackPID = ns.exec(WEAK_SCRIPT, assignee, cycle.wh.threads, target, weakHStart, false,         batch.uid, weakHStart + cycle.wh.executionTime);
        const growPID  = ns.exec(GROW_SCRIPT, assignee, cycle.g.threads,  target, growStart,  growInfluence, batch.uid, growStart + cycle.g.executionTime);
        const wgrowPID = ns.exec(WEAK_SCRIPT, assignee, cycle.wg.threads, target, weakGStart, false,         batch.uid, weakGStart + cycle.wh.executionTime);

        if (hackPID === 0) {
            logger.log(`Failed to start: HACK against ${target} from ${assignee}; ${cycle.h.threads} threads`, { type: MessageType.fail, sendToast: true });
        }

        if (whackPID === 0) {
            logger.log(`Failed to start: WEAK (hack) against ${target} from ${assignee}; ${cycle.wh.threads} threads`, { type: MessageType.fail, sendToast: true });
        }

        if (growPID === 0) {
            logger.log(`Failed to start: GROW against ${target} from ${assignee}; ${cycle.g.threads} threads`, { type: MessageType.fail, sendToast: true });
        }

        if (wgrowPID === 0) {
            logger.log(`Failed to start: WEAK (grow) against ${target} from ${assignee}; ${cycle.wg.threads} threads`, { type: MessageType.fail, sendToast: true });
        }

        pids.push(hackPID, whackPID, growPID, wgrowPID);

        await ns.asleep(1);
    }

    const uid = Math.floor(performance.now());

    // Update batch info
    batch.uid = uid;
    batch.processUids = pids;
    activeBatches.push(batch);

    // Update availablity info
    targetNextAvailability[target] = batch.reservedEndTime + BATCH_DELAY;
}



async function checkBatchStates(ns : NS) : Promise<void> {
    const batchesToKill : number[] = [];

    for (let i = 0; i < activeBatches.length; i++) {
        const batch = activeBatches[i];

        if (batchHasExpired(batch.reservedEndTime)) {
            logger.log(`Batch ${batch.uid} on ${batch.assignee} successfully completed`, { type: MessageType.debugLow });
            batchesToKill.push(i);
        }

        if (batchHasSelfTerminated(ns, batch)) {
            logger.log(`Killing batch ${batch.uid} on ${batch.assignee} due to self-termination`, { type: MessageType.warning });
            batch.processUids.forEach((uid) => ns.kill(uid, batch.assignee))
            batchesToKill.push(i);
        }

        if (shouldKillBatch(batch)) {
            logger.log(`Killing batch ${batch.uid} on ${batch.assignee} due to hack level increase (${batch.startingHackLevel} >> ${player.stats.hacking})`, { type: MessageType.warning });
            batch.processUids.forEach((uid) => ns.kill(uid, batch.assignee))
            batchesToKill.push(i);
        }

        await ns.asleep(1);
    }

    for (const i of batchesToKill.reverse()) {
        const batch = activeBatches[i];
        if (!batch) continue;

        switch (batch.type) {
            case HackInstruction.Weaken: {
                const eventIndex = queuedWeakEvents[batch.target].findIndex((event) => event.uid === activeBatches[i].uid);
                if (eventIndex >= 0) queuedWeakEvents[batch.target].splice(eventIndex);
                break;
            }
            case HackInstruction.Grow: {
                const eventIndex = queuedGrowEvents[batch.target].findIndex((event) => event.uid === activeBatches[i].uid);
                if (eventIndex >= 0) queuedGrowEvents[batch.target].splice(eventIndex);
                break;
            }
        }

        activeBatches.splice(i);
    }
}

function batchHasExpired(endTime : number) : boolean {
    return performance.now() > endTime;
}

function batchHasSelfTerminated(ns : NS, batch : IBatchInfo) : boolean {
    return performance.now() < batch.reservedStartTime && batch.processUids.map(x => ns.getRunningScript(x, batch.assignee)).some(x => x === null)
}

function shouldKillBatch(batch : IBatchInfo) : boolean {
    if (performance.now() < batch.levelTimeCutOff && player.stats.hacking > batch.startingHackLevel) {
        const targetServer = targetServers.find((server) => server.hostname === batch.target);
        if (!targetServer) return true;

        let timeDifference = 0;
        switch (batch.type) {
            case HackInstruction.Hack:
                timeDifference = Math.max(
                    (batch.cycleInfo as IHackCycle).h.executionTime - targetServer.hackTime.min,
                    (batch.cycleInfo as IHackCycle).g.executionTime - targetServer.growTime.min
                );
                break;
            case HackInstruction.Grow:
                timeDifference = (batch.cycleInfo as IGrowCycle).g.executionTime - targetServer.growTime.min;
                break;
        }

        return timeDifference > 200;
    } else {
        return false;
    }
}


/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "HACK", "Hacking Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];
    stockMode = flags["stock-mode"];
    xpFarmMode = flags["xp-farm-mode"];
    shareMode = flags["share-mode"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

    if (stockMode)  currentMode = HackMode.StockMarket;
    else if (xpFarmMode) currentMode = HackMode.XPFarm;
    else if (shareMode)  currentMode = HackMode.ShareAll;

	// Helper output
	if (help) {
		ns.tprintf(
			`Hacking Daemon:\n`+
			`Description:\n` +
			`   Controls the flow of all Hacking scripts by assigning jobs.\n` +
			`   Has 4 modes: Normal, Stock Market, XP Farm, and Share.\n` +
			`Usage: run /hacking/hack-daemon-master.js [flags]\n` +
			`Flags:\n` +
			`   [--h or help]       : boolean |>> Prints this.\n` +
			`   [--v or --verbose]  : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   [--d or --debug]    : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`   [--stock-mode]      : boolean |>> Sets initial mode to Stock Marking influcence mode.\n` +
			`   [--xp-farm-mode]    : boolean |>> Sets initial mode to XP Farm mode.\n` +
			`   [--share-mode]      : boolean |>> Sets initial mode to Share all RAM mode.`
		);

		return;
	}

    await setupEnvironment(ns);

	logger.initialisedMessage(true, false);

    while (true) {

        await updateServerLists(ns);
        tryNukeServers(ns);
        await processOrderAssignments(ns);
        await checkBatchStates(ns);
        await ns.asleep(1000);

    }
}
