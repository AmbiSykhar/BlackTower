import { loadImage, slugify, fixCenterText } from "/scripts/common.js";
import { Vector2 } from "/scripts/modules/vector2.js";
import { messageCallbacks, sendMessage, connectingToServer } from "/scripts/socket.js";
import { TowerCanvas } from "/scripts/modules/towerCanvas.js";
import { SessionCharacter } from "/scripts/session-character.js";

/** @type {TowerCanvas} */
const canvas = new TowerCanvas("canvas", new Vector2(576, 360));

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

const sessionCallbacks = {};

let loadingPortraitFrame = loadImage("/assets/textures/portrait-frame.png");
let loadingPortraitBackground = loadImage("/assets/textures/portrait-background.png");

async function drawPlayerHUD(character, pos) {
	let loadingPortrait = loadImage(`/assets/images/${character.name}/portrait.png`);
	let loadingPortraitName = loadImage(`/assets/images/${character.name}/name.png`);

	canvas.drawImage(await loadingPortraitFrame, new Vector2(0, 0));
	canvas.drawImage(await loadingPortraitBackground, new Vector2(0, 0));
	// TODO: Background color
	try {
		canvas.drawImage(await loadingPortrait, new Vector2(0, 0));
	} catch {
		console.error(`Cannot find portrait for character '${character.name}'!`);
	}
	try {
		canvas.drawImage(await loadingPortraitName, new Vector2(0, 0));
	} catch {
		console.error(`Cannot find portrait name for character '${character.name}'!`);
	}
}

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

	// TEMP
	//updateBar(cID, "hp", c.currentHP, c.maxHP, c.hpPotions, SessionCharacter.maxHPPotions);
	//updateBar(cID, "mp", c.currentMP, c.maxMP, c.mpPotions, SessionCharacter.maxMPPotions);
	//updateClassMechanic(cID, 1);
	//updateClassMechanic(cID, 2);
	//updateGems(cID, c.gems);
	//updateBuffs(cID, c.buffs);

	canvas.drawPlayerHUD(c, new Vector2(0, 0));

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
