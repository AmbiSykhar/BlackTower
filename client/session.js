import { loadImage, slugify, fixCenterText, getRandomNumber } from "/scripts/common.js";
import { Vector2 } from "/scripts/modules/vector2.js";
import { messageCallbacks, sendMessage, connectingToServer } from "/scripts/socket.js";
import { TowerCanvas } from "/scripts/modules/towerCanvas.js";
import { SessionCharacter } from "/scripts/session-character.js";
import { PlayerHUD } from "/scripts/modules/playerHUD.js";
import { initializePopup } from "/scripts/tower.js";

/** @type {TowerCanvas} */
const canvas = new TowerCanvas("canvas", new Vector2(576, 360));

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

/** @type {{ [charID: string]: PlayerHUD }} */
let playerHUDs = {};

let lastTime = document.timeline.currentTime;
async function mainLoop(now) {
	const dt = now - lastTime;
	lastTime = now;

	for (const cID of Object.keys(characters)) {
		playerHUDs[cID].update(dt);
	}

	canvas.clear();
	for (const cID of Object.keys(characters)) {
		await canvas.drawPlayerHUD(playerHUDs[cID]);
	}

	requestAnimationFrame(mainLoop);
}
mainLoop(document.timeline.currentTime);

function handleClick() {
	const pos = canvas.getMousePosition();

	let cID;
	for (cID in playerHUDs) {
		if (playerHUDs[cID].rect.contains(pos)) {
			break;
		}
	}

	initializePopup("click-player-hud", cID);
}
canvas.addClickListener(handleClick);


const sessionCallbacks = {};

/**
 * 
 * @param {SessionCharacter} c 
 */
async function updateCharacter(c) {
	const cID = slugify(c.name);

	let hud = playerHUDs[cID];

	hud.updatePlayer(c);

	characters[cID] = c;

	let things = Object.keys(
		Object.getOwnPropertyDescriptors(c)
	).concat(Object.keys(
		Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(c))
	));

	loadImage(`/assets/images/${c.name}/portrait.png`).then(p => c.portrait = p);
	loadImage(`/assets/images/${c.name}/name.png`).then(n => c.portraitName = n);

	fixCenterText();
}
sessionCallbacks["char"] = msg => updateCharacter(new SessionCharacter(msg.char));

function addAllCharacters(msg) {
	let ci = 0;
	msg.chars.forEach(c => {
		let sessionCharacter = new SessionCharacter(c);

		playerHUDs[slugify(c.name)] = new PlayerHUD(sessionCharacter, new Vector2(1, 96 * ci));
		updateCharacter(sessionCharacter);

		ci++;
	});
}
sessionCallbacks["chardata"] = addAllCharacters;

function handleSessionEnd() {
	canvas.clear();

	characters = {};
	handleNoSession();
}
sessionCallbacks["end"] = handleSessionEnd;

function handleNoSession() {
	sendMessage("session", "charnames");
}
sessionCallbacks["nosession"] = handleNoSession;

function startSession() {
	document.getElementById("no-session")?.remove();
	sendMessage("session", "chardata");
}
sessionCallbacks["start"] = startSession;




connectingToServer.then(() => {
	sendMessage("session", "ping");
});

messageCallbacks.session = sessionCallbacks;
