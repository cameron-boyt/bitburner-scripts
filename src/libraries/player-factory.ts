import { NS, Player, PlayerSkills } from '@ns'

export interface IPlayerObject {
    player : Player;

    money : number;
    location :string;
    city : string;

    karma : number;
    peopleKilled : number;

    jobs : {[key : string] : string};

    factions : {
        joinedFactions : string[];
        factionRepMult : number;
    };

    hp : {
        current : number;
        max : number;
    };

    stats : PlayerSkills;

    statInfo : {
        agility : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
        };

        charisma : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
        };

        defense : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
        };

        dexterity : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
        };

        hacking : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
            growMult : number;
            moneyMult : number;
            speedMult : number;
            chanceMult : number;
        };

        intelligence : {
            level : number;
        };

        strength : {
            level : number;
            levelMult : number;
            exp : number;
            expMult : number;
        };
    };

    factionWorkWeight : {
        hacking : number;
        field : number;
        security : number;
    };

    hasTor : boolean;
    hasCorp : boolean;

    stocks : {
        hasWSE : boolean;
        hasTixApi : boolean;
        has4SData : boolean;
        has4SDataTixApi : boolean;
    };

    bitnodeN : number;

    hacknet : {
        productionMult : number;
        purchaseCostMult : number;
        coresCostMult : number;
        levelCostMult : number;
        ramCostMult : number;
    };
}

export function genPlayer(ns : NS) : IPlayerObject {
    const player : IPlayerObject = {
        get player() { return ns.getPlayer() },

        get money() { return ns.getPlayer().money; },
        get location() { return ns.getPlayer().location; },
        get city() { return ns.getPlayer().city; },

        get karma() { return ns.heart.break(); },
        get peopleKilled() { return ns.getPlayer().numPeopleKilled; },

        get jobs() { return ns.getPlayer().jobs; },

        factions: {
            get joinedFactions() { return ns.getPlayer().factions; },
            get factionRepMult() { return ns.getPlayer().faction_rep_mult; }
        },

        hp: {
            get current() { return ns.getPlayer().hp; },
            get max() { return ns.getPlayer().max_hp; }
        },

        stats: {
            get agility() { return ns.getPlayer().agility; },
            get charisma() { return ns.getPlayer().charisma; },
            get defense() { return ns.getPlayer().defense; },
            get dexterity() { return ns.getPlayer().dexterity; },
            get hacking() { return ns.getPlayer().hacking; },
            get strength() { return ns.getPlayer().strength; },
            get intelligence() { return ns.getPlayer().intelligence; }
        },

        statInfo: {
            agility: {
                get level() { return ns.getPlayer().agility; },
                get levelMult() { return ns.getPlayer().agility_mult; },
                get exp() { return ns.getPlayer().agility_exp; },
                get expMult() { return ns.getPlayer().agility_exp_mult; }
            },
            charisma: {
                get level() { return ns.getPlayer().charisma; },
                get levelMult() { return ns.getPlayer().charisma_mult; },
                get exp() { return ns.getPlayer().charisma_exp; },
                get expMult() { return ns.getPlayer().charisma_exp_mult; }
            },
            defense: {
                get level() { return ns.getPlayer().defense; },
                get levelMult() { return ns.getPlayer().defense_mult; },
                get exp() { return ns.getPlayer().defense_exp; },
                get expMult() { return ns.getPlayer().defense_exp_mult; }
            },
            dexterity: {
                get level() { return ns.getPlayer().dexterity; },
                get levelMult() { return ns.getPlayer().dexterity_mult; },
                get exp() { return ns.getPlayer().dexterity_exp; },
                get expMult() { return ns.getPlayer().dexterity_exp_mult; }
            },
            hacking: {
                get level() { return ns.getPlayer().hacking; },
                get levelMult() { return ns.getPlayer().hacking_mult; },
                get exp() { return ns.getPlayer().hacking_exp; },
                get expMult() { return ns.getPlayer().hacking_exp_mult; },
                get growMult() { return ns.getPlayer().hacking_grow_mult; },
                get moneyMult() { return ns.getPlayer().hacking_money_mult; },
                get speedMult() { return ns.getPlayer().hacking_speed_mult; },
                get chanceMult() { return ns.getPlayer().hacking_chance_mult; }
            },
            intelligence: {
                get level() { return ns.getPlayer().intelligence; },
            },
            strength: {
                get level() { return ns.getPlayer().strength; },
                get levelMult() { return ns.getPlayer().strength_mult; },
                get exp() { return ns.getPlayer().strength_exp; },
                get expMult() { return ns.getPlayer().strength_exp_mult; }
            }
        },

        factionWorkWeight : {
            get hacking() { return player.stats.hacking; },
            get field() {
                return (
                    player.stats.hacking + player.stats.strength + player.stats.defense +
                    player.stats.dexterity + player.stats.agility + player.stats.charisma
                ) / 6;
            },
            get security() {
                return (
                    player.stats.hacking + player.stats.strength + player.stats.defense +
                    player.stats.dexterity + player.stats.agility
                ) / 5;
            }
        },

        get hasTor() { return ns.getPlayer().tor; },

        get hasCorp() { return ns.getPlayer().hasCorporation; },

        stocks: {
            get hasWSE() { return ns.getPlayer().hasWseAccount; },
            get hasTixApi() { return ns.getPlayer().hasTixApiAccess; },
            get has4SData() { return ns.getPlayer().has4SData; },
            get has4SDataTixApi() { return ns.getPlayer().has4SDataTixApi; },
        },

        get bitnodeN() { return ns.getPlayer().bitNodeN; },

        hacknet : {
            get productionMult() { return ns.getPlayer().hacknet_node_money_mult; },
            get purchaseCostMult() { return ns.getPlayer().hacknet_node_purchase_cost_mult; },
            get coresCostMult() { return ns.getPlayer().hacknet_node_core_cost_mult; },
            get levelCostMult() { return ns.getPlayer().hacknet_node_level_cost_mult; },
            get ramCostMult() { return ns.getPlayer().hacknet_node_ram_cost_mult; },
        }
    };

    return player;
}
