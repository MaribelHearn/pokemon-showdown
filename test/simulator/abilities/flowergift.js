'use strict';

const assert = require('./../../assert');
let battle;

describe('Flower Gift', function () {
	afterEach(function () {
		battle.destroy();
	});

	it('should boost allies\' Attack and Special Defense stats', function () {
		battle = BattleEngine.Battle.construct('battle-flowergift-boost', 'doublescustomgame');
		battle.join('p1', 'Guest 1', 1, [
			{species: "Cherrim", ability: 'flowergift', moves: ['healbell']},
			{species: "Snorlax", ability: 'immunity', moves: ['healbell']},
		]);
		battle.join('p2', 'Guest 2', 1, [
			{species: "Blissey", ability: 'serenegrace', moves: ['healbell']},
			{species: "Blissey", ability: 'serenegrace', moves: ['healbell']},
		]);
		battle.commitDecisions();
		let cherAtk = battle.p1.active[0].getStat('atk');
		let cherSpd = battle.p1.active[0].getStat('spd');
		let baseAtk = battle.p1.active[1].getStat('atk');
		let baseSpd = battle.p1.active[1].getStat('spd');

		// Set the weather to sun and re-check
		battle.setWeather('sunnyday');
		assert.strictEqual(battle.p1.active[0].getStat('atk'), battle.modify(cherAtk, 1.5));
		assert.strictEqual(battle.p1.active[0].getStat('spd'), battle.modify(cherSpd, 1.5));
		assert.strictEqual(battle.p1.active[1].getStat('atk'), battle.modify(baseAtk, 1.5));
		assert.strictEqual(battle.p1.active[1].getStat('spd'), battle.modify(baseSpd, 1.5));
	});

	it('should still work if Cherrim transforms into something with Flower Gift without originally having it', function () {
		battle = BattleEngine.Battle.construct('battle-flowergift-boost', 'doublescustomgame');
		battle.join('p1', 'Guest 1', 1, [
			{species: "Cherrim", ability: 'serenegrace', moves: ['transform']},
			{species: "Snorlax", ability: 'immunity', moves: ['healbell']},
		]);
		battle.join('p2', 'Guest 2', 1, [
			{species: "Blissey", ability: 'flowergift', moves: ['healbell']},
			{species: "Blissey", ability: 'flowergift', moves: ['healbell']},
		]);
		battle.commitDecisions();
		battle.choose('p1', 'move 1 1, move 1');
		battle.choose('p2', 'move 1, move 1');
		let cherAtk = battle.p1.active[0].getStat('atk');
		let cherSpd = battle.p1.active[0].getStat('spd');
		let baseAtk = battle.p1.active[1].getStat('atk');
		let baseSpd = battle.p1.active[1].getStat('spd');

		// Set the weather to sun and re-check
		battle.setWeather('sunnyday');
		assert.strictEqual(battle.p1.active[0].getStat('atk'), battle.modify(cherAtk, 1.5));
		assert.strictEqual(battle.p1.active[0].getStat('spd'), battle.modify(cherSpd, 1.5));
		assert.strictEqual(battle.p1.active[1].getStat('atk'), battle.modify(baseAtk, 1.5));
		assert.strictEqual(battle.p1.active[1].getStat('spd'), battle.modify(baseSpd, 1.5));
	});
});
