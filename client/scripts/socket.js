"use strict";

import { Cookies } from "/scripts/modules/cookies.js";

const serverURL = `ws${(window.location.hostname != "localhost" ? "s" : "")}://${window.location.host}/ws`;

export let messageCallbacks = {
	"system": {},
};

/** @type {WebSocket} */
let socket;

let reconnectDelay = 1;

const startTime = Date.now();

/**
 * Values:
 *   starting     - not yet attempted to connect
 *   start_failed - failed to connect on first attempt
 *   connected    - successfully connected
 *   reconnecting - attempting to reconnect after disconnecting
 *   refreshing   - server sent a refresh command to client
 */
let socketStatus = localStorage.getItem("refreshing") ? "refreshing" : "starting";
let socketConnectStart = 0;

function connectToServer() {
	return new Promise((resolve, reject) => {
		socket = new WebSocket(serverURL);

		socket.addEventListener("error", (event) => {
			console.log(event);
		});

		socket.addEventListener("open", async (event) => {
			sendMessage("system", "connect", {
				status: socketStatus,
				startTime: startTime,
				connectTime: Date.now() - socketConnectStart,
			});
			resolve(socket);
			reconnectDelay = 1;
			socketStatus = "connected";
			localStorage.setItem("refreshing", false);

			// await loadingNavbar;
			let dmToken = Cookies.get("dm_token");
			if (dmToken != undefined) {
				sendMessage("system", "dm", { token: dmToken });
			}
		});

		socket.addEventListener("close", (event) => {
			switch (socketStatus) {
				case "starting":
					socketStatus = "start_failed";
					socketConnectStart = Date.now();
				case "start_failed":
				case "reconnecting":
				case "refreshing":
					console.log(`Connection failed. Retrying in ${reconnectDelay} second${reconnectDelay == 1 ? '' : 's'}...`);
					break;
				case "connected":
					socketStatus = "reconnecting";
					socketConnectStart = Date.now();
					console.log(`Connection lost. Retrying in ${reconnectDelay} second${reconnectDelay == 1 ? '' : 's'}...`);
					break;
			}
			setTimeout(connectToServer, reconnectDelay * 1000);
			reconnectDelay = Math.min(reconnectDelay * 2, 60)
		});

		socket.addEventListener("message", (event) => {
			// console.log("Message from server:\n\t", event.data);
			let data = JSON.parse(event.data);
			messageCallbacks[data.category]?.[data.type]?.(data);
		});
	});
}

export let connectingToServer = connectToServer();

/**
 * 
 * @param {string} category 
 * @param {string} type 
 * @param {object} data 
 */
export function sendMessage(category, type, data = {}) {
	let obj = { category, type, ...data };
	let json = JSON.stringify(obj);
	// console.log("Sending to server:\n\t" + json);
	socket.send(json);
}

function handleSystemMessage(msg) {
	systemCallbacks[msg.type]?.(msg);
}
//messageCallbacks["system"] = handleSystemMessage;
