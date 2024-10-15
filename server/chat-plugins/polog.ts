/*
 * PO bridge
 */

/*import { createServer, IncomingMessage, ServerResponse } from "http";
import { FS } from "../../lib/fs";
import { BasicRoom } from "../rooms";
const config = require("../../config/config");*/
//const INTERVAL = 100; // ms
//const LOG_PO = FS(`../FC/data/polog.txt`);

/*

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
    /*poonline: function () {
        if (Object.keys(poPlayers).length === 0) {
            this.sendReply("There are currently no players on the Pokemon Online channel.");
            return;
        }

        let message = "<b>Players on Pokemon Online</b><table style='border:1px solid black'><tr><th>Auth</th><th>Name</th></tr>";

        for (const i in poPlayers) {
            message += `<tr><td>${auth(poPlayers[i].auth)}</td><th style='color:${(poPlayers[i].color)}'>${i}</th></tr>`;
        }

        this.sendReplyBox(message + "</table>");
    },
    poonlinehelp: ["/poonline - Shows a table of users that are currently on the Pokemon Online channel."]*/
};

/*const port = 8508;
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
	if (req.headers["user-agent"] !== config.useragent) {
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
});*/