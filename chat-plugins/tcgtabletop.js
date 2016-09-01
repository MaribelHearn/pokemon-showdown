/**
* TCG & Tabletop: Yugioh wiki plugin
* This is a command that allows users to search the yugioh wiki for cards. It will display the closest match with a given query, or a separate message if there isn't anything found.
* By bumbadadabum with help from ascriptmaster, codelegend and the PS development team.
*/

'use strict';

const http = require('http');

function wikiaSearch(subdomain, query) {
	return new Promise(function (resolve, reject) {
		http.get(`http://${subdomain}.wikia.com/api/v1/Search/List/?query=${encodeURIComponent(query)}&limit=1`, res => {
			let buffer = '';
			res.setEncoding('utf8');
			res.on('data', data => {
				buffer += data;
			});
			res.on('error', err => {
				reject(err);
			});
			res.on('end', () => {
				let result;
				try {
					result = JSON.parse(buffer);
				} catch (e) {
					return reject(e);
				}
				if (!result) return reject(new Error("Malformed data"));
				if (result.exception) return reject(new Error(Tools.getString(result.exception.message) || "Not found"));
				if (!Array.isArray(result.items) || !result.items[0] || typeof result.items[0] !== 'object') return reject(new Error("Malformed data"));

				return resolve(result.items[0]);
			});
		});
	});
}
function getCardDetails(subdomain, id) {
	return new Promise(function (resolve, reject) {
		http.get(`http://${subdomain}.wikia.com/api/v1/Articles/Details?ids=${encodeURIComponent(id)}&abstract=0&width=80&height=115`, res => {
			let buffer = '';
			res.setEncoding('utf8');
			res.on('data', data => {
				buffer += data;
			});
			res.on('error', err => {
				reject(err);
			});
			res.on('end', () => {
				let result;
				try {
					result = JSON.parse(buffer);
				} catch (e) {
					return reject(e);
				}
				if (!result) return reject(new Error("Malformed data"));
				if (result.exception) return reject(new Error(Tools.getString(result.exception.message) || "Not found"));
				if (typeof result.items !== 'object' || !result.items[id] || typeof result.items[id] !== 'object') return reject(new Error("Malformed data"));

				return resolve(result.items[id]);
			});
		});
	});
}

exports.commands = {
	ygo: 'yugioh',
	yugioh: function (target, room, user) {
		if (!this.canBroadcast()) return;
		if (room.id !== 'tcgtabletop') return this.errorReply("This command can only be used in the TCG & Tabletop room.");
		let subdomain = 'yugioh';
		let query = target.trim();

		wikiaSearch(subdomain, query).then(data => {
			if (!this.runBroadcast()) return;
			let entryUrl = Tools.getString(data.url);
			let entryTitle = Tools.getString(data.title);
			let id = Tools.getString(data.id);
			let htmlReply = `<strong>Best result for ${Tools.escapeHTML(query)}:</strong><br/><a href="${Tools.escapeHTML(entryUrl)}">${Tools.escapeHTML(entryTitle)}</a>`;
			if (id) {
				getCardDetails(subdomain, id).then(card => {
					let thumb = Tools.getString(card.thumbnail);
					if (thumb) {
						htmlReply = `<table><tr><td style="padding-right:5px;"><img src="${Tools.escapeHTML(thumb)}" width=80 height=115></td><td>${htmlReply}</td></tr></table>`;
					}
					if (!this.broadcasting) return this.sendReply(`|raw|<div class="infobox">${htmlReply}</div>`);
					room.addRaw(`<div class="infobox">${htmlReply}</div>`).update();
				}, () => {
					if (!this.broadcasting) return this.sendReply(`|raw|<div class="infobox">${htmlReply}</div>`);
					room.addRaw(`<div class="infobox">${htmlReply}</div>`).update();
				});
			} else {
				if (!this.broadcasting) return this.sendReply(`|raw|<div class="infobox">${htmlReply}</div>`);
				room.addRaw(`<div class="infobox">${htmlReply}</div>`).update();
			}
		}, err => {
			if (!this.runBroadcast()) return;

			if (err instanceof SyntaxError || err.message === 'Malformed data') {
				if (!this.broadcasting) return this.sendReply(`Error: Something went wrong in the request: ${err.message}`);
				return room.add(`Error: Something went wrong in the request: ${err.message}`).update();
			} else if (err.message === 'Not found') {
				if (!this.broadcasting) return this.sendReply('|raw|<div class="infobox">No results found.</div>');
				return room.addRaw('<div class="infobox">No results found.</div>').update();
			}
			if (!this.broadcasting) return this.sendReply(`Error: ${err.message}`);
			return room.add(`Error: ${err.message}`).update();
		});
	},
};
