'use strict';

exports.BattleMovedex = {
	allyswitch: {
		inherit: true,
		desc: "The user swaps positions with its ally on the opposite side of the field. Fails if there is no Pokemon at that position, if the user is the only Pokemon on its side, or if the user is in the middle.",
		shortDesc: "Switches position with the ally on the far side.",
		priority: 1,
	},
	brickbreak: {
		inherit: true,
		desc: "If this attack does not miss, the effects of Reflect and Light Screen end for the target's side of the field before damage is calculated.",
	},
	darkvoid: {
		inherit: true,
		accuracy: 80,
	},
	destinybond: {
		inherit: true,
		onPrepareHit: function () {},
		onHit: function () {},
	},
	diamondstorm: {
		inherit: true,
		desc: "Has a 50% chance to raise the user's Defense by 1 stage.",
		shortDesc: "50% chance to raise user's Def by 1 for each hit.",
		secondary: {
			chance: 50,
			self: {
				boosts: {
					def: 1,
				},
			},
		},
	},
	fellstinger: {
		inherit: true,
		basePower: 30,
		effect: {
			duration: 1,
			onAfterMoveSecondarySelf: function (pokemon, target, move) {
				if (!target || target.fainted || target.hp <= 0) this.boost({atk:2}, pokemon, pokemon, move);
				pokemon.removeVolatile('fellstinger');
			},
		},
	},
	flyingpress: {
		inherit: true,
		basePower: 80,
	},
	leechlife: {
		inherit: true,
		basePower: 20,
		pp: 15,
	},
	mistyterrain: {
		inherit: true,
		desc: "For 5 turns, the terrain becomes Misty Terrain. During the effect, the power of Dragon-type attacks used against grounded Pokemon is multiplied by 0.5 and grounded Pokemon cannot be inflicted with a major status condition. Camouflage transforms the user into a Fairy type, Nature Power becomes Moonblast, and Secret Power has a 30% chance to lower Special Attack by 1 stage. Fails if the current terrain is Misty Terrain.",
		effect: {
			duration: 5,
			durationCallback: function (source, effect) {
				if (source && source.hasItem('terrainextender')) {
					return 8;
				}
				return 5;
			},
			onSetStatus: function (status, target, source, effect) {
				if (!target.isGrounded() || target.isSemiInvulnerable()) return;
				if (effect.id === 'synchronize' || (effect.effectType === 'Move' && !effect.secondaries)) {
					this.add('-activate', target, 'move: Misty Terrain');
				}
				return false;
			},
			onBasePower: function (basePower, attacker, defender, move) {
				if (move.type === 'Dragon' && defender.isGrounded() && !defender.isSemiInvulnerable()) {
					this.debug('misty terrain weaken');
					return this.chainModify(0.5);
				}
			},
			onStart: function (battle, source, effect) {
				if (effect && effect.effectType === 'Ability') {
					this.add('-fieldstart', 'move: Misty Terrain', '[from] ability: ' + effect, '[of] ' + source);
				} else {
					this.add('-fieldstart', 'move: Misty Terrain');
				}
			},
			onResidualOrder: 21,
			onResidualSubOrder: 2,
			onEnd: function (side) {
				this.add('-fieldend', 'Misty Terrain');
			},
		},
	},
	mysticalfire: {
		inherit: true,
		basePower: 65,
	},
	paraboliccharge: {
		inherit: true,
		basePower: 50,
	},
	suckerpunch: {
		inherit: true,
		basePower: 80,
	},
	swagger: {
		inherit: true,
		accuracy: 90,
	},
	tackle: {
		inherit: true,
		basePower: 50,
	},
	thunderwave: {
		inherit: true,
		accuracy: 100,
	},
	watershuriken: {
		inherit: true,
		category: "Physical",
		desc: "Hits two to five times. Has a 1/3 chance to hit two or three times, and a 1/6 chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Ability Skill Link, this move will always hit five times.",
	},
};
