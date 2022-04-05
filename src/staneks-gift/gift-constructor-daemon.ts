import { Fragment, NS } from '@ns'
import { MessageType, ScriptLogger } from '/libraries/script-logger';
import { runDodgerScriptBulk } from '/helpers/dodger-helper';
import { IScriptRun } from '/data-types/dodger-data';
import { IBoardLayout, IFragmentPlacement } from '/data-types/staneks-gift-data';

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
    ["hacking-skill", false],
    ["hacking-speed", false],
    ["hacking-power", false],
    ["grow-power", false],
    ["strength-skill", false],
    ["defense-skill", false],
    ["dexterity-skill", false],
    ["agility-skill", false],
    ["charisma-skill", false],
    ["hacknet-production", false],
    ["hacknet-cost", false],
    ["reputation-gain", false],
    ["work-money", false],
    ["crime-money", false],
    ["bladeburner-stats", false]
];

// Flag set variables
let help = false; // Print help
let verbose = false; // Log in verbose mode
let debug = false; // Log in debug mode

let hackingSkill = false; // Place the hacking skill fragments
let hackingSpeed = false; // Place the hacking speed fragment
let hackingPower = false; // Place the hacking power fragment
let growPower = false; // Place the grow power fragment
let strengthSkill = false; // Place the strength skill fragment
let defenceSkill = false; // Place the defense skill fragment
let dexteritySkill = false; // Place the dexterity skill fragment
let agilitySkill = false; // Place the agility skill fragment
let charismaSkill = false; // Place the charisma skill fragment
let hacknetProduction = false; // Place the hacknet production fragment
let hacknetCost = false; // Place the hacknet cost fragment
let reputationGain = false; // Place the reputation gain fragment
let workMoney = false; // Place the work money fragment
let crimeMoney = false; // Place the crime money fragment
let bladeburnerStats = false; // Place the bladeburner stats fragment

/*
 * > SCRIPT VARIABLES <
*/

/* File where saved boards layouts are stored/ */
const SAVED_BOARDS_FILE = "/staneks-gift/boards.txt";

/* Array of fragment shape rotations. */
let fragmentRotations : { [key : number] : boolean[][][] } = [];

/* Array of fragments that are to be placed on the board. */
let fragmentIdsToPlace : number[] = [];

/* Array of saved board configuations. */
let savedBoards : IBoardLayout[] = [];

/*
 * ------------------------
 * > ENVIRONMENT SETUP FUNCTION
 * ------------------------
*/

/**
 * Set up the environment for this script.
 * @param ns NS object parameter.
 */
function setupEnvironment(ns : NS) : void {
	fragmentRotations = [];
	ns.stanek.fragmentDefinitions().forEach(
		(frag) => fragmentRotations[frag.id] = calculateShapeRotations(frag)
	);

	fragmentIdsToPlace = [];
	if (hackingSkill) fragmentIdsToPlace.push(0, 1);
	if (hackingSpeed) fragmentIdsToPlace.push(5);
	if (hackingPower) fragmentIdsToPlace.push(6);
	if (growPower) fragmentIdsToPlace.push(7);
	if (strengthSkill) fragmentIdsToPlace.push(10);
	if (defenceSkill) fragmentIdsToPlace.push(12);
	if (dexteritySkill) fragmentIdsToPlace.push(14);
	if (agilitySkill) fragmentIdsToPlace.push(16);
	if (charismaSkill) fragmentIdsToPlace.push(18);
	if (hacknetProduction) fragmentIdsToPlace.push(20);
	if (hacknetCost) fragmentIdsToPlace.push(21);
	if (reputationGain) fragmentIdsToPlace.push(25);
	if (workMoney) fragmentIdsToPlace.push(27);
	if (crimeMoney) fragmentIdsToPlace.push(28);
	if (bladeburnerStats) fragmentIdsToPlace.push(30);

	savedBoards = JSON.parse(ns.read(SAVED_BOARDS_FILE));
}

/*
 * ------------------------
 * > GIFT FRAGMENT SHAPE ROTATION CALCULATOR FUNCTION
 * ------------------------
*/

/**
 * Calculate the rotation of a fragment's shape.
 * @param fragment Gift fragment.
 * @returns Rotated shape matrix.
 */
 function calculateShapeRotations(fragment : Fragment) : boolean[][][] {
	const shape1 : boolean[][] = JSON.parse(JSON.stringify(fragment.shape));
	const shape2 : boolean[][] = JSON.parse(JSON.stringify(fragment.shape));
	const shape3 : boolean[][] = JSON.parse(JSON.stringify(fragment.shape));
	const shape4 : boolean[][] = JSON.parse(JSON.stringify(fragment.shape));

	const rotations : boolean[][][] = [
		shape1,
		rotateMatrix(shape2) as boolean[][],
		rotateMatrix(rotateMatrix(shape3)) as boolean[][],
		rotateMatrix(rotateMatrix(rotateMatrix(shape4))) as boolean[][],
	];

	return rotations;
}

/**
 * ROtate a matrix 90 degrees clockwise.
 * @param matrix 2d matrix to be rotated 90 degrees clockwise.
 * @returns Rotated matrix.
 */
function rotateMatrix(matrix : unknown[][]) : unknown[][] {
	return matrix[0].map((_val, index) => matrix.map(row => row[index]).reverse());
}

/**
 * Get the rotation of a fragment's shape.
 * @param fragment Fragment.
 * @param rotation Number of 90 degree clockwise rotations.
 * @returns Rotated shape matrix.
 */
function getShapeRotation(fragment : Fragment, rotation : number) : boolean[][] {
	rotation = rotation % 4;
	return fragmentRotations[fragment.id][rotation];
}

/*
 * ------------------------
 * > GIFT BOARD SAVE + LOAD FUNCTIONS
 * ------------------------
*/

/**
 * Load a saved board layout of the given height and width with the desired fragments.
 * @param height Board height
 * @param width Board width
 * @returns Saved board layout if found; other nothing.
 */
 function tryLoadBoard(height : number, width: number) : IBoardLayout | undefined {
	const board = savedBoards.find((board) =>
		board.height === height &&
		board.width === width &&
		board.fragments.length === fragmentIdsToPlace.length &&
		fragmentIdsToPlace.every((id) => board.fragments.includes(id))
	);

	return board;
}

/**
 * Save a constructed board layout.
 * @param ns NS object parameter.
 * @param height Height of board.
 * @param width Width of board.
 * @param fragments Fragment placements array.
 */
async function saveBoardLayout(ns : NS, height : number, width : number, fragments : IFragmentPlacement[]) : Promise<void> {
	savedBoards.push({
		height: height,
		width: width,
		fragments: fragmentIdsToPlace,
		placements: fragments
	});

	await ns.write(SAVED_BOARDS_FILE, JSON.stringify(savedBoards), 'w');
}

/*
 * ------------------------
 * > GIFT BOARD CONSTRUCTION FUNCTIONS
 * ------------------------
*/

/**
 * Construct a new gift board with the desired fragments.
 * @param ns NS object parameter.
 */
async function constructStanekGiftBoard(ns : NS) : Promise<void> {
	const scripts : IScriptRun[] = [
		{ script: "/staneks-gift/dodger/giftHeight.js", args: [] },
		{ script: "/staneks-gift/dodger/giftWidth.js", args: [] }
	];

	const results = await runDodgerScriptBulk(ns, scripts);

	const height = results[0] as number;
	const width = results[1] as number;

	const boosterFragments = ns.stanek.fragmentDefinitions().filter((frag) => frag.id >= 100);

	logger.log(
		`Gift Settings: Height: ${height}, Width: ${width}, Fragments: ${fragmentIdsToPlace}`
	, { type: MessageType.info });

	logger.log("Trying to load saved board", { type: MessageType.info });
	const loadedBoard = tryLoadBoard(height, width)

	if (loadedBoard) {
		logger.log("Board succesfully loaded - beginning fragment placement", { type: MessageType.success });
		await placeGiftFragments(ns, loadedBoard.placements);
	} else {
		logger.log("No board found - constructing new board instead (this may take a while)", { type: MessageType.warning });

		logger.log("Constructing temporary board with no boosters", { type: MessageType.info });
		let tempFragments = await getFragmentPlacements(ns, height, width, []);

		if (tempFragments.length > 0) {
			await placeGiftFragments(ns, tempFragments);
		} else {
			logger.log("Unable to place desired fragments. Please choose less required fragments", { type: MessageType.fail, sendToast: true });
			return;
		}

		logger.log("Constructing optimised board", { type: MessageType.info });
		let optimisedFragments = await getFragmentPlacements(ns, height, width, boosterFragments);

		if (optimisedFragments.length > 0) {
			await saveBoardLayout(ns, height, width, optimisedFragments);
			await placeGiftFragments(ns, optimisedFragments);
		} else {
			logger.log("Unable to place desired fragments. Please choose less required fragments", { type: MessageType.fail, sendToast: true });
			return;
		}
	}
}

/**
 * Try and construct a board using the provided fragments.
 * @param ns NS object parameter
 * @param height Height of the board.
 * @param width Width of the board.
 * @param boosterFragments Array of booster fragments
 * @returns Array of placed fragments; or nothing if not all fragments could be placed.
 */
async function getFragmentPlacements(ns : NS, height : number, width : number, boosterFragments : Fragment[]) : Promise<IFragmentPlacement[]> {
	const board : number[][] = Array(height).fill([]).map(() => Array(width).fill(-1));
	const fragmentsToPlace = ns.stanek.fragmentDefinitions().filter((frag) => fragmentIdsToPlace.includes(frag.id));
	const fragmentPlacements = await getOptimalFragmentPlacements(ns, board, 0, [], fragmentsToPlace, boosterFragments, boosterFragments.length === 0);

	if (fragmentPlacements) {
		return fragmentPlacements;
	} else {
		return [];
	}
}


/**
 * Placement fragments on the gift board such that the result is nice and good :)
 * @param ns NS object parameter.
 * @param board Current gift board state.
 * @param depth Depth in placement recursion.
 * @param placements Currently placed fragments
 * @param fragmentsToPlace Array of core fragments to place on the board.
 * @param boosterFragments Array of booster fragments
 * @returns Optimal* gift fragment placements.
 */
async function getOptimalFragmentPlacements(ns : NS, board : number[][], depth : number, placements : IFragmentPlacement[], fragmentsToPlace : Fragment[], boosterFragments : Fragment[], alt = false) : Promise<IFragmentPlacement[] | undefined> {

	await ns.asleep(1);

	let bestScore = 0;
	let bestPlacement = placements;

	if (fragmentsToPlace.length > 0) {
		let placed = false;
		const frag = fragmentsToPlace.pop() as Fragment;
		for (let rot = 0; rot <= 3; rot++) {
			const shape = getShapeRotation(frag, rot);
			const fragHeight = shape.length - 1;
			const fragWidth = shape[0].length - 1;
			for (let y = 0; y < board.length - fragHeight; y++) {
				for (let x = 0; x < board[0].length - fragWidth; x++) {
					if (shape[0][0] && board[y][x] !== -1) continue;
					if (mockCanPlaceFragment(board, x, y, shape)) {
						placed = true;
						const newBoard = mockPlaceFragment(board, x, y, shape, frag.id);
						const deepPlacements = await getOptimalFragmentPlacements(ns, newBoard, depth+1, [...placements, { fragment: frag, rootX: x, rootY: y, rotation: rot }], fragmentsToPlace, boosterFragments, alt);
						if (!deepPlacements) return;

						const deepScore = scoreBoard(newBoard, deepPlacements, alt);

						if (deepScore > bestScore) {
							bestScore = deepScore;
							bestPlacement = deepPlacements;
						}
					}
				}
			}
		}

		if (!placed) return;
	} else if (shouldTryPlaceBoosterFragments(board)) {
		for (const frag of boosterFragments) {
			for (let rot = 0; rot <= 3; rot++) {
				const shape = getShapeRotation(frag, rot);
				const fragHeight = shape.length  -1;
				const fragWidth = shape[0].length - 1;
				for (let y = 0; y < board.length - fragHeight; y++) {
					for (let x = 0; x < board[0].length - fragWidth; x++) {
						if (mockCanPlaceFragment(board, x, y, shape) && fragmentTouchesNonBooster(board, x, y, shape)) {
							const newBoard = mockPlaceFragment(board, x, y, shape, frag.id);
							const deepPlacements = await getOptimalFragmentPlacements(ns, newBoard, depth+1, [...placements, { fragment: frag, rootX: x, rootY: y, rotation: rot }], fragmentsToPlace, boosterFragments);
							if (!deepPlacements) return;

							const deepScore = scoreBoard(newBoard, deepPlacements);

							if (deepScore > bestScore) {
								bestScore = deepScore;
								bestPlacement = deepPlacements;
							}
						}
					}
				}
			}
		}
	}

	return bestPlacement;
}


/**
 * Get count of booster fragments touching non-boosters
 * @param placements
 * @returns
 */
function scoreBoard(board : number[][], placements : IFragmentPlacement[], alt = false) : number {
	if (alt) {
		return placements.length;
	}

	const fragments = placements.filter((frag) => frag.fragment.id < 100);

	let score = 0;
	let hitBoard = Array(board.length).fill([]).map(() => Array(board[0].length).fill(0));

	for (const frag of fragments) {
		const shape = getShapeRotation(frag.fragment, frag.rotation);

		let x = frag.rootX;
		let y = frag.rootY;

		for (let i = 0; i < shape.length; i++) {
			for (let j = 0; j < shape[0].length; j++) {
				if (shape[i][j]) {
					const p = y + i;
					const q = x + j;

					if (p > 0 					? board[p - 1][q] > 100 : false) hitBoard[p][q] = 1;
					if (p < board.length - 1 	? board[p + 1][q] > 100 : false) hitBoard[p][q] = 1;
					if (q > 0 					? board[p][x - 1] > 100 : false) hitBoard[p][q] = 1;
					if (q < board[0].length - 1 ? board[p][x + 1] > 100 : false) hitBoard[p][q] = 1;
				}
			}
		}
	}

	for (let y = 0; y < hitBoard.length; y++) {
		for (let x = 0; x < hitBoard[0].length; x++) {
			if (hitBoard[y][x] === 1) score++;
		}
	}

	return score;
}

function getLargestBlobSize(board : number[][]) : number {
	const taken : string[] = [];

	let mostFree = 0;
	for (let y = 0; y < board.length; y++) {
		for (let x = 0; x < board[0].length; x++) {
			if (board[y][x] === -1 && !taken.includes(`${x}${y}`)) {
				const blob = getConnectedFree(board, x, y);
				taken.push(...blob);
				mostFree = Math.max(mostFree, blob.length)
			}
		}
	}

	return mostFree;

}

function getConnectedFree(board : number[][], x : number, y : number) : string[] {

	function getConnectedFreeRecursive(x : number, y : number, found : string[]) : string[] {
		//console.log(`${x} ${y} ${board[y][x]}`);
		if ((y > 0 						? board[y - 1][x] === -1 : false) && !found.includes(`${x}${y-1}`)) {
			found.push(`${x}${y-1}`);
			found = getConnectedFreeRecursive(x, y - 1, found);
		}

		if ((y < board.length - 1 		? board[y + 1][x] === -1 : false) && !found.includes(`${x}${y+1}`)) {
			found.push(`${x}${y+1}`);
			found = getConnectedFreeRecursive(x, y + 1, found);
		}

		if ((x > 0 						? board[y][x - 1] === -1 : false) && !found.includes(`${x-1}${y}`)) {
			found.push(`${x-1}${y}`);
			found = getConnectedFreeRecursive(x - 1, y, found);
		}

		if ((x < board[0].length - 1 	? board[y][x + 1] === -1 : false) && !found.includes(`${x+1}${y}`)) {
			found.push(`${x+1}${y}`);
			found = getConnectedFreeRecursive(x + 1, y, found);
		}

		return found;
	}

	const blob = getConnectedFreeRecursive(x, y, [`${x}${y}`]);

	const blobArray = Array(6).fill([]).map(() => Array(6).fill(0));

	for (const b of blob) {
		blobArray[parseInt(b[1])][parseInt(b[0])] = 1;
	}

	for (const a of blobArray) {
		console.log(a);
	}
	console.log("---");

	return blob;
}

function shouldTryPlaceBoosterFragments(board : number[][]) : boolean {
	//if (getLargestBlobSize(board) < 5) return false;

	let maxBlob = 0;

	for (let y = 0; y < board.length; y++) {
		for (let x = 0; x < board[0].length; x++) {
			if (board[y][x] < 100 && board[y][x] !== -1) {

				if ((y > 0 					 ? board[y - 1][x] === -1 : false)) { maxBlob = Math.max(maxBlob, getConnectedFree(board, x, y-1).length); }
				if ((y < board.length - 1 	 ? board[y + 1][x] === -1 : false)) { maxBlob = Math.max(maxBlob, getConnectedFree(board, x, y+1).length); }
				if ((x > 0 					 ? board[y][x - 1] === -1 : false)) { maxBlob = Math.max(maxBlob, getConnectedFree(board, x-1, y).length); }
				if ((x < board[0].length - 1 ? board[y][x + 1] === -1 : false)) { maxBlob = Math.max(maxBlob, getConnectedFree(board, x+1, y).length); }


			}
		}
	}

	return maxBlob >= 5;
}

function fragmentTouchesNonBooster(board : number[][], x : number, y : number, shape : boolean[][]) : boolean {
	for (let i = 0; i < shape.length; i++) {
		for (let j = 0; j < shape[0].length; j++) {
			if (shape[i][j]) {
				const p = y + i;
				const q = x + j;
				if (
					(p > 0 					 ? board[p - 1][q] !== -1 && board[p - 1][q] < 100 : false) ||
					(p < board.length - 1 	 ? board[p + 1][q] !== -1 && board[p + 1][q] < 100 : false) ||
					(q > 0					 ? board[p][q - 1] !== -1 && board[p][q - 1] < 100 : false) ||
					(q < board[0].length - 1 ? board[p][q + 1] !== -1 && board[p][q + 1] < 100 : false)
				) return true;
			}
		}
	}

	return false;
}

function mockCanPlaceFragment(board : number[][], x : number, y : number, shape : boolean[][]) : boolean {
	if (y + (shape.length - 1)    >= board.length)    return false;
	if (x + (shape[0].length - 1) >= board[0].length) return false;

	for (let i = 0; i < shape.length; i++) {
		for (let j = 0; j < shape[0].length; j++) {
			if (shape[i][j] && (board[y + i][x + j] !== -1)) return false;
		}
	}

	return true;
}

function mockPlaceFragment(board : number[][], x : number, y : number, shape : boolean[][], fragId : number) : number[][] {
	const newBoard = JSON.parse(JSON.stringify(board));

	for (let i = 0; i < shape.length; i++) {
		for (let j = 0; j < shape[0].length; j++) {
			if (shape[i][j]) newBoard[y + i][x + j] = fragId;
		}
	}

	return newBoard;
}

/*
 * ------------------------
 * > GIFT FRAGMENT PLACEMENT FUNCTION
 * ------------------------
*/

/**
 * Place the given fragments on the gift board at their specified locations and rotations.
 * @param ns NS object parameter.
 * @param fragments Array of fragment placements.
 */
async function placeGiftFragments(ns : NS, fragments : IFragmentPlacement[]) {
	logger.log("Clearing old board", { type: MessageType.warning });
	ns.stanek.clearGift();

	logger.log("Placing new fragments", { type: MessageType.info });

	const canPlace = await checkCanPlaceAllFragments(ns, fragments);
	if (canPlace) {
		await doPlaceAllFragments(ns, fragments);
	} else {
		logger.log(`Unable to place all fragment`, { type: MessageType.error, sendToast: true });
	}
}

/**
 * Check if all fragments supplied can be placed on the Staneks Gift board.
 * @param ns NS object.
 * @param fragments Array of fragment placement objects.
 * @returns True if all fragments can be placed; false otherwise.
 */
async function checkCanPlaceAllFragments(ns : NS, fragments : IFragmentPlacement[]) : Promise<boolean> {
	const scripts : IScriptRun[] = [];

	for (const frag of fragments) {
		logger.log(`Fragment ${frag.fragment.id} @ [${frag.rootX}, ${frag.rootY}]`, { type: MessageType.info });
		for (const a of fragmentRotations[frag.fragment.id][frag.rotation]) {
			ns.print(a.map((t) => (t ? 'X' : ' ')));
		}
		ns.print("");

		scripts.push({ script: "/staneks-gift/dodger/canPlaceFragment.js", args: [frag.rootX, frag.rootY, frag.rotation, frag.fragment.id] });
	}

	const results = await runDodgerScriptBulk(ns, scripts);

	return results.every((t) => (t as boolean));
}

/**
 * Place all fragments on the Staneks Gift board.
 * @param ns NS object.
 * @param fragments Array of fragment placement objects.
 */
async function doPlaceAllFragments(ns : NS, fragments : IFragmentPlacement[]) : Promise<void> {
	const scripts : IScriptRun[] = [];

	for (const frag of fragments) {
		scripts.push({ script: "/staneks-gift/dodger/placeFragment.js", args: [frag.rootX, frag.rootY, frag.rotation, frag.fragment.id] });
	}

	const results = await runDodgerScriptBulk(ns, scripts);

	for (let i = 0; i < results.length; i++) {
		if (results[i]) {
			logger.log(`Successfully placed fragment ${scripts[i].args[3]}`, { type: MessageType.success });
		} else {
			logger.log(`Unable to place fragment ${scripts[i].args[3]}`, { type: MessageType.error });
		}
	}
}

/*
 * ------------------------
 * > MAIN LOOP
 * ------------------------
*/

/** @param {NS} ns 'ns' namespace parameter. */
export async function main(ns: NS) : Promise<void> {
	ns.disableLog("ALL");
    logger = new ScriptLogger(ns, "GIFT-BUILD", "Gift Constructor Daemon");

	// Parse flags
	const flags = ns.flags(flagSchema);
	help = flags.h || flags["help"];
	verbose = flags.v || flags["verbose"];
	debug = flags.d || flags["debug"];

    hackingSkill = flags["hacking-skill"];
    hackingSpeed = flags["hacking-speed"];
    hackingPower = flags["hacking-power"];
    growPower = flags["grow-power"];
    strengthSkill = flags["strength-skill"];
    defenceSkill = flags["defense-skill"];
    dexteritySkill = flags["dexterity-skill"];
    agilitySkill = flags["agility-skill"];
    charismaSkill = flags["charisma-skill"];
    hacknetProduction = flags["hacknet-production"];
    hacknetCost = flags["hacknet-cost"];
    reputationGain = flags["reputation-gain"];
    workMoney = flags["work-money"];
    crimeMoney = flags["crime-money"];
    bladeburnerStats = flags["bladeburner-stats"];

	if (verbose) logger.setLogLevel(2);
	if (debug) 	 logger.setLogLevel(3);

	// Helper output
	if (help) {
		ns.tprintf('%s',
			`Stanek's Gift Constructor Daemon\n`+
			`Description:\n` +
			`   Constructs Stanek's Gift based on the desired fragments... glorious..!\n` +
			`Usage:\n` +
			`   run /staneks-gift/gift-constructor-daemon.js [flags]\n` +
			`Flags:\n` +
			`   -h or --help               : boolean |>> Prints this.\n` +
			`   -v or --verbose            : boolean |>> Sets logging level to 2 - more verbosing logging.\n` +
			`   -d or --debug              : boolean |>> Sets logging level to 3 - even more verbosing logging.\n` +
			`         --hacking-skill      : boolean |>> Place the hacking skill fragments in the gift.\n` +
			`         --hacking-speed      : boolean |>> Place the hacking speed fragment in the gift.\n` +
			`         --hacking-power      : boolean |>> Place the hacking power fragment in the gift.\n` +
			`         --grow-power         : boolean |>> Place the grow power fragment in the gift.\n` +
			`         --strength-skill     : boolean |>> Place the strength power fragment in the gift.\n` +
			`         --defense-skill      : boolean |>> Place the defense skill fragment in the gift.\n` +
			`         --dexterity-skill    : boolean |>> Place the dexterity skill fragment in the gift.\n` +
			`         --agility-skill      : boolean |>> Place the agility fragment in the gift.\n` +
			`         --charisma-skill     : boolean |>> Place the charisma fragment in the gift.\n` +
			`         --hacknet-production : boolean |>> Place the hacknet production fragment in the gift.\n` +
			`         --hacknet-cost       : boolean |>> Place the hacknet cost fragment in the gift.\n` +
			`         --reputation-gain    : boolean |>> Place the reputation gain fragment in the gift.\n` +
			`         --work-money         : boolean |>> Place the work money fragment in the gift.\n` +
			`         --crime-money        : boolean |>> Place the crime money fragment in the gift.\n` +
			`         --bladeburner-stats  : boolean |>> Place the bladeburner stats fragment in the gift.`
		);

		return;
	}

	setupEnvironment(ns);

	logger.initialisedMessage(true, false);

	await constructStanekGiftBoard(ns);
}
