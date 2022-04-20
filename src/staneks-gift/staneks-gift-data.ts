import { Fragment } from '@ns'

export interface IFragmentPlacement {
	fragment : Fragment;
	rootX : number;
	rootY : number;
	rotation : number;
}

export interface IBoardLayout {
	height : number;
	width : number;
	fragments : number[];
	placements : IFragmentPlacement[];
}

export enum FragmentType {
	// Special fragments for the UI
	None,
	Delete,

	// Stats boosting fragments
	HackingChance,
	HackingSpeed,
	HackingMoney,
	HackingGrow,
	Hacking,
	Strength,
	Defense,
	Dexterity,
	Agility,
	Charisma,
	HacknetMoney,
	HacknetCost,
	Rep,
	WorkMoney,
	Crime,
	Bladeburner,

	// utility fragments.
	Booster,
}
