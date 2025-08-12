import { sendConsoleCommand } from "/scripts/console.js";
import { request } from "/scripts/socket.js";

/** @type {HTMLDialogElement} */
let dmPopup = document.getElementById("dm-popup");

let names;

export async function initialize() {
	document.getElementById("popup-start").addEventListener('click', startButton);
	document.getElementById("popup-cancel").addEventListener('click', () => { dmPopup.close(); });

	let data = await request("charnames")
	names = data.charNames;

	let nameText = "";
	for (const name of names) {
		nameText += `<input type="checkbox" id="popup-${name}"><label for="popup-${name}">${name}</label><br>`;
	}

	let nameList = document.getElementById("character-list");
	nameList.innerHTML = nameText;

	console.log(names);
}

function startButton() {
	let activeNames = "";
	for (const name of names) {
		let checked = document.getElementById(`popup-${name}`).checked;

		if (!checked) continue;

		activeNames += `"${name}" `;
	}

	if (activeNames.length < 4) return;

	sendConsoleCommand(`session new ${activeNames}`);

	dmPopup.close();
}
