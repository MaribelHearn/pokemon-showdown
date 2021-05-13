/**
 * Rock Paper Scissors plugin by Mia
 * @author mia-pi-git
 */
import {Utils} from '../../lib';

const MAX_ROUNDS = 200;
const TIMEOUT = 10 * 1000;
const ICONS: {[k: string]: string} = {
	Rock: `<i class="fa fa-hand-rock-o"></i>`,
	Paper: '<i class="fa fa-hand-paper-o"></i>',
	Scissors: '<i class="fa fa-hand-scissors-o"></i>',
};

const MATCHUPS = new Map<string, string>([
	['Scissors', 'Paper'],
	['Rock', 'Scissors'],
	['Paper', 'Rock'],
]);

function toChoice(str: string) {
	const id = toID(str);
	return id.charAt(0).toUpperCase() + id.slice(1);
}

export const challenges: Map<string, string> = Chat.oldPlugins['rock-paper-scissors']?.challenges || new Map();

export class RPSPlayer extends Rooms.RoomGamePlayer {
	choice = '';
	prevChoice = '';
	prevWinner = false;
	score = 0;
}

export class RPSGame extends Rooms.RoomGame {
	currentRound: number;
	declare playerTable: {[k: string]: RPSPlayer};
	readonly checkChat = true;
	roundTimer: NodeJS.Timeout | null = null;
	players: RPSPlayer[];
	consecutiveTimeouts = 0;
	constructor(room: Room) {
		super(room);
		this.currentRound = 0;
		this.title = 'Rock Paper Scissors';
		this.gameid = 'rockpaperscissors' as ID;
		this.players = [];

		this.room.update();
		this.room.send(`|controlshtml|<center>Waiting for another player to join....</center>`);
		this.sendField();
	}
	onConnect(user: User, connection: Connection) {
		this.room.sendUser(connection, this.getField());
	}
	static getWinner(p1: RPSPlayer, p2: RPSPlayer) {
		const p1Choice = p1.choice;
		const p2Choice = p2.choice;
		if (!p1Choice && p2Choice) return p2;
		if (!p2Choice && p1Choice) return p1;
		if (MATCHUPS.get(p1Choice) === p2Choice) return p1;
		if (MATCHUPS.get(p2Choice) === p1Choice) return p2;
		return null;
	}
	sendControls(player: RPSPlayer) {
		if (!this.roundTimer) {
			player.sendRoom(`|controlshtml|<center>The game is paused.</center>`);
			return;
		}
		if (player.choice) {
			player.sendRoom(`|controlshtml|<center>You have selected <strong>${player.choice}</strong>. Now to wait for your foe.</center>`);
			return;
		}
		let buf = `|controlshtml|<center><strong>Make your choice, quick! You have ${Chat.toDurationString(TIMEOUT)}!</strong><br />`;
		for (const choice of ['Rock', 'Paper', 'Scissors']) {
			buf += `<button class="button" name="send" value="/choose ${choice}" style="width:6em"><span style="font-size:24px">${ICONS[choice]}</span><br />${choice || '&nbsp;'}</button> `;
		}
		buf += `<br /><br /><button class="button" name="send" value="/rps end">End game</button></center>`;
		player.sendRoom(buf);
	}
	getField() {
		if (this.players.length < 2) {
			return `|fieldhtml|<center><h2>Waiting to start the game...</h2></center>`;
		}

		const [p1, p2] = this.players;

		function renderBigChoice(choice: string, isWinner?: boolean) {
			return `<div style="width:180px;font-size:120px;background:${isWinner ? '#595' : '#888'};color:white;border-radius:20px;padding-bottom:5px;margin:0 auto">${ICONS[choice] || '&nbsp;'}<br /><small style="font-size:40px"> <small style="font-size:32px;display:block">${choice || '&nbsp;'}</small></div>`;
		}

		function renderCurrentChoice(exists?: boolean) {
			return `<div style="width:100px;font-size:60px;background:#888;color:white;border-radius:15px;padding-bottom:5px;margin:20px auto 0">${exists ? '<i class="fa fa-check"></i>' : '&nbsp;'}</div>`;
		}

		const buf = `|fieldhtml|<table style="width:100%;text-align:center;font-size:18px"><tr>` +
			Utils.html`<td><div style="padding:8px 0"><strong>${p1.name}</strong> (${p1.score})</div>` +
			`${renderBigChoice(p1.prevChoice, p1.prevWinner)}` +
			`${renderCurrentChoice(!!p1.choice)}</td>` +
			`<td><em style="font-size:24px">vs</em></td>` +
			Utils.html`<td><div style="padding:8px 0"><strong>${p2.name}</strong> (${p2.score})</div>` +
			`${renderBigChoice(p2.prevChoice, p2.prevWinner)}` +
			`${renderCurrentChoice(!!p2.choice)}</td>` +
			`</tr></table>`;

		return buf;
	}
	sendField() {
		this.room.send(this.getField());
	}
	end() {
		const [p1, p2] = this.players;
		if (p1.score === p2.score) {
			this.message(`**Tie** at score ${p1.score}!`);
		} else {
			const [winner, loser] = p1.score > p2.score ? [p1, p2] : [p2, p1];
			this.message(`**${winner.name}** wins with score ${winner.score} to ${loser.score}!`);
		}
		this.destroy();
	}
	clearChoices() {
		const [p1, p2] = this.players;
		p1.choice = "";
		p2.choice = "";
	}
	getPlayers() {
		return Object.keys(this.playerTable).map(item => this.playerTable[item]);
	}
	runMatch() {
		const [p1, p2] = this.players;
		const winner = RPSGame.getWinner(p1, p2);
		if (!winner) { // tie
			if (!p1.choice) {
				this.message(`${p1.name} and ${p2.name} both **timed out**.`);
			} else {
				this.message(`${p1.name} and ${p2.name} **tie** with ${p1.choice}.`);
			}
		} else {
			const loser = p1 === winner ? p2 : p1;
			if (!loser.choice) {
				this.message(`**${winner.name}**'s ${winner.choice} wins; ${loser.name} timed out.`);
			} else {
				this.message(`**${winner.name}**'s ${winner.choice} beats ${loser.name}'s ${loser.choice}.`);
			}
			winner.score++;
		}

		if (!winner && !p1.choice) {
			this.consecutiveTimeouts++;
		} else {
			this.consecutiveTimeouts = 0;
		}

		if (this.currentRound >= MAX_ROUNDS) {
			this.message(`The game is ending automatically at ${this.currentRound} rounds.`);
			return this.end();
		}

		for (const player of this.players) {
			player.prevChoice = player.choice;
			player.prevWinner = false;
			player.choice = '';
		}
		if (winner) winner.prevWinner = true;

		this.sendField();
		this.nextRound();
	}
	smallMessage(message: string) {
		this.room.add(`|-message|${message}`).update();
	}
	message(message: string) {
		this.room.add(`|message|${message}`).update();
	}
	start() {
		if (this.players.length < 2) {
			throw new Chat.ErrorMessage(`There are not enough players to start. Use /rps start to start when all players are ready.`);
		}
		const [p1, p2] = this.players;
		this.room.add(
			`|raw|<h2><span style="font-weight: normal">Rock Paper Scissors:</span> ${p1.name} vs ${p2.name}!</h2>\n` +
			`|message|Game started!`
		).update();
		this.nextRound();
	}
	getPlayer(user: User) {
		const player = this.playerTable[user.id];
		if (!player) throw new Chat.ErrorMessage(`You are not a player in this game.`);
		return player;
	}
	pause(user: User) {
		if (!this.roundTimer) throw new Chat.ErrorMessage(`The game is not running, and cannot be paused.`);

		const player = this.getPlayer(user);
		clearTimeout(this.roundTimer);
		this.roundTimer = null;
		for (const curPlayer of this.players) this.sendControls(curPlayer);
		this.message(`The game was paused by ${player.name}.`);
	}
	unpause(user: User) {
		if (this.roundTimer) throw new Chat.ErrorMessage(`The game is not paused.`);

		const player = this.getPlayer(user);
		this.message(`The game was unpaused by ${player.name}.`);
		this.nextRound();
	}
	nextRound() {
		this.currentRound++;
		this.sendField();
		if (this.consecutiveTimeouts >= 20) {
			// forcefully end if no one's progressed in 20 turns
			return this.end();
		}
		this.room.add(`|html|<h2>Round ${this.currentRound}</h2>`).update();
		this.roundTimer = setTimeout(() => {
			this.runMatch();
		}, TIMEOUT);
		for (const player of this.players) this.sendControls(player);
	}
	destroy() {
		if (this.roundTimer) {
			clearTimeout(this.roundTimer);
			this.roundTimer = null;
		}
		this.room.pokeExpireTimer();
		this.ended = true;
		this.room.add(`|-message|The game has ended.`); // for the benefit of those in the room
		this.room.log.log = [];
		for (const player of this.players) {
			player.sendRoom(`|controlshtml|<div class="pad">The game has ended.</div>`);
			player.destroy();
		}
	}
	choose(user: User, option: string) {
		option = toChoice(option);
		const player = this.getPlayer(user);
		if (!MATCHUPS.get(option)) {
			throw new Chat.ErrorMessage(`Invalid choice: ${option}.`);
		}
		if (player.choice) throw new Chat.ErrorMessage("You have already made your choice!");
		player.choice = option;
		this.smallMessage(`${user.name} made a choice.`);
		this.sendControls(player);
		if (this.players.filter(item => item.choice).length > 1) {
			clearTimeout(this.roundTimer!);
			this.roundTimer = null;
			return this.runMatch();
		}
		this.sendField();
		return true;
	}
	leaveGame(user: User) {
		const player = this.getPlayer(user);
		player.sendRoom(`You left the game.`);
		delete this.playerTable[user.id];
		this.end();
	}
	addPlayer(user: User) {
		if (this.playerTable[user.id]) throw new Chat.ErrorMessage(`You are already a player in this game.`);
		this.playerTable[user.id] = new RPSPlayer(user, this);
		this.players.push(this.playerTable[user.id]);
		this.room.auth.set(user.id, Users.PLAYER_SYMBOL);
		return this.playerTable[user.id];
	}
}

function findExisting(user1: string, user2: string) {
	return Rooms.get(`rps-${user1}-${user2}`) || Rooms.get(`rps-${user2}-${user1}`);
}

export const commands: Chat.ChatCommands = {
	rps: 'rockpaperscissors',
	rockpaperscissors: {
		challenge: 'create',
		chall: 'create',
		chal: 'create',
		create(target, room, user) {
			target = target.trim();
			if (!target && this.pmTarget) {
				target = this.pmTarget.id;
			}
			const {targetUser, targetUsername} = this.splitUser(target);
			if (!targetUser) {
				return this.errorReply(`User ${targetUsername} not found. Either specify a username or use this command in PMs.`);
			}
			if (targetUser === user) return this.errorReply(`You cannot challenge yourself.`);
			if (targetUser.settings.blockChallenges && !user.can('bypassblocks', targetUser)) {
				Chat.maybeNotifyBlocked('challenge', targetUser, user);
				return this.errorReply(`This user is currently blocking challenges.`);
			}
			const existingRoom = findExisting(user.id, targetUser.id);
			if (existingRoom?.game && !existingRoom.game.ended) {
				return this.errorReply(`You already have a Rock Paper Scissors game against ${targetUser.name}.`);
			}
			if (!this.pmTarget) this.pmTarget = targetUser;
			challenges.set(targetUser.id, user.id);
			this.sendChatMessage(
				`/raw ${user.name} challenged you to Rock Paper Scissors!`
			);
			targetUser.send(
				`|pm|${user.getIdentity()}|${targetUser.getIdentity()}|` +
				`/raw <button class="button" name="send" value="/rps accept"><strong>Accept</strong></button></div>`
			);
		},

		accept(target, room, user) {
			const id = challenges.get(user.id);
			if (!id) return this.errorReply(`You have no Rock Paper Scissors request pending.`);
			const targetUser = Users.get(id);
			if (!targetUser) return this.errorReply(`The user who challenged you to Rock Paper Scissors is offline.`);
			const existingRoom = findExisting(user.id, targetUser.id);
			const roomid = `rps-${targetUser.id}-${user.id}`;
			const gameRoom = existingRoom || Rooms.createGameRoom(
				roomid as RoomID, `[RPS] ${user.name} vs ${targetUser.name}`, {
					modchat: '+',
					isPrivate: true,
				}
			);

			const game = new RPSGame(gameRoom);
			gameRoom.game = game;

			game.addPlayer(targetUser);
			game.addPlayer(user);
			user.joinRoom(gameRoom.roomid);
			targetUser.joinRoom(gameRoom.roomid);
			(gameRoom.game as RPSGame).start();
		},

		deny(target, room, user) {
			const request = challenges.get(user.id);
			if (!request) return this.errorReply(`You have no Rock Paper Scissors challenge pending.`);
			const [sender] = request;
			Users.get(sender)?.popup(`${user.name} denied your Rock Paper Scissors challenge.`);
			challenges.delete(user.id);
		},

		end(target, room, user) {
			const game = this.requireGame(RPSGame);
			if (!game.playerTable[user.id]) {
				return this.errorReply(`You are not a player, and so cannot end the game.`);
			}
			game.end();
		},

		choose(target, room, user) {
			this.parse(`/choose ${target}`);
		},

		leave(target, room, user) {
			this.parse(`/leavegame`);
		},

		pause(target, room, user) {
			const game = this.requireGame(RPSGame);
			game.pause(user);
		},

		resume(target, room, user) {
			const game = this.requireGame(RPSGame);
			game.unpause(user);
		},

		'': 'help',
		help() {
			this.runBroadcast();
			const strings = [
				`/rockpaperscissors OR /rps<br />`,
				`/rps challenge [user] - Challenges a user to a game of Rock Paper Scissors`,
				`(in PM) /rps challenge - Challenges a user to a game of Rock Paper Scissors`,
				`/rps leave - Leave the game.`,
				`/rps start - Start the Rock Paper Scissors game.`,
				`/rps end - End the Rock Paper Scissors game`,
				`/rps pause - Pauses the game, if it's in progress.`,
				`/rps resume - Resumes the game, if it's paused.`,
			];
			return this.sendReplyBox(strings.join('<br />'));
		},
	},
};
