import { loadImage, slugify } from "/scripts/common.js";
import { connectingToServer, request } from "/scripts/socket.js";
import { TowerCanvas } from "/scripts/modules/towerCanvas.js";
import { Vector2 } from "/scripts/modules/vector2.js";

const charactersElement = document.getElementById("characters");

let characters = {};

connectingToServer.then(() => {
	request("chardata").then(addAllCharacters);
})

function addAllCharacters(msg) {
	for (const c of msg.chars) {
		if (!(c.name in characters)) {
			let element = document.createElement("canvas");
			element.id = slugify(c.name);
			charactersElement.append(element);
		}
		updateCharacter(c);
	}
}

async function updateCharacter(c) {
	const cID = slugify(c.name);
	characters[cID] = c;

	c.portrait = await loadImage(`/assets/images/${c.name}/portrait.png`);
	c.portraitName = await loadImage(`/assets/images/${c.name}/name.png`);
	c.profileInfo = await loadImage(`/assets/images/${c.name}/profile-info.png`);
	c.profileClass = await loadImage(`/assets/images/${c.name}/profile-class.png`);

	let canvas = new TowerCanvas(cID, new Vector2(159, 106));
	canvas.drawPlayerProfile(c);
}
