import { sendConsoleCommand } from "/scripts/console.js";
import { request } from "/scripts/socket.js";

/** @type {HTMLDialogElement} */
let dmPopup = document.getElementById("dm-popup");

/** @type {HTMLInputElement} */
let musicIDInput = document.getElementById("popup-mus-id");

export async function initialize() {
	document.getElementById("popup-queue").addEventListener('click', queueButton);
	document.getElementById("popup-cancel").addEventListener('click', () => { dmPopup.close(); });

	let data = await request("musqueue");

	let queueList = document.getElementById("current-queue");
	queueList.innerHTML = data.queue;
}

function queueButton() {
	sendConsoleCommand(`music queue ${musicIDInput.value}`);

	dmPopup.close();
}
