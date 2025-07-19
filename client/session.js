import { loadImage, slugify, fixCenterText } from "/scripts/common.js";
import { Vector2 } from "/scripts/modules/vector2.js";
import { messageCallbacks, sendMessage, connectingToServer } from "/scripts/socket.js";
import { TowerCanvas } from "/scripts/modules/towerCanvas.js";
import { SessionCharacter } from "/scripts/session-character.js";

/** @type {TowerCanvas} */
const canvas = new TowerCanvas("canvas", new Vector2(576, 360));

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

async function mainLoop() {
	canvas.clear();
	let ci = 0;
	for (const c of Object.values(characters)) {
		await canvas.drawPlayerHUD(c, new Vector2(0, 96 * ci), "#cc00cc", "#00cc00", "#00bbbb");
		ci++;
	}

	requestAnimationFrame(mainLoop);
}
mainLoop();

const sessionCallbacks = {};

/**
 * 
 * @param {SessionCharacter} c 
 */
async function updateCharacter(c) {
	const cID = slugify(c.name);
	characters[cID] = c;

	let things = Object.keys(
		Object.getOwnPropertyDescriptors(c)
	).concat(Object.keys(
		Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(c))
	));

	for (let key of things) {
		if (typeof c[key] === "object") {
			for (let sub in c[key]) {
				//updateCharacterData(cID, `${key}-${sub}`, c[key][sub]);
			}
			continue;
		}
		//updateCharacterData(cID, key, c[key]);
	}

	loadImage(`/assets/images/${c.name}/portrait.png`).then(p => c.portrait = p);
	loadImage(`/assets/images/${c.name}/name.png`).then(n => c.portraitName = n);

	//canvas.drawPlayerHUD(c, new Vector2(0, 0));

	fixCenterText();
}
sessionCallbacks["char"] = msg => updateCharacter(new SessionCharacter(msg.char));

function addAllCharacters(msg) {
	msg.chars.forEach(async c => {
		if (!(c.name in characters)) {
			//await addFullSheet(slugify(c.name));
		}
		await updateCharacter(new SessionCharacter(c));
	});
}
sessionCallbacks["chardata"] = addAllCharacters;

function handleSessionEnd() {
	let element = document.getElementById("characters");
	element.innerHTML = "";
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
