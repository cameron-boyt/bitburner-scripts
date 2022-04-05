import { AugmentationStats } from "/../NetscriptDefinitions.js";

/* ---- CITIES ---- */
export const CITIES = ["Aevum", "Chongqing", "Sector-12", "New Tokyo", "Ishima", "Volhaven"];

/* ---- COMPANIES ---- */

export const COMPANIES = [
    "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma", "NWO", "Blade Industries", "OmniTek Incorporated",
	"Bachman & Associates", "Clarke Incorporated", "Fulcrum Technologies"
];

/* ---- FACTIONS ---- */
export const HACK_FACTIONS = ["CyberSec", "Tian Di Hui", "Netburners", "NiteSec", "The Black Hand", "BitRunners"];
export const CRIME_FACTIONS = ["Slum Snakes", "Tetrads", "Silhouette", "Speakers for the Dead", "The Dark Army", "The Syndicate"]
export const COMPANY_FACTIONS = [
    "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma", "NWO", "Blade Industries", "OmniTek Incorporated",
	"Bachman & Associates", "Clarke Incorporated", "Fulcrum Secret Technologies"
];
export const CITY_FACTIONS = ["Sector-12", "Aevum", "Chongqing", "New Tokyo", "Ishima", "Volhaven"];
export const ENDGAME_FACTIONS = ["The Covenant", "Daedalus", "Illuminati"];

export const ALL_FACTIONS = [...HACK_FACTIONS, ...CRIME_FACTIONS, ...COMPANY_FACTIONS, ...CITY_FACTIONS, ...ENDGAME_FACTIONS];

export interface ILevelReqs {
	hacking?: number;
	strength?: number;
	defense?: number;
	dexterity?: number;
	agility?: number;
	charisma?: number;
}

export interface ICompanyRepReq {
	company: string;
	rep: number;
    server: string;
}

export interface IFactionReqs {
    faction: string;
    levels?: ILevelReqs;
    karma?: number;
    peopleKilled?: number;
    money?: number;
    location?: string[];
    augCount?: number;
    backdoor?: string;
    companyRep?: ICompanyRepReq;
    highJobStatus?: boolean;
    hacknet?: boolean;
    difficulty: number;
}

export const FACTION_REQUIREMENTS : { [key : string] : IFactionReqs } = {
    "CyberSec": {
        faction: 'CyberSec',
        backdoor: 'CSEC',
        difficulty: 1
    },
    "Tian Di Hui": {
        faction: 'Tian Di Hui',
        levels: { hacking: 50 },
        money: 1e6,
        location: ['Chongqing', 'New Tokyo', 'Ishima'],
        difficulty: 1
    },
    "Netburners": {
        faction: 'Netburners',
        levels: { hacking: 80 },
        hacknet: true,
        difficulty: 1
    },
    "Sector-12": {
        faction: 'Sector-12',
        location: ['Sector-12'],
        money: 15e6,
        difficulty: 1
    },
    "Chongqing": {
        faction: 'Chongqing',
        location: ['Chongqing'],
        money: 20e6,
        difficulty: 1
    },
    "New Tokyo": {
        faction: 'New Tokyo',
        location: ['New Tokyo'],
        money: 20e6,
        difficulty: 1
    },
    "Ishima": {
        faction: 'Ishima',
        location: ['Ishima'],
        money: 30e6,
        difficulty: 1
    },
    "Aevum": {
        faction: 'Aevum',
        location: ['Aevum'],
        money: 40e6,
        difficulty: 1
    },
    "Volhaven": {
        faction: 'Volhaven',
        location: ['Volhaven'],
        money: 50e6,
        difficulty: 1
    },
    "NiteSec": {
        faction: 'NiteSec',
        backdoor: 'avmnite-02h',
        difficulty: 2
    },
    "The Black Hand": {
        faction: 'The Black Hand',
        backdoor: 'I.I.I.I',
        difficulty: 2
    },
    "BitRunners": {
        faction: 'BitRunners',
        backdoor: 'run4theh111z',
        difficulty: 2
    },
    "ECorp": {
        faction: 'ECorp',
        companyRep: {
            company: 'ECorp',
            rep: 200e3,
            server: 'ecorp'
        },
        difficulty: 4
    },
    "MegaCorp": {
        faction: 'MegaCorp',
        companyRep: {
            company: 'MegaCorp',
            rep: 200e3,
            server: 'megacorp'
        },
        difficulty: 4
    },
    "KuaiGong International": {
        faction: 'KuaiGong International',
        companyRep: {
            company: 'KuaiGong International',
            rep: 200e3,
            server: 'fulcrumassets'
        },
        difficulty: 4
    },
    "Four Sigma": {
        faction: 'Four Sigma',
        companyRep: {
            company: 'Four Sigma',
            rep: 200e3,
            server: '4sigma'
        },
        difficulty: 4
    },
    "NWO": {
        faction: 'NWO',
        companyRep: {
            company: 'NWO',
            rep: 200e3,
            server: 'nwo'
        },
        difficulty: 4
    },
    "Blade Industries": {
        faction: 'Blade Industries',
        companyRep: {
            company: 'Blade Industries',
            rep: 200e3,
            server: 'blade'
        },
        difficulty: 4
    },
    "OmniTek Incorporated": {
        faction: 'OmniTek Incorporated',
        companyRep: {
            company: 'OmniTek Incorporated',
            rep: 200e3,
            server: 'omnitek'
        },
        difficulty: 4
    },
    "Bachman & Associates": {
        faction: 'Bachman & Associates',
        companyRep: {
            company: 'Bachman & Associates',
            rep: 200e3,
            server: 'b-and-a'
        },
        difficulty: 4
    },
    "Clarke Incorporated": {
        faction: 'Clarke Incorporated',
        companyRep: {
            company: 'Clarke Incorporated',
            rep: 200e3,
            server: 'clarkinc'
        },
        difficulty: 4
    },
    "Fulcrum Secret Technologies": {
        faction: 'Fulcrum Secret Technologies',
        backdoor: 'fulcrumassets',
        companyRep: {
            company: 'Fulcrum Technologies',
            rep: 250e3,
            server: 'fulcrumassets'
        },
        difficulty: 4
    },
    "Slum Snakes": {
        faction: 'Slum Snakes',
        levels: {
            strength: 30,
            defense: 30,
            dexterity: 30,
            agility: 30
        },
        karma: -9,
        money: 1e6,
        difficulty: 2
    },
    "Tetrads": {
        faction: 'Tetrads',
        levels: {
            strength: 75,
            defense: 75,
            dexterity: 75,
            agility: 75
        },
        karma: -18,
        location: ['Chongqing', 'New Tokyo', 'Ishima'],
        difficulty: 2
    },
    "Silhouette": {
        faction: 'Silhouette',
        karma: -22,
        money: 1e6,
        highJobStatus: true,
        difficulty: 9
    },
    "Speakers for the Dead": {
        faction: 'Speakers for the Dead',
        levels: {
            hacking: 100,
            strength: 300,
            defense: 300,
            dexterity: 300,
            agility: 300
        },
        karma: -45,
        peopleKilled: 30,
        difficulty: 5
    },
    "The Dark Army": {
        faction: 'The Dark Army',
        levels: {
            hacking: 300,
            strength: 300,
            defense: 300,
            dexterity: 300,
            agility: 300
        },
        karma: -45,
        peopleKilled: 5,
        location: ['Chongqing'],
        difficulty: 5
    },
    "The Syndicate": {
        faction: 'The Syndicate',
        levels: {
            hacking: 200,
            strength: 200,
            defense: 200,
            dexterity: 200,
            agility: 200
        },
        karma: -90,
        money: 10e6,
        location: ['Aevum', 'Sector-12'],
        difficulty: 3
    },
    "The Covenant": {
        faction: 'The Covenant',
        levels: {
            hacking: 850,
            strength: 850,
            defense: 850,
            dexterity: 850,
            agility: 850
        },
        money: 75e9,
        augCount: 20,
        difficulty: 7
    },
    "Daedalus": {
        faction: 'Daedalus',
        levels: {
            hacking: 2500
        },
        money: 100e9,
        augCount: 30,
        difficulty: 6
    },
    "Illuminati": {
        faction: 'Illuminati',
        levels: {
            hacking: 1500,
            strength: 1200,
            defense: 1200,
            dexterity: 1200,
            agility: 1200
        },
        money: 150e9,
        augCount: 30,
        difficulty: 8
    }
};

export const DONATE_REP_DIVISOR = 1e6;

/* ---- AUGMENTS ---- */

export interface IAugmentInfo {
    name : string;
    factions : string[];
    cost : number;
    repReq : number;
    preReq : string[];
    stats : AugmentationStats;
}

export const AUG_PRICE_FACTOR = 1.9;

/* ---- SERVERS ---- */
export const MAX_SERVER_TIER = 20;

/* ---- CRIMES ---- */

export const CRIMES = [
    "Shoplift", "Rob store", "Mug someone", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick illegal Arms",
    "Homicide", "Grand thefo Auto", "Kidnap and Random", "Assassinate", "Heist"
];


/* ---- PROGRAMS ---- */
export interface IProgramInfo {
    name: string;
    hacking: number;
    cost: number;
}

export const PROGRAMS : IProgramInfo[] = [
    { name: "BruteSSH.exe", hacking: 50, cost: 500e3 },
    { name: "FTPCrack.exe", hacking: 100, cost: 1.5e6 },
    { name: "relaySMTP.exe", hacking: 250, cost: 5e6 },
    { name: "HTTPWorm.exe", hacking: 500, cost: 30e6 },
    { name: "SQLInject.exe", hacking: 750, cost: 250e6 },
    { name: "Serverprofiler.exe", hacking: 75, cost: 500e3 },
    { name: "DeepscanV1.exe", hacking: 75, cost: 500e3 },
    { name: "DeepscanV2.exe", hacking: 400, cost: 25e6 },
    { name: "AutoLink.exe", hacking: 25, cost: 1e6 },
    { name: "Formulas.exe", hacking: 2000, cost: 5e9 },
];

/* ---- COMPANY JOBS ---- */
export interface IJobInfo {
    title: string;
    field: string;
    nextPosition: string | null;
    levelReq? : {
        hacking? : number;
        strength? : number;
        defense? : number;
        dexterity? : number;
        agility? : number;
        charisma? : number;
    };
    repReq? : number;
}

export interface ICompanyJobs {
    company: string;
    levelOffset: number;
    jobs: IJobInfo[];
}

const SOFTWARE_JOBS : IJobInfo[] = [
    {
        title: 'Software Engineering Intern',
        field: "Software",
        nextPosition: 'Junior Software Engineer',
        levelReq: {
            hacking: 1
        }
    },
    {
        title: 'Junior Software Engineer',
        field: "Software",
        nextPosition: 'Senior Software Engineer',
        levelReq: {
            hacking: 51
        },
        repReq: 8e3
    },
    {
        title: 'Senior Software Engineer',
        field: "Software",
        nextPosition: 'Lead Software Developer',
        levelReq: {
            hacking: 251,
            charisma: 51
        },
        repReq: 40e3
    },
    {
        title: 'Lead Software Developer',
        field: "Software",
        nextPosition: 'Head of Software',
        levelReq: {
            hacking: 401,
            charisma: 151
        },
        repReq: 200e3
    },
    {
        title: 'Head of Software',
        field: "Software",
        nextPosition: 'Head of Engineering',
        levelReq: {
            hacking: 501,
            charisma: 251
        },
        repReq: 400e3
    },
    {
        title: 'Head of Engineering',
        field: "Software",
        nextPosition: 'Vice President of Technology',
        levelReq: {
            hacking: 501,
            charisma: 251
        },
        repReq: 800e6
    },
    {
        title: 'Vice President of Technology',
        field: "Software",
        nextPosition: 'Chief Technology Officer',
        levelReq: {
            hacking: 601,
            charisma: 401
        },
        repReq: 1.6e6
    },
    {
        title: 'Chief Technology Officer',
        field: "Software",
        nextPosition: null,
        levelReq: {
            hacking: 751,
            charisma: 501
        },
        repReq: 3.2e6
    }
]

export const COMPANY_JOBS : ICompanyJobs[] = [
	{
        company: 'ECorp',
        levelOffset: 249,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'MegaCorp',
        levelOffset: 249,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'KuaiGong International',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'Four Sigma',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'NWO',
        levelOffset: 249,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'Blade Industries',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'OmniTek Incorporated',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'Bachman & Associates',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'Clarke Incorporated',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    },
	{
        company: 'Fulcrum Technologies',
        levelOffset: 224,
        jobs: SOFTWARE_JOBS
    }
]

/* ---- CORPORATIONS ---- */

export const INDUSTRIES = [
    "Energy",
    "Water Utilities",
    "Agriculture",
    "Fishing",
    "Mining",
    "Food",
    "Tobacco",
    "Chemical",
    "Pharmaceutical",
    "Computer Hardware",
    "Robotics",
    "Software",
    "Healthcare",
    "RealEstate"
];

export const PRODUCT_INDUSTRIES = [
    "Food",
    "Tobacco",
    "Pharmaceutical",
    "Computer Hardware",
    "Robotics",
    "Software",
    "Healthcare",
    "RealEstate"
];
