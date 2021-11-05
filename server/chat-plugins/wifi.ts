/**
 * Wi-Fi chat-plugin. Only works in a room with id 'wifi'
 * Handles giveaways in the formats: question, lottery, gts
 * Written by Kris and bumbadadabum, based on the original plugin as written by Codelegend, SilverTactic, DanielCranham
 */

import {FS, Utils} from '../../lib';

Punishments.addRoomPunishmentType({
	type: 'GIVEAWAYBAN',
	desc: 'banned from giveaways',
});

const BAN_DURATION = 7 * 24 * 60 * 60 * 1000;
const RECENT_THRESHOLD = 30 * 24 * 60 * 60 * 1000;

const DATA_FILE = 'config/chat-plugins/wifi.json';

type Game = 'SwSh' | 'BDSP';

interface QuestionGiveawayData {
	targetUserID: string;
	ot: string;
	tid: string;
	game: Game;
	prize: PokemonSet;
	ivs: string[];
	question: string;
	answers: string[];
	ball: string;
	extraInfo: string;
}

interface LotteryGiveawayData {
	targetUserID: string;
	ot: string;
	tid: string;
	game: Game;
	prize: PokemonSet;
	ivs: string[];
	winners: number;
	ball: string;
	extraInfo: string;
}

interface WifiData {
	stats: {[k: string]: number[]};
	storedGiveaways: {question: QuestionGiveawayData[], lottery: LotteryGiveawayData[]};
	submittedGiveaways: {question: QuestionGiveawayData[], lottery: LotteryGiveawayData[]};
}

export let wifiData: WifiData = (() => {
	try {
		return JSON.parse(FS(DATA_FILE).readSync());
	} catch (e: any) {
		if (e.code !== 'ENOENT') throw e;
		return {
			stats: {},
			storedGiveaways: {
				question: [],
				lottery: [],
			},
			submittedGiveaways: {
				question: [],
				lottery: [],
			},
		};
	}
})();

function saveData() {
	FS(DATA_FILE).writeUpdate(() => JSON.stringify(wifiData));
}

// Convert old file type
if (!wifiData.stats && !wifiData.storedGiveaways && !wifiData.submittedGiveaways) {
	// we cast under the assumption that it's the old file format
	const stats = {...wifiData} as unknown as {[k: string]: number[]};
	wifiData = {stats, storedGiveaways: {question: [], lottery: []}, submittedGiveaways: {question: [], lottery: []}};
	saveData();
}

const statNames = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];

const gameName: {[k in Game]: string} = {
	SwSh: 'Sword/Shield',
	BDSP: 'Brilliant Diamond/Shining Pearl',
};
const gameidToGame: {[k: string]: Game} = {
	swsh: 'SwSh',
	bdsp: 'BDSP',
};

class Giveaway extends Rooms.RoomGame {
	gaNumber: number;
	host: User;
	giver: User;
	room: Room;
	ot: string;
	tid: string;
	game: Game;
	ivs: string[];
	prize: PokemonSet;
	phase: string;
	ball: string;
	extraInfo: string;
	/**
	 * IP:userid
	 */
	joined: Map<string, ID>;
	timer: NodeJS.Timer | null;
	pokemonID: ID;
	sprite: string;

	constructor(
		host: User, giver: User, room: Room, ot: string, tid: string, ivs: string[],
		prize: PokemonSet, game: Game = 'BDSP', ball: string, extraInfo: string
	) {
		// Make into a sub-game if the gts ever opens up again
		super(room);
		this.gaNumber = room.nextGameNumber();
		this.host = host;
		this.giver = giver;
		this.room = room;
		this.ot = ot;
		this.tid = tid;
		this.ball = ball;
		this.extraInfo = extraInfo;
		this.game = game;
		this.ivs = ivs;
		this.prize = prize;
		this.phase = 'pending';

		this.joined = new Map();

		this.timer = null;

		this.sprite = '';
		[this.pokemonID, this.sprite] = Giveaway.getSprite(prize);
	}

	destroy() {
		this.clearTimer();
		super.destroy();
	}

	generateReminder() {}

	getStyle() {
		if (this.game === 'BDSP') return `style="background-color: #aa66a9;color: #fff;padding: 2px 4px;"`;
		return `class="broadcast-blue"`;
	}

	send(content: string) {
		this.room.add(`|uhtml|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${content}</div>`);
		this.room.add(`|c:|${Math.floor(Date.now() / 1000)}|&|It's ${this.game} giveaway time!`);
		this.room.update();
	}

	changeUhtml(content: string) {
		this.room.uhtmlchange(`giveaway${this.gaNumber}${this.phase}`, `<div ${this.getStyle()}>${content}</div>`);
		this.room.update();
	}

	clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	checkJoined(user: User) {
		for (const [ip, id] of this.joined) {
			if (user.latestIp === ip && !Config.noipchecks) return ip;
			if (user.previousIDs.includes(id)) return id;
		}
		return false;
	}

	kickUser(user: User) {
		for (const [ip, id] of this.joined) {
			if (user.latestIp === ip && !Config.noipchecks || user.previousIDs.includes(id)) {
				user.sendTo(
					this.room,
					`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${this.generateReminder()}</div>`
				);
				this.joined.delete(ip);
			}
		}
	}

	checkExcluded(user: User) {
		return (
			user === this.giver ||
			!Config.noipchecks && this.giver.ips.includes(user.latestIp) ||
			this.giver.previousIDs.includes(toID(user))
		);
	}

	static checkBanned(room: Room, user: User) {
		return Punishments.hasRoomPunishType(room, toID(user), 'GIVEAWAYBAN');
	}

	static ban(room: Room, user: User, reason: string) {
		Punishments.roomPunish(room, user, {
			type: 'GIVEAWAYBAN',
			id: toID(user),
			expireTime: Date.now() + BAN_DURATION,
			reason,
		});
	}

	static unban(room: Room, user: User) {
		Punishments.roomUnpunish(room, user.id, 'GIVEAWAYBAN', false);
	}

	static getSprite(set: PokemonSet): [ID, string] {
		const species = Dex.species.get(set.species);
		let spriteid = species.spriteid;
		if (species.cosmeticFormes) {
			for (const forme of species.cosmeticFormes.map(toID)) {
				if (toID(set.species).includes(forme)) {
					spriteid += '-' + forme.slice(species.baseSpecies.length);
					break; // We don't want to end up with deerling-summer-spring
				}
			}
		}
		const shiny = set.shiny ? '-shiny' : '';

		const validFemale = [
			'abomasnow', 'aipom', 'ambipom', 'beautifly', 'bibarel', 'bidoof', 'blaziken', 'buizel', 'cacturne', 'camerupt', 'combee',
			'combusken', 'croagunk', 'donphan', 'dustox', 'finneon', 'floatzel', 'frillish', 'gabite', 'garchomp', 'gible', 'girafarig',
			'gligar', 'golbat', 'gulpin', 'heracross', 'hippopotas', 'hippowdon', 'houndoom', 'indeedee', 'jellicent', 'kerfluffle', 'kitsunoh',
			'kricketot', 'kricketune', 'ledian', 'ledyba', 'ludicolo', 'lumineon', 'luxio', 'luxray', 'magikarp', 'mamoswine', 'medicham',
			'meditite', 'meganium', 'meowstic', 'milotic', 'murkrow', 'nidoran', 'numel', 'nuzleaf', 'octillery', 'pachirisu', 'pikachu',
			'pikachu-starter', 'piloswine', 'politoed', 'protowatt', 'pyroar', 'quagsire', 'raticate', 'rattata', 'relicanth', 'rhydon',
			'rhyperior', 'roselia', 'roserade', 'rotom', 'scizor', 'scyther', 'shiftry', 'shinx', 'sneasel', 'snover', 'staraptor', 'staravia',
			'starly', 'steelix', 'sudowoodo', 'swalot', 'tangrowth', 'torchic', 'toxicroak', 'unfezant', 'unown', 'ursaring', 'voodoom',
			'weavile', 'wobbuffet', 'wooper', 'xatu', 'zubat',
		];
		if (set.gender === 'F' && validFemale.includes(species.id)) spriteid += '-f';
		const output = `<img src="/sprites/ani${shiny}/${spriteid}.gif" />`;
		return [species.id, output];
	}

	static updateStats(pokemonIDs: Set<string>) {
		for (const mon of pokemonIDs) {
			if (!wifiData.stats[mon]) wifiData.stats[mon] = [];
			wifiData.stats[mon].push(Date.now());
		}
		saveData();
	}

	// Wi-Fi uses special IV syntax to show hyper trained IVs
	static convertIVs(setObj: PokemonSet, ivs: string[]) {
		let set = Teams.exportSet(setObj);
		let ivsStr = '';
		if (ivs.length) {
			const convertedIVs = {hp: '31', atk: '31', def: '31', spa: '31', spd: '31', spe: '31'};
			for (const [i, iv] of ivs.entries()) {
				const numStr = iv.trim().split(' ')[0];
				const statName = statNames[i];
				convertedIVs[toID(statName) as StatID] = numStr;
			}
			const array = Object.keys(convertedIVs).map((x, i) => `${convertedIVs[x as StatID]} ${statNames[i]}`);
			ivsStr = `IVs: ${array.join(' / ')}  `;
		}
		if (ivsStr) {
			if (/\nivs:/i.test(set)) {
				const arr = set.split('\n');
				const index = arr.findIndex(x => /^ivs:/i.test(x));
				arr[index] = ivsStr;
				set = arr.join('\n');
			} else if (/nature\n/i.test(set)) {
				const arr = set.split('\n');
				const index = arr.findIndex(x => /nature$/i.test(x));
				arr.splice(index + 1, 0, ivsStr);
				set = arr.join('\n');
			} else {
				set += `\n${ivsStr}`;
			}
		}
		return set;
	}

	generateWindow(rightSide: string) {
		let buf = `<center><h3>It's ${this.game} giveaway time!</h3>`;
		buf += Utils.html`<small>Giveaway started by ${this.host.name}</small>`;
		buf += `<table style="margin-left:auto;margin-right:auto">`;
		buf += Utils.html`<tr><td colspan="2" style="text-align:center"><strong>Giver:</strong> <username>${this.giver.name}</username><br /><strong>OT:</strong> ${this.ot}, <strong>TID:</strong> ${this.tid}</td></tr>`;
		buf += `<tr><td style="text-align:center;width:45%"><psicon item="${this.ball}" /> ${this.sprite} <psicon item="${this.ball}" />`;
		const set = Giveaway.convertIVs(this.prize, this.ivs);
		buf += `<p>${Chat.formatText(set, true)}</p></td>`;
		buf += `<td style="text-align:center;width:45%">${rightSide}</td></tr>`;
		if (this.extraInfo?.trim().length) {
			this.extraInfo = this.extraInfo.trim().replace(/<br \/>/g, '\n');
			buf += `<tr><td colspan="2" style="text-align:center;"><strong>Extra Information</strong><br />${Chat.formatText(this.extraInfo, true)}</td></tr>`;
		}
		buf += `</table>`;
		buf += `<p style="text-align:center;font-size:7pt;font-weight:bold;"><u>Note:</u> You must have a Switch, Pok&eacute;mon ${gameName[this.game]}, and Nintendo Switch Online to receive the prize. Do not join if you are currently unable to trade. Do not enter if you have already won this exact Pok&eacute;mon, unless it is explicitly allowed.</p>`;
		return buf;
	}
}

export class QuestionGiveaway extends Giveaway {
	type: string;
	question: string;
	answers: string[];
	/** userid: number of guesses */
	answered: Utils.Multiset<string>;
	winner: User | null;

	constructor(
		host: User, giver: User, room: Room, ot: string, tid: string, game: Game, ivs: string[],
		prize: PokemonSet, question: string, answers: string[], ball: string, extraInfo: string
	) {
		super(host, giver, room, ot, tid, ivs, prize, game, ball, extraInfo);
		this.type = 'question';
		this.phase = 'pending';

		this.question = question;
		this.answers = QuestionGiveaway.sanitizeAnswers(answers);
		this.answered = new Utils.Multiset();
		this.winner = null;
		this.send(this.generateWindow('The question will be displayed in one minute! Use /guess to answer.'));

		this.timer = setTimeout(() => this.start(), 1000 * 60);
	}

	static splitTarget(target: string, sep = '|', context: Chat.CommandContext, forCreate = false) {
		let [
			giver, ot, tid, game, question, answers, ivs, ball, extraInfo, ...prize
		] = target.split(sep).map(param => param.trim());
		if (!(giver && ot && tid && prize?.length && question && answers?.split(',').length)) {
			return context.parse(`/help giveaway`);
		}
		const targetUser = Users.get(giver);
		if (!targetUser?.connected) throw new Chat.ErrorMessage(`User '${giver}' is not online.`);
		if (!forCreate || (context.user.id !== targetUser.id && !context.user.can('show', null, context.room!))) {
			context.checkCan('warn', null, context.room!);
		}
		if (!!ivs && ivs.split('/').length !== 6) {
			throw new Chat.ErrorMessage(`If you provide IVs, they must be provided for all stats.`);
		}
		if (!game) game = 'BDSP';
		game = gameidToGame[toID(game)] || game as Game;
		if (!game || !['BDSP', 'SwSh'].includes(game)) throw new Chat.ErrorMessage(`The game must be "BDSP" or "SwSh".`);
		if (!ball) ball = 'pokeball';
		if (!toID(ball).endsWith('ball')) ball = toID(ball) + 'ball';
		if (!Dex.items.get(ball).isPokeball) {
			throw new Chat.ErrorMessage(`${Dex.items.get(ball).name} is not a Pok\u00e9 Ball.`);
		}
		tid = toID(tid);
		if (isNaN(parseInt(tid)) || tid.length < 5 || tid.length > 6) throw new Chat.ErrorMessage("Invalid TID");
		if (!targetUser.autoconfirmed) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' needs to be autoconfirmed to give something away.`);
		}
		if (Giveaway.checkBanned(context.room!, targetUser)) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' is giveaway banned.`);
		}
		return {
			targetUser, ot, tid, game, question, answers: answers.split(','),
			ivs: ivs.split('/'), ball, extraInfo, prize: prize.join('|'),
		};
	}

	generateQuestion() {
		return this.generateWindow(`<p style="text-align:center;font-size:13pt;">Giveaway Question: <b>${this.question}</b></p><p style="text-align:center;">use /guess to answer.</p>`);
	}

	start() {
		this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway has started! Scroll down to see the question.</p>');
		this.phase = 'started';
		this.send(this.generateQuestion());
		this.timer = setTimeout(() => this.end(false), 1000 * 60 * 5);
	}

	choose(user: User, guess: string) {
		if (this.phase !== 'started') return user.sendTo(this.room, "The giveaway has not started yet.");

		if (this.checkJoined(user) && ![...this.joined.values()].includes(user.id)) {
			return user.sendTo(this.room, "You have already joined the giveaway.");
		}
		if (Giveaway.checkBanned(this.room, user)) return user.sendTo(this.room, "You are banned from entering giveaways.");
		if (this.checkExcluded(user)) return user.sendTo(this.room, "You are disallowed from entering the giveaway.");

		if (this.answered.get(user.id) ?? 0 >= 3) {
			return user.sendTo(
				this.room,
				"You have already guessed three times. You cannot guess anymore in this.giveaway."
			);
		}

		const sanitized = toID(guess);

		for (const answer of this.answers.map(toID)) {
			if (answer === sanitized) {
				this.winner = user;
				this.clearTimer();
				return this.end(false);
			}
		}

		this.joined.set(user.latestIp, user.id);
		this.answered.add(user.id);
		if (this.answered.get(user.id) ?? 0 >= 3) {
			user.sendTo(
				this.room,
				`Your guess '${guess}' is wrong. You have used up all of your guesses. Better luck next time!`
			);
		} else {
			user.sendTo(this.room, `Your guess '${guess}' is wrong. Try again!`);
		}
	}

	change(value: string, user: User, answer = false) {
		if (user.id !== this.host.id) return user.sendTo(this.room, "Only the host can edit the giveaway.");
		if (this.phase !== 'pending') {
			return user.sendTo(this.room, "You cannot change the question or answer once the giveaway has started.");
		}
		if (!answer) {
			this.question = value;
			return user.sendTo(this.room, `The question has been changed to ${value}.`);
		}
		const ans = QuestionGiveaway.sanitizeAnswers(value.split(',').map(val => val.trim()));
		if (!ans.length) {
			return user.sendTo(this.room, "You must specify at least one answer and it must not contain any special characters.");
		}
		this.answers = ans;
		user.sendTo(this.room, `The answer${Chat.plural(ans, "s have", "has")} been changed to ${ans.join(', ')}.`);
	}

	end(force: boolean) {
		if (force) {
			this.clearTimer();
			this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway was forcibly ended.</p>');
			this.room.send("The giveaway was forcibly ended.");
		} else {
			if (!this.winner) {
				this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway was forcibly ended.</p>');
				this.room.send("The giveaway has been forcibly ended as no one has answered the question.");
			} else {
				this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway has ended! Scroll down to see the answer.</p>');
				this.phase = 'ended';
				this.clearTimer();
				this.room.modlog({
					action: 'GIVEAWAY WIN',
					userid: this.winner.id,
					note: `${this.giver.name}'s giveaway for a "${this.prize}" (OT: ${this.ot} TID: ${this.tid})`,
				});
				this.send(this.generateWindow(
					`<p style="text-align:center;font-size:12pt;"><b>${Utils.escapeHTML(this.winner.name)}</b> won the giveaway! Congratulations!</p>` +
					`<p style="text-align:center;">${this.question}<br />Correct answer${Chat.plural(this.answers)}: ${this.answers.join(', ')}</p>`
				));
				this.winner.sendTo(
					this.room,
					`|raw|You have won the giveaway. PM <b>${Utils.escapeHTML(this.giver.name)}</b> to claim your prize!`
				);
				if (this.winner.connected) {
					this.winner.popup(`You have won the giveaway. PM **${this.giver.name}** to claim your prize!`);
				}
				if (this.giver.connected) this.giver.popup(`${this.winner.name} has won your question giveaway!`);
				Giveaway.updateStats(new Set([this.pokemonID]));
			}
		}

		this.destroy();
	}

	static sanitize(str: string) {
		return str.toLowerCase().replace(/[^a-z0-9 .-]+/ig, "").trim();
	}

	static sanitizeAnswers(answers: string[]) {
		return answers.map(
			val => QuestionGiveaway.sanitize(val)
		).filter(
			(val, index, array) => toID(val).length && array.indexOf(val) === index
		);
	}

	checkExcluded(user: User) {
		if (user === this.host) return true;
		if (this.host.ips.includes(user.latestIp) && !Config.noipchecks) return true;
		if (this.host.previousIDs.includes(toID(user))) return true;
		return super.checkExcluded(user);
	}
}

export class LotteryGiveaway extends Giveaway {
	type: string;
	winners: User[];
	maxWinners: number;

	constructor(
		host: User, giver: User, room: Room, ot: string, tid: string, ivs: string[],
		game: Game, prize: PokemonSet, winners: number, ball: string, extraInfo: string
	) {
		super(host, giver, room, ot, tid, ivs, prize, game, ball, extraInfo);

		this.type = 'lottery';
		this.phase = 'pending';

		this.winners = [];

		this.maxWinners = winners || 1;

		this.send(this.generateReminder(false));

		this.timer = setTimeout(() => this.drawLottery(), 1000 * 60 * 2);
	}

	static splitTarget(target: string, sep = '|', context: Chat.CommandContext, forCreate = false) {
		let [giver, ot, tid, game, winners, ivs, ball, extraInfo, ...prize] = target.split(sep).map(param => param.trim());
		if (!(giver && ot && tid && prize?.length)) {
			return context.parse(`/help giveaway`);
		}
		const targetUser = Users.get(giver);
		if (!targetUser?.connected) throw new Chat.ErrorMessage(`User '${giver}' is not online.`);
		if (forCreate && context.user.id !== targetUser.id && !context.user.can('show', null, context.room!)) {
			context.checkCan('warn', null, context.room!);
		}
		if (!!ivs && ivs.split('/').length !== 6) {
			throw new Chat.ErrorMessage(`If you provide IVs, they must be provided for all stats.`);
		}
		if (!game) game = 'BDSP';
		game = gameidToGame[toID(game)] || game as Game;
		if (!game || !['BDSP', 'SwSh'].includes(game)) throw new Chat.ErrorMessage(`The game must be "BDSP" or "SwSh".`);
		if (!ball) ball = 'pokeball';
		if (!toID(ball).endsWith('ball')) ball = toID(ball) + 'ball';
		if (!Dex.items.get(ball).isPokeball) {
			throw new Chat.ErrorMessage(`${Dex.items.get(ball).name} is not a Pok\u00e9 Ball.`);
		}
		tid = toID(tid);
		if (isNaN(parseInt(tid)) || tid.length < 5 || tid.length > 6) throw new Chat.ErrorMessage("Invalid TID");
		if (!targetUser.autoconfirmed) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' needs to be autoconfirmed to give something away.`);
		}
		if (Giveaway.checkBanned(context.room!, targetUser)) {
			throw new Chat.ErrorMessage(`User '${targetUser.name}' is giveaway banned.`);
		}

		let numWinners = 1;
		if (winners) {
			numWinners = parseInt(winners);
			if (isNaN(numWinners) || numWinners < 1 || numWinners > 5) {
				throw new Chat.ErrorMessage("The lottery giveaway can have a minimum of 1 and a maximum of 5 winners.");
			}
		}
		return {
			targetUser, ot, tid, game: game as Game, winners: numWinners,
			ivs: ivs.split('/'), ball, extraInfo, prize: prize.join('|'),
		};
	}

	generateReminder(joined = false) {
		const cmd = (joined ? 'Leave' : 'Join');
		const button = `<button class="button" name="send" value="/giveaway ${toID(cmd)}lottery"><strong>${cmd}</strong></button>`;
		return this.generateWindow(`The lottery drawing will occur in 2 minutes, and with ${Chat.count(this.maxWinners, "winners")}!<br />${button}</p>`);
	}

	display() {
		const joined = this.generateReminder(true);
		const notJoined = this.generateReminder();

		for (const i in this.room.users) {
			const thisUser = this.room.users[i];
			if (this.checkJoined(thisUser)) {
				thisUser.sendTo(
					this.room,
					`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${joined}</div>`
				);
			} else {
				thisUser.sendTo(
					this.room,
					`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${notJoined}</div>`
				);
			}
		}
	}

	addUser(user: User) {
		if (this.phase !== 'pending') return user.sendTo(this.room, "The join phase of the lottery giveaway has ended.");

		if (!user.named) return user.sendTo(this.room, "You need to choose a name before joining a lottery giveaway.");
		if (this.checkJoined(user)) return user.sendTo(this.room, "You have already joined the giveaway.");
		if (Giveaway.checkBanned(this.room, user)) return user.sendTo(this.room, "You are banned from entering giveaways.");
		if (this.checkExcluded(user)) return user.sendTo(this.room, "You are disallowed from entering the giveaway.");

		this.joined.set(user.latestIp, user.id);
		user.sendTo(
			this.room,
			`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${this.generateReminder(true)}</div>`
		);
		user.sendTo(this.room, "You have successfully joined the lottery giveaway.");
	}

	removeUser(user: User) {
		if (this.phase !== 'pending') return user.sendTo(this.room, "The join phase of the lottery giveaway has ended.");
		if (!this.checkJoined(user)) return user.sendTo(this.room, "You have not joined the lottery giveaway.");
		for (const [ip, id] of this.joined) {
			if (ip === user.latestIp && !Config.noipchecks || id === user.id) {
				this.joined.delete(ip);
			}
		}
		user.sendTo(
			this.room,
			`|uhtmlchange|giveaway${this.gaNumber}${this.phase}|<div ${this.getStyle()}>${this.generateReminder(false)}</div>`
		);
		user.sendTo(this.room, "You have left the lottery giveaway.");
	}

	drawLottery() {
		this.clearTimer();

		const userlist = [...this.joined.values()];
		if (userlist.length === 0) {
			this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway was forcibly ended.</p>');
			this.destroy();
			return this.room.send("The giveaway has been forcibly ended as there are no participants.");
		}

		while (this.winners.length < this.maxWinners && userlist.length > 0) {
			const winner = Users.get(userlist.splice(Math.floor(Math.random() * userlist.length), 1)[0]);
			if (!winner) continue;
			this.winners.push(winner);
		}
		this.end();
	}

	end(force = false) {
		if (force) {
			this.clearTimer();
			this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway was forcibly ended.</p>');
			this.room.send("The giveaway was forcibly ended.");
		} else {
			this.changeUhtml(`<p style="text-align:center;font-size:13pt;font-weight:bold;">The giveaway has ended! Scroll down to see the winner${Chat.plural(this.winners)}.</p>`);
			this.phase = 'ended';
			const winnerNames = this.winners.map(winner => winner.name).join(', ');
			this.room.modlog({
				action: 'GIVEAWAY WIN',
				note: `${winnerNames} won ${this.giver.name}'s giveaway for "${this.prize}" (OT: ${this.ot} TID: ${this.tid})`,
			});
			this.send(this.generateWindow(
				`<p style="text-align:center;font-size:10pt;font-weight:bold;">Lottery Draw</p>` +
				`<p style="text-align:center;">${this.joined.size} users joined the giveaway.<br />` +
				`Our lucky winner${Chat.plural(this.winners)}: <b>${Utils.escapeHTML(winnerNames)}</b>!<br />Congratulations!</p>`
			));
			for (const winner of this.winners) {
				winner.sendTo(
					this.room,
					`|raw|You have won the lottery giveaway! PM <b>${this.giver.name}</b> to claim your prize!`
				);
				if (winner.connected) {
					winner.popup(`You have won the lottery giveaway! PM **${this.giver.name}** to claim your prize!`);
				}
			}
			if (this.giver.connected) this.giver.popup(`The following users have won your lottery giveaway:\n${winnerNames}`);
			Giveaway.updateStats(new Set([this.pokemonID]));
		}
		this.destroy();
	}
}

export class GTS extends Rooms.RoomGame {
	gtsNumber: number;
	room: Room;
	giver: User;
	left: number;
	summary: string;
	deposit: string;
	lookfor: string;
	pokemonID: ID;
	sprite: string;
	sent: string[];
	noDeposits: boolean;
	timer: NodeJS.Timer | null;

	constructor(
		room: Room, giver: User, amount: number,
		summary: string, deposit: string, lookfor: string
	) {
		// Always a sub-game so tours etc can be ran while GTS games are running
		super(room, true);
		this.gtsNumber = room.nextGameNumber();
		this.room = room;
		this.giver = giver;
		this.left = amount;
		this.summary = summary;
		this.deposit = GTS.linkify(Utils.escapeHTML(deposit));
		this.lookfor = lookfor;

		this.pokemonID = '';
		this.sprite = '';
		// Deprecated, just typed like this to prevent errors, will rewrite when GTS is planned to be used again
		[this.pokemonID, this.sprite] = Giveaway.getSprite({species: summary} as PokemonSet);

		this.sent = [];
		this.noDeposits = false;

		this.timer = setInterval(() => this.send(this.generateWindow()), 1000 * 60 * 5);
		this.send(this.generateWindow());
	}

	send(content: string) {
		this.room.add(`|uhtml|gtsga${this.gtsNumber}|<div class="broadcast-blue">${content}</div>`);
		this.room.update();
	}

	changeUhtml(content: string) {
		this.room.uhtmlchange(`gtsga${this.gtsNumber}`, `<div class="broadcast-blue">${content}</div>`);
		this.room.update();
	}

	clearTimer() {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	generateWindow() {
		const sentModifier = this.sent.length ? 5 : 0;
		const rightSide = this.noDeposits ?
			`<strong>More Pokémon have been deposited than there are prizes in this giveaway and new deposits will not be accepted.
			If you have already deposited a Pokémon, please be patient, and do not withdraw your Pokémon.</strong>
			` :
			`To participate, deposit <strong>${this.deposit}</strong> into the GTS and look for <strong>${Utils.escapeHTML(this.lookfor)}</strong>`;
		return `<p style="text-align:center;font-size:14pt;font-weight:bold;margin-bottom:2px;">There is a GTS giveaway going on!</p>` +
			`<p style="text-align:center;font-size:10pt;margin-top:0px;">Hosted by: ${Utils.escapeHTML(this.giver.name)} | Left: <b>${this.left}</b></p>` +
			`<table style="margin-left:auto;margin-right:auto;"><tr>` +
			(sentModifier ?
				`<td style="text-align:center;width:10%"><b>Last winners:</b><br/>${this.sent.join('<br/>')}</td>` :
				'') +
			`<td style="text-align:center;width:15%">${this.sprite}</td><td style="text-align:center;width:${40 - sentModifier}%">${Chat.formatText(this.summary, true)}</td>` +
			`<td style="text-align:center;width:${35 - sentModifier}%">${rightSide}</td></tr></table>`;
	}

	updateLeft(num: number) {
		this.left = num;
		if (this.left < 1) return this.end();

		this.changeUhtml(this.generateWindow());
	}

	updateSent(ign: string) {
		this.left--;
		if (this.left < 1) return this.end();

		this.sent.push(Utils.escapeHTML(ign));
		if (this.sent.length > 5) this.sent.shift();

		this.changeUhtml(this.generateWindow());
	}

	stopDeposits() {
		this.noDeposits = true;

		this.room.send(`|html|<p style="text-align:center;font-size:11pt">More Pokémon have been deposited than there are prizes in this giveaway and new deposits will not be accepted. If you have already deposited a Pokémon, please be patient, and do not withdraw your Pokémon.</p>`);
		this.changeUhtml(this.generateWindow());
	}

	end(force = false) {
		if (force) {
			this.clearTimer();
			this.changeUhtml('<p style="text-align:center;font-size:13pt;font-weight:bold;">The GTS giveaway was forcibly ended.</p>');
			this.room.send("The GTS giveaway was forcibly ended.");
		} else {
			this.clearTimer();
			this.changeUhtml(`<p style="text-align:center;font-size:13pt;font-weight:bold;">The GTS giveaway has finished.</p>`);
			this.room.modlog({
				action: 'GTS FINISHED',
				userid: this.giver.id,
				note: `their GTS giveaway for "${this.summary}"`,
			});
			this.send(`<p style="text-align:center;font-size:11pt">The GTS giveaway for a "<strong>${Utils.escapeHTML(this.lookfor)}</strong>" has finished.</p>`);
			Giveaway.updateStats(new Set([this.pokemonID]));
		}
		this.room.subGame = null;
		return this.left;
	}

	// This currently doesn't match some of the edge cases the other pokemon matching function does account for
	// (such as Type: Null). However, this should never be used as a fodder mon anyway,
	// so I don't see a huge need to implement it.
	static linkify(text: string) {
		const parsed = toID(text);

		for (const species of Dex.species.all()) {
			const id = species.id;
			const regexp = new RegExp(`\\b${id}\\b`, 'ig');
			const res = regexp.exec(parsed);
			if (res) {
				const num = String(species.num).padStart(3, '0');
				return `${text.slice(0, res.index)}<a href="http://www.serebii.net/pokedex-sm/location/${num}.shtml">${text.slice(res.index, res.index + res[0].length)}</a>${text.slice(res.index + res[0].length)}`;
			}
		}
		return text;
	}
}

function hasSubmittedGiveaway(user: User) {
	for (const [key, giveaways] of Object.entries(wifiData.submittedGiveaways)) {
		for (const [index, giveaway] of giveaways.entries()) {
			if (user.id === giveaway.targetUserID) {
				return {index, type: key as 'question' | 'lottery'};
			}
		}
	}
	return null;
}

export const handlers: Chat.Handlers = {
	onDisconnect(user) {
		const giveaway = hasSubmittedGiveaway(user);
		if (giveaway) {
			wifiData.submittedGiveaways[giveaway.type].splice(giveaway.index, 1);
			saveData();
		}
	},
};

export const commands: Chat.ChatCommands = {
	gts: {
		new: 'start',
		create: 'start',
		start(target, room, user) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			if (room.getGame(GTS, true)) {
				throw new Chat.ErrorMessage(`There is already a GTS Giveaway going on.`);
			}
			// GTS is currently deprecated until it's no longer behind a paywall
			return this.parse(`/help gts`);
			/*
			const [giver, amountStr, summary, deposit, lookfor] = target.split(target.includes('|') ? '|' : ',').map(
				param => param.trim()
			);
			if (!(giver && amountStr && summary && deposit && lookfor)) {
				return this.errorReply("Invalid arguments specified - /gts start giver | amount | summary | deposit | lookfor");
			}
			const amount = parseInt(amountStr);
			if (!amount || amount < 20 || amount > 100) {
				return this.errorReply("Please enter a valid amount. For a GTS giveaway, you need to give away at least 20 mons, and no more than 100.");
			}
			const targetUser = Users.get(giver);
			if (!targetUser?.connected) return this.errorReply(`User '${giver}' is not online.`);
			this.checkCan('warn', null, room);
			if (!targetUser.autoconfirmed) {
				return this.errorReply(`User '${targetUser.name}' needs to be autoconfirmed to host a giveaway.`);
			}
			if (Giveaway.checkBanned(room, targetUser)) return this.errorReply(`User '${targetUser.name}' is giveaway banned.`);

			room.subGame = new GTS(room, targetUser, amount, summary, deposit, lookfor);

			this.privateModAction(`${user.name} started a GTS giveaway for ${targetUser.name} with ${amount} Pokémon`);
			this.modlog('GTS GIVEAWAY', null, `for ${targetUser.getLastId()} with ${amount} Pokémon`);
			*/
		},
		left(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				throw new Chat.ErrorMessage("Only the host or a staff member can update GTS giveaways.");
			}
			if (!target) {
				this.runBroadcast();
				let output = `The GTS giveaway from ${game.giver} has ${game.left} Pokémon remaining!`;
				if (game.sent.length) output += `Last winners: ${game.sent.join(', ')}`;
				return this.sendReply(output);
			}
			const newamount = parseInt(target);
			if (isNaN(newamount)) return this.errorReply("Please enter a valid amount.");
			if (newamount > game.left) return this.errorReply("The new amount must be lower than the old amount.");
			if (newamount < game.left - 1) {
				this.modlog(`GTS GIVEAWAY`, null, `set from ${game.left} to ${newamount} left`);
			}

			game.updateLeft(newamount);
		},
		sent(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				return this.errorReply("Only the host or a staff member can update GTS giveaways.");
			}

			if (!target || target.length > 12) return this.errorReply("Please enter a valid IGN.");

			game.updateSent(target);
		},
		full(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			const game = this.requireGame(GTS, true);
			if (!user.can('warn', null, room) && user !== game.giver) {
				return this.errorReply("Only the host or a staff member can update GTS giveaways.");
			}
			if (game.noDeposits) return this.errorReply("The GTS giveaway was already set to not accept deposits.");

			game.stopDeposits();
		},
		end(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			const game = this.requireGame(GTS, true);
			this.checkCan('warn', null, room);

			if (target && target.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			const amount = game.end(true);
			if (target) target = `: ${target}`;
			this.modlog('GTS END', null, `with ${amount} left${target}`);
			this.privateModAction(`The giveaway was forcibly ended by ${user.name} with ${amount} left${target}`);
		},
	},
	gtshelp: [
		`GTS giveaways are currently disabled. If you are a Room Owner and would like them to be re-enabled, contact Kris.`,
	],
	ga: 'giveaway',
	giveaway: {
		help() {
			this.run('giveawayhelp');
		},
		view: {
			''(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-default`);
			},
			stored(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-stored`);
			},
			submitted(target, room, user) {
				this.room = room = Rooms.search('wifi') || null;
				if (!room) throw new Chat.ErrorMessage(`The Wi-Fi room doesn't exist on this server.`);
				this.checkCan('warn', null, room);
				this.parse(`/j view-giveaways-submitted`);
			},
		},
		rm: 'remind',
		remind(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			this.runBroadcast();
			if (room.getGame(QuestionGiveaway)) {
				const game = room.getGame(QuestionGiveaway)!;
				if (game.phase !== 'started') {
					throw new Chat.ErrorMessage(`The giveaway has not started yet.`);
				}
				game.send(game.generateQuestion());
			} else if (room.getGame(LotteryGiveaway)) {
				room.getGame(LotteryGiveaway)!.display();
			} else {
				throw new Chat.ErrorMessage(`There is no giveaway going on right now.`);
			}
		},
		leavelotto: 'join',
		leavelottery: 'join',
		leave: 'join',
		joinlotto: 'join',
		joinlottery: 'join',
		join(target, room, user, conn, cmd) {
			room = this.requireRoom('wifi' as RoomID);
			this.checkChat();
			if (user.semilocked) return;
			const giveaway = this.requireGame(LotteryGiveaway);
			if (cmd.includes('join')) {
				giveaway.addUser(user);
			} else {
				giveaway.removeUser(user);
			}
		},
		ban(target, room, user) {
			if (!target) return false;
			room = this.requireRoom('wifi' as RoomID);
			this.checkCan('warn', null, room);

			const {targetUser, rest: reason} = this.requireUser(target, {allowOffline: true});
			if (reason.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			if (Punishments.hasRoomPunishType(room, targetUser.name, 'GIVEAWAYBAN')) {
				return this.errorReply(`User '${targetUser.name}' is already giveawaybanned.`);
			}

			Giveaway.ban(room, targetUser, reason);
			(room.getGame(LotteryGiveaway) || room.getGame(QuestionGiveaway))?.kickUser(targetUser);
			this.modlog('GIVEAWAYBAN', targetUser, reason);
			const reasonMessage = reason ? ` (${reason})` : ``;
			this.privateModAction(`${targetUser.name} was banned from entering giveaways by ${user.name}.${reasonMessage}`);
		},
		unban(target, room, user) {
			if (!target) return false;
			room = this.requireRoom('wifi' as RoomID);
			this.checkCan('warn', null, room);

			const {targetUser} = this.requireUser(target, {allowOffline: true});
			if (!Giveaway.checkBanned(room, targetUser)) {
				return this.errorReply(`User '${targetUser.name}' isn't banned from entering giveaways.`);
			}

			Giveaway.unban(room, targetUser);
			this.privateModAction(`${targetUser.name} was unbanned from entering giveaways by ${user.name}.`);
			this.modlog('GIVEAWAYUNBAN', targetUser, null, {noip: 1, noalts: 1});
		},
		new: 'create',
		start: 'create',
		create: {
			''(target, room, user) {
				room = this.requireRoom('wifi' as RoomID);
				if (!user.can('show', null, room)) this.checkCan('warn', null, room);
				this.parse('/j view-giveaways-create');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				if (room.game) {
					throw new Chat.ErrorMessage(`There is already a room game (${room.game.constructor.name}) going on.`);
				}
				// Syntax: giver|ot|tid|game|question|answer1,answer2,etc|ivs/format/like/this|pokeball|packed set
				const {
					targetUser, ot, tid, game, question, answers, ivs, ball, extraInfo, prize,
				} = QuestionGiveaway.splitTarget(target, '|', this, true);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				room.game = new QuestionGiveaway(user, targetUser, room, ot, tid, game, ivs, set, question, answers, ball, extraInfo);

				this.privateModAction(`${user.name} started a question giveaway for ${targetUser.name}.`);
				this.modlog('QUESTION GIVEAWAY', null, `for ${targetUser.getLastId()}`);
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				if (room.game) throw new Chat.ErrorMessage(`There is already a room game (${room.game.constructor.name}) going on.`);
				// Syntax: giver|ot|tid|game|# of winners|ivs/like/this|pokeball|info|packed set
				const {
					targetUser, ot, tid, game, winners, ivs, ball, prize, extraInfo,
				} = LotteryGiveaway.splitTarget(target, '|', this, true);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				room.game = new LotteryGiveaway(user, targetUser, room, ot, tid, ivs, game, set, winners, ball, extraInfo);

				this.privateModAction(`${user.name} started a lottery giveaway for ${targetUser.name}.`);
				this.modlog('LOTTERY GIVEAWAY', null, `for ${targetUser.getLastId()}`);
			},
		},
		stop: 'end',
		end(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			if (!room.game?.constructor.name.includes('Giveaway')) {
				throw new Chat.ErrorMessage(`There is no giveaway going on at the moment.`);
			}
			const game = room.game as LotteryGiveaway | QuestionGiveaway;
			if (user.id !== game.host.id) this.checkCan('warn', null, room);

			if (target && target.length > 300) {
				return this.errorReply("The reason is too long. It cannot exceed 300 characters.");
			}
			game.end(true);
			this.modlog('GIVEAWAY END', null, target);
			if (target) target = `: ${target}`;
			this.privateModAction(`The giveaway was forcibly ended by ${user.name}${target}`);
		},
		guess(target, room, user) {
			this.parse(`/guess ${target}`);
		},
		changeanswer: 'changequestion',
		changequestion(target, room, user, connection, cmd) {
			room = this.requireRoom('wifi' as RoomID);
			const giveaway = this.requireGame(QuestionGiveaway);
			target = target.trim();
			if (!target) throw new Chat.ErrorMessage("You must include a question or an answer.");
			giveaway.change(target, user, cmd.includes('answer'));
		},
		showanswer: 'viewanswer',
		viewanswer(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			const giveaway = this.requireGame(QuestionGiveaway);
			if (user.id !== giveaway.host.id && user.id !== giveaway.giver.id) return;

			this.sendReply(`The giveaway question is ${giveaway.question}.\nThe answer${Chat.plural(giveaway.answers, 's are', ' is')} ${giveaway.answers.join(', ')}.`);
		},
		save: 'store',
		store: {
			''(target, room, user) {
				room = this.requireRoom('wifi' as RoomID);
				this.checkCan('warn', null, room);
				this.parse('/j view-giveaways-stored-add');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, question, answers, ball, extraInfo, ivs,
				} = QuestionGiveaway.splitTarget(target, '|', this);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!wifiData.storedGiveaways.question) wifiData.storedGiveaways.question = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, question, answers, ivs, ball, extraInfo};
				wifiData.storedGiveaways.question.push(data);
				saveData();

				this.privateModAction(`${user.name} saved a question giveaway for ${targetUser.name}.`);
				this.modlog('QUESTION GIVEAWAY SAVE');
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, winners, ball, extraInfo, ivs,
				} = LotteryGiveaway.splitTarget(target, '|', this);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!wifiData.storedGiveaways.lottery) wifiData.storedGiveaways.lottery = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, winners, ball, extraInfo, ivs};
				wifiData.storedGiveaways.lottery.push(data);
				saveData();

				this.privateModAction(`${user.name} saved a question giveaway for ${targetUser.name}.`);
				this.modlog('LOTTERY GIVEAWAY SAVE');
			},
		},
		submit: {
			''(target, room, user) {
				room = this.requireRoom('wifi' as RoomID);
				this.checkChat();
				this.parse('/j view-giveaways-submitted-add');
			},
			question(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, question, answers, ball, extraInfo, ivs,
				} = QuestionGiveaway.splitTarget(target, '|', this);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!wifiData.submittedGiveaways.question) wifiData.submittedGiveaways.question = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, question, answers, ball, extraInfo, ivs};
				wifiData.submittedGiveaways.question.push(data);
				saveData();

				this.sendReply(`You have submitted a question giveaway for ${set.species}. If you log out or go offline, the giveaway won't go through.`);
				const message = `|tempnotify|pendingapprovals|Pending question giveaway request!` +
					`|${user.name} has requested to start a question giveaway for ${set.species}.|new question giveaway request`;
				room.sendRankedUsers(message, '%');
				room.sendMods(
					Utils.html`|uhtml|giveaway-request-${user.id}|<div class="infobox">${user.name} wants to start a question giveaway for ${set.species}<br>` +
					`<button class="button" name="send" value="/j view-giveaways-submitted">View pending giveaways</button></div>`
				);
			},
			lottery(target, room, user) {
				room = this.room = Rooms.search('wifi') || null;
				if (!room) {
					throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
				}
				const {
					targetUser, ot, tid, game, prize, winners, ball, extraInfo, ivs,
				} = LotteryGiveaway.splitTarget(target, '|', this);
				const set = Teams.import(prize)?.[0];
				if (!set) throw new Chat.ErrorMessage(`Please submit the prize in the form of a PS set importable.`);

				if (!wifiData.submittedGiveaways.lottery) wifiData.submittedGiveaways.lottery = [];
				const data = {targetUserID: targetUser.id, ot, tid, game, prize: set, winners, ball, extraInfo, ivs};
				wifiData.submittedGiveaways.lottery.push(data);
				saveData();

				this.sendReply(`You have submitted a lottery giveaway for ${set.species}. If you log out or go offline, the giveaway won't go through.`);
				const message = `|tempnotify|pendingapprovals|Pending lottery giveaway request!` +
					`|${user.name} has requested to start a lottery giveaway for ${set.species}.|new lottery giveaway request`;
				room.sendRankedUsers(message, '%');
				room.sendMods(
					Utils.html`|uhtml|giveaway-request-${user.id}|<div class="infobox">${user.name} wants to start a lottery giveaway for ${set.species}<br>` +
					`<button class="button" name="send" value="/j view-giveaways-submitted">View pending giveaways</button></div>`
				);
			},
		},
		approve(target, room, user) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			const targetUser = Users.get(target);
			if (!targetUser?.connected) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${targetUser?.name || toID(target)} is offline, so their giveaway can't be run.`);
			}
			const hasGiveaway = hasSubmittedGiveaway(targetUser);
			if (!hasGiveaway) {
				this.refreshPage('giveaways-submitted');
				throw new Chat.ErrorMessage(`${targetUser?.name || toID(target)} doesn't have any submitted giveaways.`);
			}
			const giveaway = wifiData.submittedGiveaways[hasGiveaway.type][hasGiveaway.index];
			if (hasGiveaway.type === 'question') {
				const data = giveaway as QuestionGiveawayData;
				this.parse(`/giveaway create question ${data.targetUserID}|${data.ot}|${data.tid}|${data.game}|${data.question}|${data.answers.join(',')}|${data.ivs.join('/')}|${data.ball}|${data.extraInfo}|${Teams.pack([data.prize])!}`);
			} else {
				const data = giveaway as LotteryGiveawayData;
				this.parse(`/giveaway create lottery ${data.targetUserID}|${data.ot}|${data.tid}|${data.game}|${data.winners}|${data.ivs.join('/')}|${data.ball}|${data.extraInfo}|${Teams.pack([data.prize])!}`);
			}
			wifiData.submittedGiveaways[hasGiveaway.type].splice(hasGiveaway.index, 1);
			saveData();
			this.refreshPage(`giveaways-submitted`);
			targetUser.send(`${user.name} has approved your ${hasGiveaway.type} giveaway!`);
			this.privateModAction(`${user.name} approved a ${hasGiveaway.type} giveaway by ${targetUser.name}.`);
			this.modlog(`GIVEAWAY APPROVE ${hasGiveaway.type.toUpperCase()}`, targetUser, null, {noalts: true, noip: true});
		},
		deny: 'delete',
		delete(target, room, user, connection, cmd) {
			room = this.room = Rooms.search('wifi') || null;
			if (!room) {
				throw new Chat.ErrorMessage(`This command must be used in the Wi-Fi room.`);
			}
			if (!target) return this.parse('/help giveaway');
			const del = cmd === 'delete';
			this.refreshPage(del ? `giveaways-stored` : 'giveaways-submitted');
			if (del) {
				const [type, index] = target.split(',');
				if (!(type && index) || !['question', 'lottery'].includes(toID(type)) || isNaN(parseInt(index))) {
					return this.parse(`/help giveaway`);
				}
				const typedType = toID(type) as 'question' | 'lottery';
				const giveaway = wifiData.storedGiveaways[typedType][parseInt(index)];
				wifiData.storedGiveaways[typedType].splice(parseInt(index), 1);
				saveData();
				this.privateModAction(`${user.name} deleted a ${typedType} giveaway by ${giveaway.targetUserID}.`);
				this.modlog(`GIVEAWAY DELETE ${typedType.toUpperCase()}`);
			} else {
				if (!target) return this.parse(`/help giveaway`);
				const {targetUser, rest: reason} = this.splitUser(target);
				if (!targetUser?.connected) {
					throw new Chat.ErrorMessage(`${targetUser?.name || toID(target)} is offline, so their giveaway can't be run.`);
				}
				const hasGiveaway = hasSubmittedGiveaway(targetUser);
				if (!hasGiveaway) {
					this.refreshPage('giveaways-submitted');
					throw new Chat.ErrorMessage(`${targetUser?.name || toID(target)} doesn't have any submitted giveaways.`);
				}
				wifiData.submittedGiveaways[hasGiveaway.type].splice(hasGiveaway.index, 1);
				saveData();
				targetUser?.send(`Staff have rejected your giveaway${reason ? `: ${reason}` : '.'}`);
				this.privateModAction(`${user.name} denied a ${hasGiveaway.type} giveaway by ${targetUser.name}.`);
				this.modlog(`GIVEAWAY DENY ${hasGiveaway.type.toUpperCase()}`, targetUser, reason || null, {noalts: true, noip: true});
			}
		},
		count(target, room, user) {
			room = this.requireRoom('wifi' as RoomID);
			if (!Dex.species.get(target).exists) {
				throw new Chat.ErrorMessage(`No Pok\u00e9mon entered. Proper syntax: /giveaway count pokemon`);
			}
			target = Dex.species.get(target).id;
			this.runBroadcast();

			const count = wifiData.stats[target];

			if (!count) return this.sendReplyBox("This Pokémon has never been given away.");
			const recent = count.filter(val => val + RECENT_THRESHOLD > Date.now()).length;

			this.sendReplyBox(`This Pokémon has been given away ${Chat.count(count, "times")}, a total of ${Chat.count(recent, "times")} in the past month.`);
		},
	},
	giveawayhelp(target, room, user) {
		room = this.requireRoom('wifi' as RoomID);
		this.runBroadcast();
		const buf = [];
		if (user.can('show', null, room)) {
			buf.push(
				`<details><summary>Staff commands</summary>` +
				`<code>/giveaway create - Pulls up a page to create a giveaway. Requires: + % @ # &`
			);
			buf.push(
				`<code>/giveaway create question Giver | OT | TID | Game | Question | Answer 1, Answer 2, Answer 3 | Pok&eacute; Ball | Extra Info | Prize</code>` +
				` - Start a new question giveaway (voices can only host their own). Requires: + % @ # &`,
			);
			buf.push(
				`<code>/giveaway create lottery Giver | OT | TID | Game | # of Winners | Pok&eacute; Ball | Extra Info | Prize</code>` +
				` - Start a new lottery giveaway (voices can only host their own). Requires: + % @ # &`,
			);
			buf.push(`<code>/giveaway changequestion/changeanswer</code> - Changes the question/answer of a question giveaway. Requires: Being giveaway host`);
			buf.push(`<code>/giveaway viewanswer</code> - Shows the answer of a question giveaway. Requires: Being giveaway host/giver`);
			buf.push(`<code>/giveaway ban [user], [reason]</code> - Temporarily bans [user] from entering giveaways. Requires: % @ # &`);
			buf.push(`<code>/giveaway end</code> - Forcibly ends the current giveaway. Requires: % @ # &`);
			buf.push(`<code>/giveaway count [pokemon]</code> - Shows how frequently a certain Pok&eacute;mon has been given away.</details>`);
		}
		// Giveaway stuff
		buf.push(
			`<details><summary>Giveaway participation commands</summary>` +
			`<code>/guess [target]</code> - Guesses an answer for a question giveaway.`
		);
		buf.push(`<code>/giveaway submit</code> - Allows users to submit giveaways. They must remain online after submitting for it to go through.`);
		buf.push(`<code>/giveaway viewanswer</code> - Guesses an answer for a question giveaway. Requires: Giveaway host/giver`);
		buf.push(`<code>/giveaway remind</code> - Shows the details of the current giveaway.`);
		buf.push(`<code>/giveaway join/leave</code> - Joins/leaves a lottery giveaway.</details>`);
		this.sendReplyBox(buf.join('<br />'));
	},
};

function makePageHeader(pageid?: string) {
	const titles: {[k: string]: string} = {
		create: `Create`,
		stored: `View Stored`,
		'stored-add': 'Store',
		submitted: `View Submitted`,
		'submitted-add': `Submit`,
	};
	const icons: Record<keyof typeof titles, string> = {
		create: `<i class="fa fa-sticky-note"></i>`,
		stored: `<i class="fa fa-paste"></i>`,
		'stored-add': `<i class="fa fa-paste"></i>`,
		submitted: `<i class="fa fa-inbox"></i>`,
		'submitted-add': `<i class="fa fa-inbox"></i>`,
	};
	let buf = `<button class="button" style="float:right" name="send" value="/j view-giveaways${pageid?.trim() ? `-${pageid.trim()}` : ''}"><i class="fa fa-refresh"></i> Refresh</button>`;
	buf += `<h1>Wi-Fi Giveaways</h1>`;
	const urls = [];
	for (const i in titles) {
		const title = titles[i];
		const icon = icons[i];
		if (pageid === i) {
			urls.push(`${icon} <strong>${title}</strong>`);
		} else {
			urls.push(`${icon} <a href="/view-giveaways-${i}" target="replace">${title}</a>`);
		}
	}
	buf += urls.join(` / `);
	buf += `<hr />`;
	return `<center>${buf}</center>`;
}

function formatFakeButton(url: string, text: string) {
	return `<a class="button" style="text-decoration:inherit" target="replace" href="${url}">${text}</a>`;
}

function generatePokeballDropdown() {
	const pokeballs = Dex.items.all().filter(item => item.isPokeball).sort((a, b) => a.num - b.num);
	let buf = `<label for="ball">Pok&eacute; Ball type: </label><select name="ball"><option value="">Please select a Pok&eacute; Ball</option>`;
	for (const pokeball of pokeballs) {
		buf += `<option value="${pokeball.id}">${Utils.escapeHTML(pokeball.name)}</option>`;
	}
	buf += `</select>`;
	return buf;
}

export const pages: Chat.PageTable = {
	giveaways: {
		''() {
			this.title = `[Giveaways]`;
			if (!Rooms.search('wifi')) return `<h1>There is no Wi-Fi room on this server.</h1>`;
			this.checkCan('warn', null, Rooms.search('wifi')!);
			return `<div class="pad">${makePageHeader()}</div>`;
		},
		create(args, user) {
			this.title = `[Create Giveaways]`;
			if (!Rooms.search('wifi')) return `<h1>There is no Wi-Fi room on this server.</h1>`;
			if (!user.can('show', null, Rooms.get('wifi')!)) this.checkCan('warn', null, Rooms.search('wifi')!);
			const [type] = args;
			let buf = `<div class="pad">`;
			buf += makePageHeader('create');
			if (!type || !['lottery', 'question'].includes(type)) {
				buf += `<center><h2>Pick a Giveaway type</h2>`;
				buf += formatFakeButton(`/view-giveaways-create-lottery`, `<i class="fa fa-random"></i> Lottery`);
				buf += ` | `;
				buf += formatFakeButton(`/view-giveaways-create-question`, `<i class="fa fa-question"></i> Question`);
				buf += `</center>`;
			} else {
				switch (type) {
				case 'lottery':
					buf += `<h2>Make a Lottery Giveaway</h2>`;
					buf += `<form data-submitsend="/giveaway create lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}">`;
					buf += `<label for="giver">Giver: </label><input name="giver" /><br /><br />`;
					buf += `<label for="ot">OT: </label><input name="ot" /><br /><br />`;
					buf += `<label for="tid">TID: </label><input name="tid" /><br /><br />`;
					buf += `Game: <div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
					buf += `<br /><label for="winners">Number of winners: </label><input name="winners" /><br /><br />`;
					buf += generatePokeballDropdown();
					buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
					buf += `<br /><br /><label for="set">Prize:</label><br /><textarea style="width:70%;height:300px" placeholder="Paste set importable" name="set"></textarea>`;
					buf += `<br /><br /><label for="info">Additional information (if any):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
					buf += `<br /><br /><button class="button" type="submit">Create Lottery Giveaway</button>`;
					buf += `</form>`;
					break;
				case 'question':
					buf += `<h2>Make a Question Giveaway</h2>`;
					buf += `<form data-submitsend="/giveaway create question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}">`;
					buf += `<label for="giver">Giver:</label><input name="giver" /><br /><br />`;
					buf += `<label for="ot">OT:</label><input name="ot" /><br /><br />`;
					buf += `<label for="tid">TID:</label><input name="tid" /><br /><br />`;
					buf += `Game:<div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
					buf += `<br /><label for="question">Question:</label><input name="question" /><br /><br />`;
					buf += `<label for="answers">Answers (separated by comma):</label><input name="answers" /><br /><br />`;
					buf += generatePokeballDropdown();
					buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
					buf += `<br /><br /><label for="set"></label><textarea style="width:70%;height:300px" placeholder="Paste set importable here" name="set"></textarea>`;
					buf += `<br /><br /><label for="info">Additional information (if any):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
					buf += `<br /><br /><button class="button" type="submit">Create Question Giveaway</button>`;
					buf += `</form>`;
					break;
				}
			}
			buf += `</div>`;
			return buf;
		},
		stored(args, user) {
			this.title = `[Stored Giveaways]`;
			if (!Rooms.search('wifi')) return `<h1>There is no Wi-Fi room on this server.</h1>`;
			this.checkCan('warn', null, Rooms.search('wifi')!);
			let buf = `<div class="pad">${makePageHeader(args[0] === 'add' ? 'stored-add' : 'stored')}`;
			const [add, type] = args;
			const giveaways = [
				...((wifiData.storedGiveaways || {}).lottery || []),
				...((wifiData.storedGiveaways || {}).question || []),
			];
			const adding = add === 'add';
			if (!giveaways.length && !adding) return `${buf}<h2>There are no giveaways stored</h2></div>`;
			if (!adding) {
				buf += `<h2>Stored Giveaways</h2>`;
				for (let giveaway of giveaways) {
					if (wifiData.storedGiveaways.lottery.includes(giveaway as any)) {
						giveaway = giveaway as LotteryGiveawayData;
						buf += `<div class="infobox"><h3 style="text-align:center">Lottery</h3><hr />`;
						buf += Utils.html`<strong>Game:</strong> ${gameName[giveaway.game]}, <strong>Giver:</strong> ${giveaway.targetUserID}, <strong>OT:</strong> ${giveaway.ot}, <strong>TID:</strong> ${giveaway.tid}, <strong># of winners:</strong> ${giveaway.winners}`;
						buf += `<br /><strong>Pok&eacute; Ball:</strong> <psicon item="${giveaway.ball}" />`;
						buf += `<details><summary><psicon pokemon="${giveaway.prize.species}" /> Prize</summary>`;
						buf += `${Chat.formatText(Giveaway.convertIVs(giveaway.prize, giveaway.ivs), true)}</details>`;
						if (giveaway.extraInfo?.trim()) {
							buf += `<hr /><details><summary>Extra Info</summary>${Chat.formatText(giveaway.extraInfo.trim(), true)}</details>`;
						}
						buf += `<hr />`;
						buf += `<button class="button" name="send" value="/giveaway delete lottery,${wifiData.storedGiveaways.lottery.indexOf(giveaway)}"><i class="fa fa-trash"></i> Delete giveaway</button>`;
						if (!Users.get(giveaway.targetUserID)?.connected) {
							buf += `<button title="The giver is offline" disabled class="button disabled" style="float:right">Create giveaway</button>`;
						} else {
							buf += `<button class="button" style="float:right" name="send" value="/giveaway create lottery ${giveaway.targetUserID}|${giveaway.ot}|${giveaway.tid}|${giveaway.game}|${giveaway.winners}|${giveaway.ivs.join('/')}|${giveaway.ball}|${giveaway.extraInfo.trim().replace(/\n/g, '<br />')}|${Teams.pack([giveaway.prize])}">Create giveaway</button>`;
						}
						buf += `</div>`;
					} else {
						giveaway = giveaway as QuestionGiveawayData;
						buf += `<div class="infobox"><h3 style="text-align:center">Lottery</h3><hr />`;
						buf += Utils.html`<strong>Game:</strong> ${gameName[giveaway.game]}, <strong>Giver:</strong> ${giveaway.targetUserID}, <strong>OT:</strong> ${giveaway.ot}, <strong>TID:</strong> ${giveaway.tid}`;
						buf += Utils.html`<br /><strong>Question:</strong> ${giveaway.question}`;
						buf += `<br /><strong>Answer${Chat.plural(giveaway.answers.length, "s")}:</strong> ${giveaway.answers.join(', ')}`;
						buf += `<br /><strong>Pok&eacute; Ball:</strong> <psicon item="${giveaway.ball}" />`;
						buf += `<details><summary><psicon pokemon="${giveaway.prize.species}" /> Prize</summary>`;
						buf += `${Chat.formatText(Giveaway.convertIVs(giveaway.prize, giveaway.ivs), true)}</details>`;
						if (giveaway.extraInfo?.trim()) {
							buf += `<hr /><details><summary>Extra Info</summary>${Chat.formatText(giveaway.extraInfo.trim(), true)}</details>`;
						}
						buf += `<hr />`;
						buf += `<button class="button" name="send" value="/giveaway delete question,${wifiData.storedGiveaways.question.indexOf(giveaway)}"><i class="fa fa-trash"></i> Delete giveaway</button>`;
						if (!Users.get(giveaway.targetUserID)?.connected) {
							buf += `<button title="The giver is offline" disabled class="button disabled" style="float:right">Create giveaway</button>`;
						} else {
							buf += `<button class="button" style="float:right" name="send" value="/giveaway create question ${giveaway.targetUserID}|${giveaway.ot}|${giveaway.tid}|${giveaway.game}|${giveaway.question}|${giveaway.answers.join(',')}|${giveaway.ivs.join('/')}|${giveaway.ball}|${giveaway.extraInfo.trim().replace(/\n/g, '<br />')}|${Teams.pack([giveaway.prize])}">Create giveaway</button>`;
						}
						buf += `</div>`;
					}
				}
			} else {
				buf += `<h2>Store a Giveaway</h2>`;
				if (!type || !['question', 'lottery'].includes(type)) {
					buf += `<center><h3>Pick a giveaway type</h3>`;
					buf += formatFakeButton(`/view-giveaways-stored-add-lottery`, `<i class="fa fa-random"></i> Lottery`);
					buf += ` | `;
					buf += formatFakeButton(`/view-giveaways-stored-add-question`, `<i class="fa fa-question"></i> Question`);
					buf += `</center>`;
				} else {
					switch (type) {
					case 'lottery':
						buf += `<form data-submitsend="/giveaway store lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}">`;
						buf += `<label for="giver">Giver: </label><input name="giver" /><br /><br />`;
						buf += `<label for="ot">OT: </label><input name="ot" /><br /><br />`;
						buf += `<label for="tid">TID: </label><input name="tid" /><br /><br />`;
						buf += `Game: <div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
						buf += `<br /><label for="winners">Number of winners: </label><input name="winners" /><br /><br />`;
						buf += generatePokeballDropdown();
						buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
						buf += `<br /><br /><label for="set">Prize:</label><br /><textarea style="width:70%;height:300px" placeholder="Paste set importable" name="set"></textarea>`;
						buf += `<br /><br /><label for="info">Additional information (if any):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
						buf += `<br /><br /><button class="button" type="submit">Store Lottery Giveaway</button>`;
						buf += `</form>`;
						break;
					case 'question':
						buf += `<h2>Make a Question Giveaway</h2>`;
						buf += `<form data-submitsend="/giveaway store question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}">`;
						buf += `<label for="giver">Giver:</label><input name="giver" /><br /><br />`;
						buf += `<label for="ot">OT:</label><input name="ot" /><br /><br />`;
						buf += `<label for="tid">TID:</label><input name="tid" /><br /><br />`;
						buf += `Game:<div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
						buf += `<br /><label for="question">Question:</label><input name="question" /><br /><br />`;
						buf += `<label for="answers">Answers (separated by comma):</label><input name="answers" /><br /><br />`;
						buf += generatePokeballDropdown();
						buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
						buf += `<br /><br /><label for="set"></label><textarea style="width:70%;height:300px" placeholder="Paste set importable here" name="set"></textarea>`;
						buf += `<br /><br /><label for="info">Additional information (if any):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
						buf += `<br /><br /><button class="button" type="submit">Store Question Giveaway</button>`;
						buf += `</form>`;
						break;
					}
				}
			}
			buf += `</div>`;
			return buf;
		},
		submitted(args, user) {
			this.title = `[Submitted Giveaways]`;
			if (!Rooms.search('wifi')) return `<h1>There is no Wi-Fi room on this server.</h1>`;
			const [add, type] = args;
			const adding = add === 'add';
			if (!adding) this.checkCan('warn', null, Rooms.get('wifi')!);
			let buf = `<div class="pad">${makePageHeader(args[0] === 'add' ? 'submitted-add' : 'submitted')}`;
			const giveaways = [
				...((wifiData.submittedGiveaways || {}).lottery || []),
				...((wifiData.submittedGiveaways || {}).question || []),
			];
			if (!giveaways.length && !adding) return `${buf}<h2>There are no submitted giveaways.</h2></div>`;
			if (!adding) {
				buf += `<h2>Submitted Giveaways</h2>`;
				for (let giveaway of giveaways) {
					if (wifiData.submittedGiveaways.lottery.includes(giveaway as any)) {
						giveaway = giveaway as LotteryGiveawayData;
						buf += `<div class="infobox"><h3 style="text-align:center">Lottery</h3><hr />`;
						buf += Utils.html`<strong>Game:</strong> ${gameName[giveaway.game]}, <strong>Giver:</strong> ${giveaway.targetUserID}, <strong>OT:</strong> ${giveaway.ot}, <strong>TID:</strong> ${giveaway.tid}, <strong># of winners:</strong> ${giveaway.winners}`;
						buf += `<br /><strong>Pok&eacute; Ball:</strong> <psicon item="${giveaway.ball}" />`;
						buf += `<details><summary><psicon pokemon="${giveaway.prize.species}" /> Prize</summary>`;
						buf += `${Chat.formatText(Giveaway.convertIVs(giveaway.prize, giveaway.ivs), true)}</details>`;
						if (giveaway.extraInfo?.trim()) {
							buf += `<hr /><details><summary>Extra Info</summary>${Chat.formatText(giveaway.extraInfo.trim(), true)}</details>`;
						}
						buf += `<hr />`;
						if (!Users.get(giveaway.targetUserID)?.connected) {
							buf += `<button title="The giver is offline" disabled class="button disabled"><i class="fa fa-times-circle"></i> Deny giveaway</button>`;
							buf += `<button title="The giver is offline" disabled class="button disabled" style="float:right">Create giveaway</button>`;
						} else {
							buf += `<button class="button" name="send" value="/giveaway deny ${giveaway.targetUserID}}"><i class="fa fa-times-circle"></i> Deny giveaway</button>`;
							buf += `<button class="button" style="float:right" name="send" value="/giveaway approve ${giveaway.targetUserID}">Create giveaway</button>`;
						}
						buf += `</div>`;
					} else {
						giveaway = giveaway as QuestionGiveawayData;
						buf += `<div class="infobox"><h3 style="text-align:center">Question</h3><hr />`;
						buf += Utils.html`<strong>Game:</strong> ${gameName[giveaway.game]}, <strong>Giver:</strong> ${giveaway.targetUserID}, <strong>OT:</strong> ${giveaway.ot}, <strong>TID:</strong> ${giveaway.tid}`;
						buf += Utils.html`<br /><strong>Question:</strong> ${giveaway.question}`;
						buf += `<br /><strong>Answer${Chat.plural(giveaway.answers.length, "s")}:</strong> ${giveaway.answers.join(', ')}`;
						buf += `<br /><strong>Pok&eacute; Ball:</strong> <psicon item="${giveaway.ball}" />`;
						buf += `<details><summary><psicon pokemon="${giveaway.prize.species}" /> Prize</summary>`;
						buf += `${Chat.formatText(Giveaway.convertIVs(giveaway.prize, giveaway.ivs), true)}</details>`;
						if (giveaway.extraInfo?.trim()) {
							buf += `<hr /><details><summary>Extra Info</summary>${Chat.formatText(giveaway.extraInfo.trim(), true)}</details>`;
						}
						buf += `<hr />`;
						if (!Users.get(giveaway.targetUserID)?.connected) {
							buf += `<button title="The giver is offline" disabled class="button disabled"><i class="fa fa-times-circle"></i> Deny giveaway</button>`;
							buf += `<button title="The giver is offline" disabled class="button disabled" style="float:right">Create giveaway</button>`;
						} else {
							buf += `<button class="button" name="send" value="/giveaway deny ${giveaway.targetUserID}}"><i class="fa fa-times-circle"></i> Deny giveaway</button>`;
							buf += `<button class="button" style="float:right" name="send" value="/giveaway approve ${giveaway.targetUserID}">Create giveaway</button>`;
						}
						buf += `</div>`;
					}
				}
			} else {
				buf += `<h2>Submit a Giveaway</h2>`;
				if (!type || !['question', 'lottery'].includes(type)) {
					buf += `<center><h3>Pick a giveaway type</h3>`;
					buf += formatFakeButton(`/view-giveaways-submitted-add-lottery`, `<i class="fa fa-random"></i> Lottery`);
					buf += ` | `;
					buf += formatFakeButton(`/view-giveaways-submitted-add-question`, `<i class="fa fa-question"></i> Question`);
					buf += `</center>`;
				} else {
					switch (type) {
					case 'lottery':
						buf += `<form data-submitsend="/giveaway submit lottery {giver}|{ot}|{tid}|{game}|{winners}|{ivs}|{ball}|{info}|{set}">`;
						buf += `<label for="giver">Giver: </label><input name="giver" /><br /><br />`;
						buf += `<label for="ot">OT: </label><input name="ot" /><br /><br />`;
						buf += `<label for="tid">TID: </label><input name="tid" /><br /><br />`;
						buf += `Game: <div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
						buf += `<br /><label for="winners">Number of winners: </label><input name="winners" /><br /><br />`;
						buf += generatePokeballDropdown();
						buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
						buf += `<br /><br /><label for="set">Prize:</label><br /><textarea style="width:70%;height:300px" placeholder="Paste set importable" name="set"></textarea>`;
						buf += `<br /><br /><label for="info">Additional information (provide a link of proof here):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
						buf += `<br /><br /><button class="button" type="submit">Submit Lottery Giveaway</button>`;
						buf += `</form>`;
						break;
					case 'question':
						buf += `<form data-submitsend="/giveaway submit question {giver}|{ot}|{tid}|{game}|{question}|{answers}|{ivs}|{ball}|{info}|{set}">`;
						buf += `<label for="giver">Giver:</label><input name="giver" /><br /><br />`;
						buf += `<label for="ot">OT:</label><input name="ot" /><br /><br />`;
						buf += `<label for="tid">TID:</label><input name="tid" /><br /><br />`;
						buf += `Game:<div><input type="radio" id="bdsp" name="game" value="bdsp" checked /><label for="bdsp">BDSP</label><input type="radio" id="swsh" name="game" value="swsh" /><label for="swsh">SwSh</label></div>`;
						buf += `<br /><label for="question">Question:</label><input name="question" /><br /><br />`;
						buf += `<label for="answers">Answers (separated by comma):</label><input name="answers" /><br /><br />`;
						buf += generatePokeballDropdown();
						buf += `<br /><br /><label for="ivs">IVs (Formatted like "1/30/31/X/HT/30"): </label><input name="ivs" />`;
						buf += `<br /><br /><label for="set"></label><textarea style="width:70%;height:300px" placeholder="Paste set importable here" name="set"></textarea>`;
						buf += `<br /><br /><label for="info">Additional information (provide a link of proof here):</label><br /><textarea style="width:50%;height:100px" placeholder="Add any additional info" name="info"></textarea>`;
						buf += `<br /><br /><button class="button" type="submit">Submit Question Giveaway</button>`;
						buf += `</form>`;
						break;
					}
				}
			}
			buf += `</div>`;
			return buf;
		},
	},
};

Chat.multiLinePattern.register(`/giveaway (create|new|start|store|submit|save) (question|lottery) `);
