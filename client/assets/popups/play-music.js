import { sendConsoleCommand } from "/scripts/console.js";
import { request } from "/scripts/socket.js";

/** @type {HTMLDialogElement} */
let dmPopup = document.getElementById("dm-popup");

/** @type {HTMLInputElement} */
let musicIDInput = document.getElementById("popup-mus-id");

export async function initialize() {
	document.getElementById("popup-play").addEventListener('click', playButton);
	document.getElementById("popup-cancel").addEventListener('click', () => { dmPopup.close(); });

	let data = await request("musqueue");

	let queueText = "";
	for (const song of data.queue) {
		queueText += `<input type="radio" id="popup-${song}" name="popup-song" value="${song}"><label for="popup-${song}">${song}</label><br>`;
	}

	let queueList = document.getElementById("current-queue");
	queueList.innerHTML = queueText;
}

function playButton() {
	let selected = document.getElementById("current-queue").querySelector("input[type=\"radio\"]:checked");
	sendConsoleCommand(`music play ${selected.value}`);

	dmPopup.close();
}
