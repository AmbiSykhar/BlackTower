import { loadImage, slugify, fixCenterText, getRandomNumber } from "/scripts/common.js";
import { Vector2 } from "/scripts/modules/vector2.js";
import { messageCallbacks, sendMessage, connectingToServer } from "/scripts/socket.js";
import { TowerCanvas } from "/scripts/modules/towerCanvas.js";
import { SessionCharacter } from "/scripts/session-character.js";

/** @type {TowerCanvas} */
const canvas = new TowerCanvas("canvas", new Vector2(576, 360));

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

let characterExtras = {};

let lastTime = document.timeline.currentTime;
async function mainLoop(now) {
	const dt = now - lastTime;
	lastTime = now;

	let ci = 0;
	for (const cID of Object.keys(characters)) {
		const c = characters[cID];
		const cx = characterExtras[cID];

		if (Math.abs(cx.hpDelay - c.currentHP) > 0.01) {
			let hpDelta = c.currentHP - cx.hpDelay;

			if (cx.hpDelayTimer > 0) {
				cx.hpDelayTimer -= dt;
				if (hpDelta < 0) {
					if (-hpDelta < c.maxHP / 2) {
						cx.portraitX = getRandomNumber(-1, 1);
					} else if (-hpDelta < c.maxHP) {
						cx.portraitX = getRandomNumber(-2, 2);
						cx.portraitY = getRandomNumber(-1, 1);
					} else {
						cx.portraitX = getRandomNumber(-3, 3);
						cx.portraitY = getRandomNumber(-2, 2);
					}
				}
			} else {
				if (c.currentHP <= 0) {
					cx.bgColor = "#444444";
				} else if (c.currentHP < c.maxHP / 3) {
					cx.bgColor = "#880000";
				} else if (c.currentHP < c.maxHP * 2 / 3) {
					cx.bgColor = "#aaaa00";
				} else {
					cx.bgColor = "#008800";
				}
				let hpd = 0.1;
				cx.hpDelayColor = "#88cc88";
				if (hpDelta < 0) {
					hpd = -0.1;
					cx.hpDelayColor = "#cc0000";
					cx.portraitX = 0;
					cx.portraitY = 0;
				}
				cx.hpDelay += hpd;
			}
		}

		characterExtras[cID] = cx;
		ci++;
	}

	canvas.clear();
	ci = 0;
	for (const cID of Object.keys(characters)) {
		const c = characters[cID];
		const cx = characterExtras[cID];

		await canvas.drawPlayerHUD(c,
			new Vector2(1 + (cx.portraitX ?? 0), 96 * ci + (cx.portraitY ?? 0)),
			cx.bgColor ?? "#008800",
			{ color: "#00cc00", delay: cx.hpDelay ?? null, delayColor: cx.hpDelayColor ?? "transparent" },
			{ color: "#00bbbb", delay: cx.mpDelay ?? null, delayColor: cx.mpDelayColor ?? "transparent" }
		);
		ci++;
	}

	requestAnimationFrame(mainLoop);
}
mainLoop(document.timeline.currentTime);

const sessionCallbacks = {};

/**
 * 
 * @param {SessionCharacter} c 
 */
async function updateCharacter(c) {
	const cID = slugify(c.name);
	const oldC = characters[cID];
	let cx = characterExtras[cID] ?? {};

	if (c.currentHP <= 0) {
		cx.bgColor = "#444444";
	} else if (c.currentHP < c.maxHP / 3) {
		cx.bgColor = "#880000";
	} else if (c.currentHP < c.maxHP * 2 / 3) {
		cx.bgColor = "#aaaa00";
	} else {
		cx.bgColor = "#008800";
	}

	if (oldC != null) {
		if (c.currentHP != oldC.currentHP) {
			cx.hpDelay = oldC.currentHP;
			cx.hpDelayTimer = 500;

			cx.hpDelayColor = cx.bgColor = c.currentHP > oldC.currentHP ? "#88cc88" : "#cc0000";
		}
	}

	characters[cID] = c;
	characterExtras[cID] = cx;

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
