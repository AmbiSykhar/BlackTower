import { sendConsoleCommand } from "/scripts/console.js";

let dmPopup = document.getElementById("dm-popup");

let playerID;

export async function initialize(player) {
	playerID = player;
	document.getElementById("popup-accept").addEventListener('click', acceptButton);
	document.getElementById("popup-cancel").addEventListener('click', () => { dmPopup.close(); });

	document.getElementById("popup-title").innerText = `Edit ${playerID}'s HP`;
}

function acceptButton() {
	let value = document.getElementById("popup-value").value;
	sendConsoleCommand(`data \"${playerID}\" currentHP ${value}`);

	dmPopup.close();
}
