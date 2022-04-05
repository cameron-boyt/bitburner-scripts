import { NS, Server } from '@ns'

const growTimeMultiplier = 3.2; // Relative to hacking time. 16/5 = 3.2
const weakenTimeMultiplier = 4; // Relative to hacking time

export interface IServerObject {
    server : Server;

    hostname : string;
    organisation : string;

    hasRootAccess : boolean;
    isBackdoorInstalled : boolean;
    isHome : boolean;

    hackLevel : number;
    isPurchased : boolean;
    isHacknet : boolean;
    isConnected : boolean;

    security : {
        min : number;
        current :  number;
        isMin : boolean;
    };

    money : {
        max : number;
        current : number;
        isMax : boolean;
        growth : number;
    };

    ram : {
        max : number;
        used : number;
        free : number;
    };

    cores : number;

    ports : {
        requiredCount : number;
        openCount : number;
        isSSHOpen: boolean;
        isFTPOpen: boolean;
        isHTTPOpen: boolean;
        isSMTPOpen: boolean;
        isSQLOpen: boolean;
    };

    hackTime : {
        current : number;
        min : number;
    };

    hackChance : {
        current : number;
        max : number;
    };

    growTime : {
        current : number;
        min : number;
    };

    weakenTime : {
        current : number;
        min : number;
    };

    isHackingServer : boolean;
    isHackableServer : boolean;

    hackAttractiveness : number;
}

export function genServer(ns : NS, s : string) : IServerObject {
    const reserveRam = (s === "home" ? 40 : 0);

    const server : IServerObject = {
        get server() { return ns.getServer(s); },

        get hostname() { return s; },
        get organisation() { return ns.getServer(s).organizationName; },

        get hasRootAccess() { return ns.getServer(s).hasAdminRights; },
        get isBackdoorInstalled() { return ns.getServer(s).backdoorInstalled; },
        get isHome() { return ns.getServer(s).hostname === "home"; },

        get hackLevel() { return ns.getServer(s).requiredHackingSkill; },
        get isPurchased() { return ns.getServer(s).purchasedByPlayer; },
        get isHacknet() { return this.hostname.substring(0, 7) === "hacknet" },
        get isConnected () { return ns.getServer(s).isConnectedTo; },

        security: {
            get min() { return ns.getServer(s).minDifficulty; },
            get current() { return ns.getServer(s).hackDifficulty; },
            get isMin() { return server.security.min === server.security.current; }
        },

        money : {
            get max() { return ns.getServer(s).moneyMax; },
            get current() { return ns.getServer(s).moneyAvailable; },
            get isMax() { return server.money.max === server.money.current; },
            get growth() { return ns.getServer(s).serverGrowth; }
        },

        get cores() { return ns.getServer(s).cpuCores; },

        ram: {
            get max()  { return ns.getServer(s).maxRam; },
            get used() { return ns.getServer(s).ramUsed; },
            get free() { return Math.max(0, (server.ram.max - reserveRam) - server.ram.used); }
        },

        ports: {
            get requiredCount() { return ns.getServer(s).numOpenPortsRequired; },
            get openCount() { return ns.getServer(s).openPortCount; },
            get isSSHOpen() { return ns.getServer(s).sshPortOpen; },
            get isFTPOpen() { return ns.getServer(s).ftpPortOpen; },
            get isHTTPOpen() { return ns.getServer(s).httpPortOpen; },
            get isSMTPOpen() { return ns.getServer(s).smtpPortOpen; },
            get isSQLOpen() { return ns.getServer(s).sqlPortOpen; },
        },

        hackTime: {
            get current() {
                const player = ns.getPlayer();
                const difficultyMult = server.hackLevel * server.security.current;

                const baseDiff = 500;
                const baseSkill = 50;
                const diffFactor = 2.5;
                let skillFactor = diffFactor * difficultyMult + baseDiff;
                skillFactor /= player.hacking + baseSkill;

                const hackTimeMultiplier = 5;
                const hackingTime =
                (hackTimeMultiplier * skillFactor) /
                (player.hacking_speed_mult * (1 + (Math.pow(player.intelligence, 0.8)) / 600));

                return hackingTime * 1000;
            },
            get min() {
                const player = ns.getPlayer();
                const difficultyMult = server.hackLevel * server.security.min;

                const baseDiff = 500;
                const baseSkill = 50;
                const diffFactor = 2.5;
                let skillFactor = diffFactor * difficultyMult + baseDiff;
                skillFactor /= player.hacking + baseSkill;

                const hackTimeMultiplier = 5;
                const hackingTime =
                (hackTimeMultiplier * skillFactor) /
                (player.hacking_speed_mult * (1 + (Math.pow(player.intelligence, 0.8)) / 600));

                return Math.ceil(hackingTime * 1000);
            }
        },

        hackChance: {
            get current() {
                const player = ns.getPlayer();
                const hackFactor = 1.75;
                const difficultyMult = (100 - server.security.current) / 100;
                const skillMult = hackFactor * player.hacking;
                const skillChance = (skillMult - server.hackLevel) / skillMult;
                const chance =  skillChance * difficultyMult * player.hacking_chance_mult * (1 + (Math.pow(player.intelligence, 0.8)) / 600);

                if (chance > 1) { return 1; }
                if (chance < 0) { return 0; }
                return chance;
            },
            get max() {
                const player = ns.getPlayer();
                const hackFactor = 1.75;
                const difficultyMult = (100 - server.security.min) / 100;
                const skillMult = hackFactor * player.hacking;
                const skillChance = (skillMult - server.hackLevel) / skillMult;
                const chance =  skillChance * difficultyMult * player.hacking_chance_mult * (1 + (Math.pow(player.intelligence, 0.8)) / 600);

                if (chance > 1) { return 1; }
                if (chance < 0) { return 0; }
                return chance;
            }
        },

        growTime: {
            get current() { return Math.ceil(server.hackTime.current * growTimeMultiplier); },
            get min() { return Math.ceil(server.hackTime.min * growTimeMultiplier); }
        },

        weakenTime: {
            get current() { return Math.ceil(server.hackTime.current * weakenTimeMultiplier); },
            get min() { return Math.ceil(server.hackTime.min * weakenTimeMultiplier); }
        },

        get isHackingServer() {
            return server.hasRootAccess && server.ram.max > 0 && !server.isHacknet;
        },

        get isHackableServer() {
            return !server.isHome && !server.isPurchased && !server.isHacknet && server.hasRootAccess && (ns.getPlayer().hacking >= server.hackLevel) && server.money.max > 0;
        },

        get hackAttractiveness() {
            const player = ns.getPlayer();

            if (server.isPurchased || !server.hasRootAccess || player.hacking < server.hackLevel) { return 0; }

            const balanceFactor = 240;

            const difficultyMult = (100 - server.security.min) / 100;
            const skillMult = (player.hacking - (server.hackLevel - 1)) / player.hacking;
            const roughHackPercent = Math.max(0, Math.min((difficultyMult * skillMult) / balanceFactor, 1));

            return (server.money.max * roughHackPercent * server.hackChance.max) / server.hackTime.min;
        }
    };

    return server;
}
