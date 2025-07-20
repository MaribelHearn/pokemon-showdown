/*
 * Fun commands
 */

import {Utils} from '../../lib/utils';
let cooldown: any = {};
const CRIT_RATE = 0.0625;
const DEFAULT_ACC = 95;
const DELIMITER = '*';
const CMD_COLOR = '#008000';
const AUTH = ['+', '%', '@', '*', '#', '&'];
const EFFECTS = ['', '', '', 'It\'s super effective!', 'It\'s not very effective...', 'It had no effect!'];
const BIGTEXTS: any = {
    combobreaker: {
        title: 'Combobreaker',
        text: 'C-C-C-COMBOBREAKER!!!',
    },
    cbreak: {
        title: 'Combobreaker',
        text: 'C-C-C-COMBOBREAKER!!!',
    },
    wtfboom: {
        title: 'Wtfboom',
        text: 'WHAT THE FU-BOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO' +
        'OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOM',
        size: 24,
        color: '#808080',
    }
};
const TYPE_COLORS: any = {
    Bug: '#A8B820',
    Dark: '#705848',
    Dragon: '#7038F8',
    Electric: '#F8D030',
    Fairy: '#EE99AC',
    Fighting: '#C03028',
    Fire: '#F08030',
    Flying: '#A890F0',
    Ghost: '#705898',
    Grass: '#78C850',
    Ground: '#E0C068',
    Ice: '#98D8D8',
    Normal: '#A8A878',
    Poison: '#A040A0',
    Psychic: '#F85888',
    Rock: '#B8A038',
    Steel: '#B8B8D0',
    Water: '#6890F0',
    '???': '#68A090',
};
const STATUS = {
    paralyze: "<img src='data:image/png;base64,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' alt='Paralyze icon' width=23 height=23>",
    burn: "<img src='data:image/png;base64,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' alt='Burn " +
    "icon' width=23 height=23>",
    freeze: "<img src='data:image/png;base64,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' a" +
    "lt='Freeze icon' width=23 height=23>",
    poison: "<img src='data:image/png;base64,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" +
    "AAABJRU5ErkJggg==' alt='Poison icon' width=23 height=23>",
    sleep: "<img src='data:image/png;base64,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' alt='Sleep icon' width=23 heigh" +
    "t=23>",
};

Object.defineProperty(Array.prototype, "contains", {
    configurable: true,
    enumerable: false,
    value: function (value: number) {
        return this.indexOf(value) > -1;
    }
});

function random(obj: any) {
    if (Array.isArray(obj)) {
        return obj[Math.floor(Math.random() * obj.length)];
    }

    return Object.keys(obj)[Math.floor(Math.random() * Object.keys(obj).length)];
}

function timeStamp() {
    return `[${Chat.toTimestamp(new Date()).split(' ')[1]}]`;
}

function rand(min: number, max?: number) {
    if (!max) {
        max = min;
        min = 0;
    }

    return Math.floor(Math.random() * (max - min)) + min;
}

function randCeil(min: number, max?: number | null) {
    if (!max) {
        max = min;
        min = 0;
    }

    return Math.ceil(Math.random() * (max - min)) + min;
}

function duoColor(text: string, colorX: string, colorY: string) {
    let array = []
    let toggle = false;

    for (let i = 0; i < text.length; i++) {
        array.push(`<span style="color: ${toggle ? colorY : colorX};">${text.charAt(i)}</span>`);
        toggle = !toggle;
    }

    return array.join('');
}

function desu(text: string) {
    var firstColor = ["#008000", "#FF0000"][rand(2)];
    return duoColor(text, firstColor, (firstColor == "#008000" ? "#FF0000" : "#008000"));
}

function cap(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function tick() {
    for (const i in cooldown) {
        cooldown[i]--;

        if (cooldown[i] === 0) {
            delete cooldown[i];
        }
    }
}

function hasUsedMsg(room: Room | null, user: User, cmd: string) {
    room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b>${user.name} has used the <span style="color: ${CMD_COLOR};">${cap(cmd)}</span> command.</b>`);
    if (!AUTH.includes(user.tempGroup)) {
        cooldown[user.id] = 5;
    }
}

function checkCooldown(user: User | null = null) {
    if (user && cooldown.hasOwnProperty(user.id)) {
        let grammar = (cooldown[user.id] === 1 ? 'second' : 'seconds');
        throw new Chat.ErrorMessage(`You are on cooldown. Please wait ${cooldown[user.id]} more ${grammar}.`);
    }

    return true;
}

export const commands: Chat.ChatCommands  = {
    funcommands: 'funhelp',
    funhelp(target, room, user) {
		room = this.requireRoom();
		this.checkBroadcast(false, '!htmlbox');
		if (this.broadcastMessage) this.checkCan('declare', null, room);

		if (!this.runBroadcast(false, '!htmlbox')) return;

		const strings = [
			[
				`<strong>Anyone</strong> can use:`,
                `/attack <em>username</em>*<em>move</em>: use a move on a user, or random user and move if none given`,
                `/attract <em>username</em>: attract a user, or a random user if none given`,
                `/bigtext <em>text</em>*<em>title</em>*<em>size</em>*<em>color</em>` +
                ` - send a big text command, defaults used if nothing given`,
                `/bulbaderp : bulbaderp`,
                `/burn <em>username</em>: burn a user, or a random user if none given`,
                `/combobreaker OR /cbreak : C-C-C-COMBOBREAKER!!!`,
                `/confuse <em>username</em>: confuse a user, or a random user if none given`,
                `/darp : darp`,
                `/dennis : DDDDDDDEEEEEEENNNNNNNNNNNNNNIIIIIIISSSSSSS!!!`,
                `/derp : derp`,
                `/durp : durp`,
                `/ferp : ferp`,
                `/herp : herp`,
                `/freeze <em>username</em>: freeze a user, or a random user if none given`,
                `/merp : merp`,
                `/nuke <em>username</em>: nuke a user, or a random user if none given`,
                `/paralyze OR /paralyse <em>username</em>: paralyze a user, or a random user if none given`,
                `/poison <em>username</em>: poison a user, or a random user if none given`,
                `/random : send random garbage text`,
                `/randomsupport : ship a random pair of users`,
                `/russia <em>verb</em>*<em>noun</em>: send a Russian Reversal joke using verb and noun, or random if none given`,
                `/sleep <em>username</em>: put a user to sleep, or a random user if none given`,
                `/wtfboom : WHAT THE FU-`,
			],
		];

		this.sendReplyBox(
			strings.map(par => par.map(string => this.tr(string)).join('<br />')).join('<br /><br />')
		);
	},

    attack(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const effect = random(EFFECTS);
        let targetname: any;
        let move : any;

        if (!target) {
            targetname = room?.users[random(room?.users)].name;
            move = Dex.moves.get(random(Dex.data.Moves));
        } else {
            const args = target.split(DELIMITER);
            targetname = args[0];

            if (args[1]) {
                move = Dex.moves.get(args[1]) ? Dex.moves.get(args[1]) : {'name': args[1], 'accuracy': DEFAULT_ACC, 'critRatio': 1, 'type': '???'};
            } else {
                move = Dex.moves.get(random(Object.keys(Dex.data.Moves)));
            }
        }

        const hit = rand(100) < (typeof move.accuracy == 'boolean' ? DEFAULT_ACC : move.accuracy);
        let message = (hit ? '!' : '... but the attack missed!');

        if (hit) {
            if (Math.random() < CRIT_RATE * move.critRatio && effect != 'It had no effect!') {
                message += ' <span style="color: #8B0000;">A critical hit!</span>';
            }
            message += ' ' + effect;
        }

        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b>${user.name} used <span style="color: ${TYPE_COLORS[move.type]};">${move.name}</span> on ${Utils.escapeHTML(targetname)}${message}</b></div>`);
    },
    attackhelp: [
        `/attack - Use a random move on a random user in this room.`,
		`/attack [username] - Use a random move on [username].`,
		`/attack [username]*[move] - Use [move] on [username].`,
    ],

    attract(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const HEART = '<span style="font-size: 20px;">♥</span>';
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b style="color: #FF00FF;">${HEART + Utils.escapeHTML(targetname)} has been attracted by ${user.name}!${HEART}</b></div>`);
    },
    attracthelp: [
        `/attract - Attract a random user in this room.`,
		`/attract [username] - Attract [username].`,
    ],

    combobreaker: 'bigtext',
    cbreak: 'bigtext',
    wtfboom: 'bigtext',
    bigtext(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);

        const data = BIGTEXTS[cmd];
        let size = (data && data.size ? data.size : 32);
        let title = (data && data.title ? data.title : 'Bigtext');
        let text = (data && data.text ? data.text : 'Some text.');
        let color = (data && data.color ? data.color : '#000000');

        if (target) {
            const args = target.split(DELIMITER);
            title = args[0];
            if (args[1]) text = args[1];
            if (args[2]) size = args[2];
            if (args[3]) color = args[3];
        }

        hasUsedMsg(room, user, title);
        room?.addRaw(`<span style="font-size: ${size}px; color: ${color};">${text}</span>`);
    },
    bigtexthelp: [
        `/bigtext [title]*[text]*[size]*[color] - Send a big text command, defaults used if nothing given.`,
    ],

    bulbaderp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/bulbasaur.png" alt="Bulbasaur" width=96 height=96><b>${desu('Bulbaderp!')}</b>`);
    },
    bulbaderphelp: [
        `/bulbaderp - Bulbaderp.`,
    ],

    burn(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b style="color: #FF0000;">${STATUS.burn + Utils.escapeHTML(targetname)} has been burned by ${user.name}!${STATUS.burn}</b></div>`);
    },
    burnhelp: [
        `/burn - Burn a random user in this room.`,
		`/burn [username] - Burn [username].`,
    ],

    confuse(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const AT = '<span style="font-size: 20px;">@</span>';
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b style="color: #8A2BE2;">${AT + Utils.escapeHTML(targetname)} has been confused by ${user.name}!${AT}</b></div>`);
    },
    confusehelp: [
        `/confuse - Confuse a random user in this room.`,
		`/confuse [username] - Confuse [username].`,
    ],

    magidarp: 'darp',
    darp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/magikarp.png" alt="Magikarp" width=96 height=96><b>${desu('Harpadarp!')}</b>`);
    },
    darphelp: [
        `/derp - Darp.`,
    ],

    dennis(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<b>DDDDDDDEEEEEEENNNNNNNNNNNNNNIIIIIIISSSSSSS!!!</b><img src="https://${Config.routes.client}/sprites/trainers/ghetsis${Math.random() > 0.5 ? '-gen5bw' : ''}.png" alt="Dennis" width=80 height=80>`);
    },
    dennishelp: [
        `/dennis - DDDDDDDEEEEEEENNNNNNNNNNNNNNIIIIIIISSSSSSS!!!`,
    ],

    derpfisk: 'derp',
    derp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/stunfisk.png" alt="Stunfisk" width=96 height=96><b>${desu('Herpaderp!')}</b>`);
    },
    derphelp: [
        `/derp - Derp.`,
    ],

    dividebyzero(target, room: Room | null, user: User, connection, cmd: string) {
        const name = Utils.escapeHTML(user.name);
        const number = rand(1338);
        room?.add(`|c|${user.getIdentity(room)}|${number} / 0 = ...`);
        room?.addRaw(`${name} divided by zero! OH SHI-`);
        room?.addRaw(`${name} got killed in the explosion.`);

        if (room != null) {
            user.leaveRoom(room);
        }
        
    },
    dividebyzerohelp: [
        `/dividebyzero - you divide a number by zero. You have been warned...`
    ],

    feedurp: 'durp',
    durp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/feebas.png" alt="Feebas" width=96 height=96><b>${desu('Hurpadurp!')}</b>`);
    },
    durphelp: [
        `/durp - Durp.`,
    ],

    biferp: 'ferp',
    bibaferp: 'ferp',
    ferp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        const pokemon = (Math.random() > 0.5 ? Dex.species.get('bidoof') : Dex.species.get('bibarel'));
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/${pokemon.id}.png" alt="${pokemon.name}" width=96 height=96><b>${desu('Ferpaderp!')}</b>`);
    },
    ferphelp: [
        `/ferp - Ferp.`,
    ],

    flyaway(target, room: Room | null, user: User, connection, cmd: string) {
        const name = Utils.escapeHTML(user.name);
        room?.addRaw(`${name} flew away!`);

        if (room != null) {
            user.leaveRoom(room);
        }
        
    },
    flyawayhelp: [
        `/flyaway - you fly away from the room, leaving it in the process.`
    ],

    freeze(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b style="color: #87CEEB;">${STATUS.freeze + Utils.escapeHTML(targetname)} has been frozen by ${user.name}!${STATUS.freeze}</b></div>`);
    },
    freezehelp: [
        `/freeze - Freeze a random user in this room.`,
		`/freeze [username] - Freeze [username].`,
    ],

    herpdier: 'herp',
    herp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/herdier.png" ` +
        `alt="Herdier" width=96 height=96><b>${desu('Herpaderp!')}</b>`);
    },
    herphelp: [
        `/herp - Herp.`,
    ],

    merpsparce: 'merp',
    merp(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        checkCooldown(user);
        hasUsedMsg(room, user, cmd);
        room?.addRaw(`<img src="https://${Config.routes.client}/sprites/gen5/dunsparce.png" ` +
        `alt="Dunsparce" width=96 height=96><b>${desu('Merpaderp!')}</b>`);
    },
    merphelp: [
        `/merp - Merp.`,
    ],

    nuke(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const NUKE = '<span style="font-size: 20px;">☢</span>';
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        const text = `${Utils.escapeHTML(targetname)} has been nuked by ${user.name}!`;
        const message = duoColor(text, '#800080', '#FF0000');
        room?.addRaw(`<div class="chat"><small>${timeStamp()} </small><b><span style="color: #FF0000;">${NUKE}</span>${message}<span style="color: ${text.length % 2 === 0 ? '#800080' : '#FF0000'};">${NUKE}</span></b></div>`);
    },
    nukehelp: [
        `/nuke - Nuke a random user in this room.`,
		`/nuke [username] - Nuke [username].`,
    ],

    paralyse: 'paralyze',
    paralyze(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw('<div class="chat"><small>' + timeStamp() + ' </small><b style="color: #FFA500;">' + STATUS.paralyze + Utils.escapeHTML(targetname) + ' has been ' + cmd + 'd by ' + user.name + '!' + STATUS.paralyze + '</b></div>');
    },
    paralyzehelp: [
        `/paralyze OR /paralyse - Paralyze a random user in this room.`,
		`/paralyze OR /paralyse [username] - Paralyze [username].`,
    ],

    poison(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw('<div class="chat"><small>' + timeStamp() + ' </small><b style="color: #800080;">' + STATUS.poison + Utils.escapeHTML(targetname) + ' has been poisoned by ' + user.name + '!' + STATUS.poison + '</b></div>');
    },
    poisonhelp: [
        `/poison - Poison a random user in this room.`,
		`/poison [username] - Poison [username].`,
    ],

    random(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const RANDOM_TEXT = '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
        const MAX_WORD_LENGTH = 5;
        const MAX_WORDS = 10;
        var words = randCeil(MAX_WORDS), wordlengths = [], message = "", i, j;
        for (i = 0; i < words; i++) {
            wordlengths.push(rand(MAX_WORD_LENGTH));
            for (j = 0; j < wordlengths[j]; j++) {
                message += RANDOM_TEXT.charAt(rand(RANDOM_TEXT.length));
            }
            message += ' ';
        }
        room?.add(`|c|${user.getIdentity(room)}|${Utils.escapeHTML(message)}`);
    },
    randomhelp: [
        `/random - Send random garbage text.`,
    ],

    randomsupport(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        var name1 = room?.users[random(Object.keys(room?.users))].name,
            name2 = room?.users[random(Object.keys(room?.users))].name;
		room?.addRaw(`<div class="chat chatmessage-${user.id} mine"><small>${timeStamp()} ` +
        `</small><strong style="color:#6f58e6;">•</strong> <em><small>&amp;</small>` +
        `<span class="username" data-roomgroup="${Utils.escapeHTML(user.tempGroup)}" ` +
        `data-name="${user.name}">${user.name}</span><i> supports ${name1} x ${name2}</i></em> (random)</div>`);
    },
    randomsupporthelp: [
        `/randomsupport - Ship a random pair of users in this room.`,
    ],

    russia(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const RUSSIA_VERBS = ['drive', 'can always find'];
        const RUSSIA_NOUNS = ['a car', 'a party'];
        var random = rand(RUSSIA_VERBS.length), verb, russiaverb, args, noun, russianoun;
        if (!target) {
            verb = RUSSIA_VERBS[random];
            noun = RUSSIA_NOUNS[random];
        } else {
            args = target.split(DELIMITER);
            !args[0] ? verb = RUSSIA_VERBS[random] : verb = Utils.escapeHTML(args[0]);
            !args[1] ? noun = RUSSIA_NOUNS[random] : noun = Utils.escapeHTML(args[1]);
        }
        russiaverb = verb;
        if (verb.indexOf(' ') != -1) {
            russiaverb = verb.slice(verb.lastIndexOf(' '));
        }
        russianoun = noun;
        if (noun.substring(0, 2) == 'a ') {
            russianoun = noun.slice(2);
        } else if (noun.substring(0, 4) == 'the ') {
            russianoun = noun.slice(4);
        }
        room?.addRaw('<div class="chat"><small>' + timeStamp() + ' </small><b>In America, you ' + verb + ' ' + noun + '. In Soviet Russia, ' + russianoun + ' ' + russiaverb + ' YOU!!</b><small> - ' + user.name + '</small>');
    },
    russiahelp: [
        `/russia - Send a Russian Reversal joke.`,
		`/russia [verb]*[noun] - Send a Russian Reversal joke using [verb] and [noun].`,
    ],

    see(target, room: Room | null, user: User, connection, cmd: string) {
        const name = Utils.escapeHTML(user.name);

        if (!target) {
            target = "Dennis";
        }

        room?.addRaw(`${name} saw ${target} behind them and left the room!`);

        if (room != null) {
            user.leaveRoom(room);
        }
        
    },
    seehelp: [
        `/see - you see Dennis behind you, which scares you into leaving the room.`,
        `/see [someone] - you are so afraid of [someone] that you leave the room in fear.`,
    ],

    selfkick(target, room: Room | null, user: User, connection, cmd: string) {
        const name = Utils.escapeHTML(user.name);
        room?.addRaw(`${name} has kicked themselves from the server!`);

        if (room != null) {
            user.leaveRoom(room);
        }
        
    },
    selfkickhelp: [
        `/selfkick - kicks yourself from the room.`
    ],

    selfpunch(target, room: Room | null, user: User, connection, cmd: string) {
        const name = Utils.escapeHTML(user.name);
        room?.addRaw(`${name} has punched themselves from the server!`);

        if (room != null) {
            user.leaveRoom(room);
        }
        
    },
    selfpunchhelp: [
        `/selfpunch - punches yourself from the room.`
    ],

    sleep(target, room: Room | null, user: User, connection, cmd: string) {
        this.checkChat();
        const targetname: any = (target ? target : room?.users[random(Object.keys(room?.users))].name);
        room?.addRaw('<div class="chat"><small>' + timeStamp() + ' </small><b>' + STATUS.sleep + Utils.escapeHTML(targetname) + ' has been put to sleep by ' + user.name + '!' + STATUS.sleep + '</b></div>');
    },
    sleephelp: [
        `/sleep - Put a random user in this room to sleep.`,
		`/sleep [username] - Put [username] to sleep.`,
    ],
};

setInterval(tick, 1000);
