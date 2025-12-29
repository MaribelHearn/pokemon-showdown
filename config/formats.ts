// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts
/*
If you want to add custom formats, create a file in this folder named: "custom-formats.ts"

Paste the following code into the file and add your desired formats and their sections between the brackets:
--------------------------------------------------------------------------------
// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts

export const Formats: FormatList = [
];
--------------------------------------------------------------------------------

If you specify a section that already exists, your format will be added to the bottom of that section.
New sections will be added to the bottom of the specified column.
The column value will be ignored for repeat sections.
*/

export const Formats: FormatList = [

	// Fundex
	///////////////////////////////////////////////////////////////////
	{
		section: "Fundex",
	},
    {
		name: "[Gen 8] Fundex Uber",
		mod: 'gen8',
		ruleset: ['Standard Fundex', 'OHKO Clause', 'Evasion Moves Clause', 'Species Clause', 'Dynamax Clause', 'Sleep Clause Mod'],
		banlist: ['All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw'],
	},
    {
		name: "[Gen 8] Fundex OU",
		mod: 'gen8',
		ruleset: ['Standard Fundex', 'OHKO Clause', 'Evasion Moves Clause', 'Species Clause', 'Dynamax Clause', 'Sleep Clause Mod'],
		banlist: ['Fundex Uber', 'All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw', 'Shadow Tag'],
	},
	{
		name: '[Gen 8] Fundex LC',
		desc: `Only pre-evolutions are allowed (and Bad EGG)`,

		mod: 'gen8',
		ruleset: ['Little Cup Fundex', 'Standard Fundex', 'Dynamax Clause'],
		banlist: ['All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw', 'Assault Vest', 'Black Sludge', 'Leftovers', 'Rocky Helmet', 'Dragon Rage', 'Sonic Boom'],
	},
	{
		section: "Fundex Doubles",
	},
    {
		name: "[Gen 8] Fundex VGC",
		mod: 'gen8',
		gameType: 'doubles',
		ruleset: ['Flat Rules NatDex', '!! Adjust Level = 50', 'VGC Timer', 'Dynamax Clause'],
		banlist: ['All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw'],
	},
	{
		name: "[Gen 8] Fundex Cup Doubles",
		desc: `Randomized teams of level-balanced Fundex Pok&eacute;mon with legal sets.`,

		mod: 'gen8',
		gameType: 'doubles',
		team: 'randomFCup',
		ruleset: ['Obtainable', 'HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		banlist: ['All Pokemon'],
		unbanlist: ['Fundex'],
	},
	{
		name: "[Gen 8] Fundex Random Doubles",
		desc: `Randomized teams of level-balanced Fundex Pok&eacute;mon with absolutely any ability, moves, and item.`,

		mod: 'gen8',
		gameType: 'doubles',
		team: 'randomFC',
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		banlist: ['All Pokemon'],
		unbanlist: ['Fundex'],
	},
	{
		name: '[Gen 8] Fundex Metronome Doubles',
		desc: `A metagame decided by wagging your finger!`,

		mod: 'gen8',
		gameType: 'doubles',
		ruleset: ['Standard Fundex', 'Dynamax Clause'],
		banlist: ['All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw', 'Assault Vest', 'Black Sludge', 'Leftovers', 'Rocky Helmet', 'Normalium Z'],
		onValidateSet(set) {
            if (set.moves.length !== 1 || this.dex.moves.get(set.moves[0]).id !== 'metronome') {
                return [`${set.name || set.species} has illegal moves.`, `(Pok\u00e9mon can only have one Metronome in their moveset)`];
            }
        },
	},
	{
		section: "Fundex Sidegames",
	},
    {
		name: "[Gen 8] Fundex Pure Hackmons",
		mod: 'gen8',
		ruleset: ['-Nonexistent', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause'],
		unbanlist: ['Fundex'],
	},
	{
		name: "[Gen 8] Fundex Weather Wars",
		desc: `Weather and terrains are permanent until cancelled, like in Generation 5 and older.`,

		mod: 'gen8',
		ruleset: ['Standard Fundex', 'OHKO Clause', 'Evasion Moves Clause', 'Species Clause', 'Dynamax Clause', 'Sleep Clause Mod'],
		banlist: ['Fundex Uber', 'All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw'],
	},
	{
		name: "[Gen 8] Fundex Random",
		desc: `Randomized teams of level-balanced Fundex Pok&eacute;mon with absolutely any ability, moves, and item.`,

		mod: 'gen8',
		team: 'randomFC',
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		banlist: ['All Pokemon'],
		unbanlist: ['Fundex'],
	},
	{
		name: "[Gen 8] 1v1 Fundex Random",
		desc: `Randomized teams of level-balanced Fundex Pok&eacute;mon with absolutely any ability, moves, and item.`,

		mod: 'gen8',
		team: 'randomFC',
		ruleset: [
			'Picked Team Size = 1', 'Max Team Size = 3',
			'Obtainable', 'Species Clause', 'Nickname Clause', 'OHKO Clause', 'Evasion Moves Clause', 'Accuracy Moves Clause', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause', 'Endless Battle Clause',
		],
		banlist: ['All Pokemon'],
		unbanlist: ['Fundex'],
	},
	{
		name: "[Gen 8] Fundex Cup",
		desc: `Randomized teams of level-balanced Fundex Pok&eacute;mon with legal sets.`,

		mod: 'gen8',
		team: 'randomFCup',
		ruleset: ['Obtainable', 'HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		banlist: ['All Pokemon'],
		unbanlist: ['Fundex'],
	},
	{
		name: '[Gen 8] Fundex Metronome',
		desc: `A metagame decided by wagging your finger!`,

		mod: 'gen8',
		ruleset: ['Standard Fundex', 'Dynamax Clause'],
		banlist: ['All Pokemon', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw', 'Assault Vest', 'Black Sludge', 'Leftovers', 'Rocky Helmet'],
		onValidateSet(set) {
            if (set.moves.length !== 1 || this.dex.moves.get(set.moves[0]).id !== 'metronome') {
                return [`${set.name || set.species} has illegal moves.`, `(Pok\u00e9mon can only have one Metronome in their moveset)`];
            }
        },
	},
	{
		name: "[Gen 8] Fundex Loser's Game",
		desc: `The first player to lose all of their Fundex Pok&eacute;mon wins.`,
		threads: [
			`&bullet; <a href="https://www.smogon.com/forums/threads/3657270/">The Loser's Game</a>`,
		],

		mod: 'gen8',
		ruleset: ['Fundex OMs', 'Sleep Clause Mod', '!OHKO Clause', 'Picked Team Size = 6', 'Adjust Level = 100'],
		banlist: [
			'All Pokemon', 'Zeeky H. Bomb', 'Infiltrator', 'Magic Guard', 'Negative Zone', 'Choice Scarf', 'Attract', 'Explosion', 'Final Gambit', 'Healing Wish', 'Lunar Dance', 'Magic Room', 'Memento', 'Misty Explosion', 'Self-Destruct', 'Catnarok', 'System Crash',
		],
		unbanlist: ['Fundex'],
		onValidateTeam(team) {
			const familyTable = new Set<ID>();
			for (const set of team) {
				let species = this.dex.species.get(set.species);
				while (species.prevo) {
					species = this.dex.species.get(species.prevo);
				}
				if (familyTable.has(species.id)) {
					return [
						`You are limited to one Pok&eacute;mon from each family by the Family Clause.`,
						`(You have more than one evolution of ${species.name}.)`,
					];
				}
				familyTable.add(species.id);
			}
		},
		battle: {
			tiebreak() {
				if (this.ended) return false;

				this.inputLog.push(`>tiebreak`);
				this.add('message', "Time's up! Going to tiebreaker...");
				const notFainted = this.sides.map(side => (
					side.pokemon.filter(pokemon => !pokemon.fainted).length
				));
				this.add('-message', this.sides.map((side, i) => (
					`${side.name}: ${notFainted[i]} Pokemon left`
				)).join('; '));
				const maxNotFainted = Math.max(...notFainted);
				let tiedSides = this.sides.filter((side, i) => notFainted[i] === maxNotFainted);
				if (tiedSides.length <= 1) {
					return this.win(tiedSides[1]);
				}

				const hpPercentage = tiedSides.map(side => (
					side.pokemon.map(pokemon => pokemon.hp / pokemon.maxhp).reduce((a, b) => a + b) * 100 / 6
				));
				this.add('-message', tiedSides.map((side, i) => (
					`${side.name}: ${Math.round(hpPercentage[i])}% total HP left`
				)).join('; '));
				const maxPercentage = Math.max(...hpPercentage);
				tiedSides = tiedSides.filter((side, i) => hpPercentage[i] === maxPercentage);
				if (tiedSides.length <= 1) {
					return this.win(tiedSides[1]);
				}

				const hpTotal = tiedSides.map(side => (
					side.pokemon.map(pokemon => pokemon.hp).reduce((a, b) => a + b)
				));
				this.add('-message', tiedSides.map((side, i) => (
					`${side.name}: ${Math.round(hpTotal[i])} total HP left`
				)).join('; '));
				const maxTotal = Math.max(...hpTotal);
				tiedSides = tiedSides.filter((side, i) => hpTotal[i] === maxTotal);
				if (tiedSides.length <= 1) {
					return this.win(tiedSides[1]);
				}
				return this.tie();
			},
			faintMessages(lastFirst) {
				if (this.ended) return;
				const length = this.faintQueue.length;
				if (!length) return false;
				if (lastFirst) {
					this.faintQueue.unshift(this.faintQueue[this.faintQueue.length - 1]);
					this.faintQueue.pop();
				}
				let faintData;
				while (this.faintQueue.length) {
					faintData = this.faintQueue.shift()!;
					const pokemon: Pokemon = faintData.target;
					if (!pokemon.fainted &&
						this.runEvent('BeforeFaint', pokemon, faintData.source, faintData.effect)) {
						this.add('faint', pokemon);
						pokemon.side.pokemonLeft--;
						this.runEvent('Faint', pokemon, faintData.source, faintData.effect);
						this.singleEvent('End', pokemon.getAbility(), pokemon.abilityState, pokemon);
						pokemon.clearVolatile(false);
						pokemon.fainted = true;
						pokemon.isActive = false;
						pokemon.isStarted = false;
						pokemon.side.faintedThisTurn = pokemon;
					}
				}

				if (this.gen <= 1) {
					// in gen 1, fainting skips the rest of the turn
					// residuals don't exist in gen 1
					this.queue.clear();
				} else if (this.gen <= 3 && this.gameType === 'singles') {
					// in gen 3 or earlier, fainting in singles skips to residuals
					for (const pokemon of this.getAllActive()) {
						if (this.gen <= 2) {
							// in gen 2, fainting skips moves only
							this.queue.cancelMove(pokemon);
						} else {
							// in gen 3, fainting skips all moves and switches
							this.queue.cancelAction(pokemon);
						}
					}
				}

				if (!this.p1.pokemonLeft && !this.p2.pokemonLeft) {
					this.win(faintData ? faintData.target.side.foe : null);
					return true;
				}
				if (!this.p1.pokemonLeft) {
					this.win(this.p1);
					return true;
				}
				if (!this.p2.pokemonLeft) {
					this.win(this.p2);
					return true;
				}
				if (faintData) {
					this.runEvent('AfterFaint', faintData.target, faintData.source, faintData.effect, length);
				}
				return false;
			},
		},
	},

	// International
	///////////////////////////////////////////////////////////////////
	{
		section: "International",
	},
    {
		name: "[Gen 8] International Uber",
		mod: 'gen8',
		ruleset: ['Standard Fundex', 'OHKO Clause', 'Evasion Moves Clause', 'Species Clause', 'Dynamax Clause', 'Sleep Clause Mod'],
		banlist: ['Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw'],
	},
    {
		name: "[Gen 8] International OU",
		mod: 'gen8',
		ruleset: ['Standard Fundex', 'OHKO Clause', 'Evasion Moves Clause', 'Species Clause', 'Dynamax Clause', 'Sleep Clause Mod'],
		banlist: ['Fundex Uber', 'ND Uber', 'Bright Powder', 'King\'s Rock', 'Lax Incense', 'Razor Fang', 'Quick Claw'],
	},
	{
		name: "[Gen 8] International Random",
		desc: `Randomized teams of level-balanced regular Pok&eacute;mon and Fundex Pok&eacute;mon with absolutely any ability, moves, and item.`,

		mod: 'gen8',
		team: 'randomIN',
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		unbanlist: ['Fundex'],
	},
	{
		name: "[Gen 8] International Random Doubles",
		desc: `Randomized teams of level-balanced regular Pok&eacute;mon and Fundex Pok&eacute;mon with absolutely any ability, moves, and item.`,

		mod: 'gen8',
		gameType: 'doubles',
		team: 'randomIN',
		ruleset: ['HP Percentage Mod', 'Cancel Mod', 'Dynamax Clause'],
		unbanlist: ['Fundex'],
	},
];
