'use strict';

exports.BattleScripts = {
	init: function () {
		let abilityToItem = {
			aerilate: 'airballoon',
			adaptability: 'apicotberry',
			anticipation: 'blackbelt',
			arenatrap: 'buggem',
			aromaveil: 'blackglasses',
			aurabreak: 'blacksludge',
			baddreams: 'brightpowder',
			battlearmor: 'cellbattery',
			bigpecks: 'charcoal',
			blaze: 'chartiberry',
			bulletproof: 'chestoberry',
			cheekpouch: 'chilanberry',
			chlorophyll: 'chopleberry',
			clearbody: 'cobaberry',
			cloudnine: 'colburberry',
			colorchange: 'custapberry',
			competitive: 'damprock',
			compoundeyes: 'dragonfang',
			contrary: 'darkgem',
			cursedbody: 'ejectbutton',
			cutecharm: 'expertbelt',
			damp: 'flameorb',
			darkaura: 'focusband',
			defeatist: 'fullincense',
			defiant: 'ganlonberry',
			deltastream: 'grepaberry',
			desolateland: 'gripclaw',
			download: 'habanberry',
			drizzle: 'hardstone',
			drought: 'heatrock',
			dryskin: 'iapapaberry',
			earlybird: 'icyrock',
			effectspore: 'kasibberry',
			fairyaura: 'kebiaberry',
			filter: 'keeberry',
			flamebody: 'kelpsyberry',
			flareboost: 'kingsrock',
			flashfire: 'laggingtail',
			flowergift: 'lansatberry',
			flowerveil: 'laxincense',
			forecast: 'leppaberry',
			forewarn: 'liechiberry',
			friendguard: 'luminousmoss',
			frisk: 'magnet',
			furcoat: 'dragongem',
			galewings: 'marangaberry',
			gluttony: 'metalcoat',
			gooey: 'metronome',
			grasspelt: 'micleberry',
			guts: 'miracleseed',
			harvest: 'muscleband',
			healer: 'mysticwater',
			heatproof: 'nevermeltice',
			heavymetal: 'occaberry',
			honeygather: 'oddincense',
			hugepower: 'electricgem',
			hustle: 'passhoberry',
			hydration: 'payapaberry',
			hypercutter: 'petayaberry',
			icebody: 'poisonbarb',
			illuminate: 'quickclaw',
			illusion: 'razorclaw',
			immunity: 'razorfang',
			imposter: 'fairygem',
			infiltrator: 'rindoberry',
			innerfocus: 'rockincense',
			insomnia: 'roseincense',
			intimidate: 'redcard',
			ironbarbs: 'roseliberry',
			ironfist: 'safetygoggles',
			justified: 'salacberry',
			keeneye: 'scopelens',
			klutz: 'seaincense',
			leafguard: 'sharpbeak',
			levitate: 'shedshell',
			lightmetal: 'shellbell',
			lightningrod: 'shucaberry',
			limber: 'silkscarf',
			liquidooze: 'silverpowder',
			magicbounce: 'smoothrock',
			magicguard: 'snowball',
			magician: 'softsand',
			magmaarmor: 'spelltag',
			magnetpull: 'starfberry',
			marvelscale: 'stickybarb',
			megalauncher: 'tangaberry',
			minus: 'twistedspoon',
			moldbreaker: 'wacanberry',
			moody: 'waveincense',
			motordrive: 'weaknesspolicy',
			moxie: 'whiteherb',
			multiscale: 'widelens',
			multitype: 'wiseglasses',
			mummy: 'yacheberry',
			naturalcure: 'zoomlens',
			noguard: 'adamantorb',
			normalize: 'burndrive',
			oblivious: 'chilldrive',
			overcoat: 'deepseascale',
			overgrow: 'deepseatooth',
			owntempo: 'dousedrive',
			parentalbond: 'firegem',
			pickpocket: 'lightball',
			pickup: 'luckypunch',
			pixilate: 'griseousorb',
			plus: 'lustrousorb',
			poisonheal: 'metalpowder',
			poisonpoint: 'quickpowder',
			poisontouch: 'shockdrive',
			prankster: 'mail',
			pressure: 'stick',
			primordialsea: 'thickclub',
			protean: 'aguavberry',
			purepower: 'icegem',
			quickfeet: 'aspearberry',
			raindish: 'bindingband',
			rattled: 'cheriberry',
			reckless: 'destinyknot',
			refrigerate: 'enigmaberry',
			regenerator: 'figyberry',
			rivalry: 'floatstone',
			rockhead: 'ironball',
			roughskin: 'jabocaberry',
			runaway: 'machobrace',
			sandforce: 'magoberry',
			sandrush: 'oranberry',
			sandstream: 'pechaberry',
			sandveil: 'persimberry',
			sapsipper: 'rawstberry',
			scrappy: 'ringtarget',
			serenegrace: 'rowapberry',
			shadowtag: 'poisongem',
			shedskin: 'wikiberry',
			sheerforce: 'armorfossil',
			shellarmor: 'belueberry',
			shielddust: 'blukberry',
			simple: 'psychicgem',
			skilllink: 'cherishball',
			slowstart: 'clawfossil',
			sniper: 'cornnberry',
			snowcloak: 'coverfossil',
			snowwarning: 'diveball',
			solarpower: 'domefossil',
			solidrock: 'dreamball',
			soundproof: 'durinberry',
			speedboost: 'duskball',
			stall: 'electirizer',
			stancechange: 'energypowder',
			static: 'fastball',
			steadfast: 'friendball',
			stench: 'greatball',
			stickyhold: 'healball',
			stormdrain: 'heavyball',
			strongjaw: 'helixfossil',
			sturdy: 'hondewberry',
			suctioncups: 'levelball',
			superluck: 'loveball',
			swarm: 'lureball',
			sweetveil: 'luxuryball',
			swiftswim: 'magostberry',
			symbiosis: 'masterball',
			synchronize: 'moonball',
			tangledfeet: 'nanabberry',
			technician: 'nestball',
			telepathy: 'netball',
			teravolt: 'nomelberry',
			thickfat: 'oldamber',
			tintedlens: 'pamtreberry',
			torrent: 'parkball',
			toughclaws: 'pinapberry',
			toxicboost: 'plumefossil',
			trace: 'pokeball',
			truant: 'pomegberry',
			turboblaze: 'premierball',
			unaware: 'qualotberry',
			unburden: 'quickball',
			unnerve: 'rabutaberry',
			victorystar: 'rarebone',
			vitalspirit: 'razzberry',
			voltabsorb: 'repeatball',
			waterabsorb: 'rootfossil',
			waterveil: 'safariball',
			weakarmor: 'skullfossil',
			whitesmoke: 'spelonberry',
			wonderguard: 'steelgem',
			wonderskin: 'sportball',
			zenmode: 'tamatoberry',
		};
		Object.keys(abilityToItem).forEach(ability => {
			this.modData("Abilities", ability).item = abilityToItem[ability];
			let item = this.data.Items[abilityToItem[ability]];
			this.data.Items[abilityToItem[ability]] = Object.assign({}, this.getAbility(ability), {
				id: item.id,
				name: item.name,
				num: item.num,
				gen: item.gen,
				onTakeItem: false,
				ability: ability,
			});
		});
	},
	suppressingAttackEvents: function () {
		return (this.activePokemon && this.activePokemon.isActive && (!this.activePokemon.ignoringAbility() && this.activePokemon.getAbility().stopAttackEvents || !this.activePokemon.ignoringItem() && this.activePokemon.getItem().stopAttackEvents));
	},
	pokemon: {
		hasItem: function (item) {
			if (Tools.getItem(this.item).ability) return false;
			if (this.ignoringItem()) return false;
			if (!Array.isArray(item)) return this.item === toId(item);
			return item.map(toId).contains(this.item);
		},
		hasAbility: function (ability) {
			if (this.ignoringAbility()) return false;
			if (!Array.isArray(ability)) {
				ability = toId(ability);
				if (this.ability === ability) return true;
			} else {
				ability = ability.map(toId);
				if (ability.includes(this.ability)) return true;
			}
			if (ability === "klutz") return false;
			if (!this.item || this.ignoringItem()) return false;
			let item = this.battle.getItem(this.item);
			if (!Array.isArray(ability)) return ability === item.ability;
			return ability.includes(item.ability);
		},
		isGrounded: function (negateImmunity) {
			if ('gravity' in this.battle.pseudoWeather) return true;
			if ('ingrain' in this.volatiles) return true;
			if ('smackdown' in this.volatiles) return true;
			if (!negateImmunity && this.hasType('Flying')) return false;
			if (this.hasAbility('levitate') && !this.battle.suppressingAttackEvents()) return null;
			if ('magnetrise' in this.volatiles) return false;
			if ('telekinesis' in this.volatiles) return false;
			return true;
		},
	},
};