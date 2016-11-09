'use strict';

exports.BattleAbilities = {
	"galewings": {
		inherit: true,
		shortDesc: "This Pokemon's Flying-type moves have their priority increased by 1.",
		onModifyPriority: function (priority, pokemon, target, move) {
			if (move && move.type === 'Flying') return priority + 1;
		},
		rating: 4.5,
	},
	"multitype": {
		inherit: true,
		shortDesc: "If this Pokemon is an Arceus, its type changes to match its held Plate.",
	},
	"normalize": {
		inherit: true,
		desc: "This Pokemon's moves are changed to be Normal type. This effect comes before other effects that change a move's type.",
		shortDesc: "This Pokemon's moves are changed to be Normal type.",
		onModifyMovePriority: 1,
		onModifyMove: function (move) {
			if (move.id !== 'struggle' && this.getMove(move.id).type !== 'Normal') {
				move.type = 'Normal';
			}
		},
		rating: -1,
	},
	"parentalbond": {
		inherit: true,
		desc: "This Pokemon's damaging moves become multi-hit moves that hit twice. The second hit has its damage halved. Does not affect multi-hit moves or moves that have multiple targets.",
		shortDesc: "This Pokemon's damaging moves hit twice. The second hit has its damage halved.",
		effect: {
			duration: 1,
			onBasePowerPriority: 8,
			onBasePower: function (basePower) {
				if (this.effectData.hit) {
					this.effectData.hit++;
					return this.chainModify(0.5);
				} else {
					this.effectData.hit = 1;
				}
			},
			onSourceModifySecondaries: function (secondaries, target, source, move) {
				if (move.id === 'secretpower' && this.effectData.hit < 2) {
					// hack to prevent accidentally suppressing King's Rock/Razor Fang
					return secondaries.filter(effect => effect.volatileStatus === 'flinch');
				}
			},
		},
	},
	"unaware": {
		inherit: true,
		desc: "This Pokemon ignores other Pokemon's Attack, Special Attack, and accuracy stat stages when taking damage, and ignores other Pokemon's Defense, Special Defense, and evasiveness stat stages when dealing damage.",
		shortDesc: "This Pokemon ignores other Pokemon's stat stages when taking or doing damage.",
		onAnyModifyBoost: function (boosts, target) {
			let source = this.effectData.target;
			if (source === target) return;
			if (source === this.activePokemon && target === this.activeTarget) {
				boosts['def'] = 0;
				boosts['spd'] = 0;
				boosts['evasion'] = 0;
			}
			if (target === this.activePokemon && source === this.activeTarget) {
				boosts['atk'] = 0;
				boosts['spa'] = 0;
				boosts['accuracy'] = 0;
			}
		},
		rating: 3,
	},
	"weakarmor": {
		desc: "If a physical attack hits this Pokemon, its Defense is lowered by 1 stage and its Speed is raised by 1 stage.",
		shortDesc: "If a physical attack hits this Pokemon, Defense is lowered by 1, Speed is raised by 1.",
		onAfterDamage: function (damage, target, source, move) {
			if (move.category === 'Physical') {
				this.boost({def:-1, spe:1});
			}
		},
		rating: 0.5,
	},
};
