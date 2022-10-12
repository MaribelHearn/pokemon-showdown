/*
 * PO bridge
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { FS } from "../../lib/fs";
import { BasicRoom } from "../rooms";
const config = require("../../config/config");
const PO_BASE64 = '<img src="data:image/png;base64,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">';
//const INTERVAL = 100; // ms
//const LOG_PO = FS(`../FC/data/polog.txt`);
let poPlayers = {}, poTimestamp;

function formatUsername(string) {
    return string.replace(/ /g, '').toLowerCase();
}

function escapeHTML(string) {
    return string.replace(/&/g, "&amp;").replace(/\>/g, "&gt;").replace(/</g, "&lt;");
}

function sendPOLog(message) {
    let lobby = Rooms.rooms.get('lobby') as BasicRoom;
    poTimestamp = '[' + Chat.toTimestamp(new Date()).split(' ')[1] + ']';
    message = message.split('|');
    //let timestamp = message[0];
    let type = message[1];

    if (type == 'c') {
        let color = message[2];
        let name = message[3];
        message = message[4];
        let symbol = '';
        if (name[0] == '+') {
            symbol = '+';
            name = name.slice(1);
        }
        lobby.addRaw('<div class="chat chatmessage-po"><small>' + poTimestamp + ' </small><strong style="color:' + color +
        ';">' + PO_BASE64 + (symbol == '+' ? '<small>+</small>' : '') + '<span class="username" data-name="' + formatUsername(name) +
        '">' + name + '</span>:</strong> <em>' + escapeHTML(message));
    } else if (type == 'j' || type == 'l') { // join or leave
        let name = message[3].trim();
        let symbol = '', level = 0;
        if (name[0] == '+') {
            symbol = '+';
            level = name[1];
            name = name.slice(2);
        }
        if (type == 'j') {
            poPlayers[name] = {};
            poPlayers[name].color = message[2];
            poPlayers[name].auth = (level > 6 ? 0 : level);
        } else {
            delete poPlayers[name];
        }
        lobby.addRaw('<div class="message"><small style="color: #555555;">' + PO_BASE64 + symbol + name + ' ' + (type == 'j' ? ' joined' : ' left'));
    }
    if (type == 'c' || type == 'j' || type == 'l') {
        lobby.update();
    }
}

/*function readPOLog() {
    if (LOG_PO.existsSync()) {
        let messages = LOG_PO.readSync().split("\\n"), i;
        for (i in messages) {
            sendPOLog(messages[i]);
        }
        LOG_PO.unlinkIfExistsSync();
    }
}*/

function auth(level: number) {
    return ({0: "User", 1: "Channel Mod", 2: "Channel Admin", 3: "Channel Owner", 4: "Moderator", 5: "Administrator", 6: "Owner"}[level]);
}

exports.commands = {
    poonline: function () {
        if (Object.keys(poPlayers).length === 0) {
            this.sendReply("There are currently no players on the Pokemon Online channel.");
            return;
        }
        var message = "<b>Players on Pokemon Online</b><table style='border:1px solid black'><tr><th>Auth</th><th>Name</th></tr>", i;
        for (i in poPlayers) {
            message += "<tr><td>" + auth(poPlayers[i].auth) + "</td><th style='color:" + (poPlayers[i].color) + "'>" + i + "</th></tr>";
        }
        this.sendReplyBox(message + "</table>");
    },
    poonlinehelp: ["/poonline - Shows a table of users that are currently on the Pokemon Online channel."]
};

const port = 8508;
 
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
	if(req.headers["user-agent"] !== config.useragent) {
		return;
	}

	let message = '';

    req.on("data", chunk => {
        message += chunk.toString();
    });

    req.on("end", () => {
		sendPOLog(message);
        res.end("OK");
    });
});

server.listen(port, () => {
	console.log(`Listening for PO messages on port ${port}`);
});
