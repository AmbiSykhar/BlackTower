const sessionCallbacks = {};

const portraitFrame = loadImage("assets/textures/portrait-frame.png");
const portraitBackground = loadImage("assets/textures/portrait-background.png");

/** @type {TowerCanvas} */
const canvas = new TowerCanvas("canvas", new Vector2(576, 360));

canvas.drawBox(new Vector2(0, 0), new Vector2(576, 360));

// const fieldDrawScale = 1;

// const resizer = new ResizeObserver(() => {
// 	let c = canvas.canvas;
// 	c.width = c.getBoundingClientRect().width / fieldDrawScale;
// 	c.height = c.getBoundingClientRect().height / fieldDrawScale;
// });
// resizer.observe(canvas.canvas);

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

async function drawPlayerHUD(player, position) {
	canvas.clearRect(position, new Vector2(92, 112));

	let ctx = canvas.context;

	// draw frame
	ctx.drawImage(await portraitFrame, 0, 0);

	// draw background
	ctx.drawImage(await portraitBackground, 0, 0);
}

async function drawPartyMember(cID) {
	let party = document.getElementById("party");

	let canvas = document.getElementById(`${cID}-party`);
	if (canvas == null) {
		canvas = document.createElement("canvas");
		canvas.classList.add("party-member");
		canvas.id = `${cID}-party`;

		party.appendChild(canvas);
	}
	let ctx = canvas.getContext("2d");

	let character = characters[cID];
	if (!character)
		return;

	const width = canvas.width = 92;
	const height = canvas.height = 112;
	ctx.clearRect(0, 0, width, height);
	ctx.imageSmoothingEnabled = false;

	// draw frame
	ctx.drawImage(await loadImage("assets/textures/portrait-frame.png"), 0, 0);

	// draw background
	ctx.drawImage(await loadImage("assets/textures/portrait-background.png"), 0, 0);
	// TODO: adjust background color

	// TODO: draw portrait
	try {
		ctx.drawImage(await loadImage(`assets/images/${character.name}/portrait.png`), 0, 0);
		ctx.drawImage(await loadImage(`assets/images/${character.name}/name.png`), 0, 0);
	} catch {

	}

	const barXs = { hp: 24, mp: 28 };
	const barYs = { hp: 75, mp: 83 };
	const barRowStarts = [20, 21, 21, 4, 2, 2, 3];
	const barRowWidths = [38, 38, 38, 56, 58, 59, 58];
	const barRowHeight = 7;

	// draw HP bar
	const values = { hp: character.currentHP, mp: character.currentMP };
	const maxes = { hp: character.maxHP, mp: character.maxMP };
	for (const key in values) {
		if (!Object.prototype.hasOwnProperty.call(values, key)) {
			continue;
		}
		const v = values[key];
		const m = maxes[key];
		const p = v / m;

		// apply texture
		ctx.drawImage(await newBarFillTexture,
			0, 0, 59, 7,
			barXs[key] + 2, barYs[key], 59, 7
		);

		// apply color
		const oldGCO = ctx.globalCompositeOperation;
		for (let i = 0; i < barRowHeight; i++) {
			const fullWidth = 58;
			const fillWidth = fullWidth * p;
			const start = barRowStarts[i];

			const f = fullWidth - start + i / 2 + 0.5;
			const w = fillWidth - start + i / 2 + 0.5;
			// fill color
			if (w > 0) {
				ctx.fillStyle = barColors[key];
				ctx.globalCompositeOperation = "overlay";
				ctx.fillRect(barXs[key] + start, barYs[key] + i, w, 1);
			}

			// empty color
			if (f - w > 0) {
				ctx.globalCompositeOperation = "source-over";
				ctx.fillStyle = "#494949";
				ctx.fillRect(barXs[key] + start + w, barYs[key] + i, f - w, 1);
			}
		}
		ctx.globalCompositeOperation = oldGCO;

		// write numbers
		let numStr = `${' '.repeat(3 - v.toString().length)}${v}/${' '.repeat(3 - m.toString().length)}${m}`
		writeSmall(ctx, barXs[key] + barRowWidths[3] - 35, barYs[key] + 2, numStr);
	}

	// TODO: buffs

	writeSmall(ctx, 32, 93, character.specialtyClass.name);
	if (character.equippedClass) {
		let equippedClass = character.equippedClass.name;
		writeSmall(ctx, 37, 103, equippedClass);
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
				if (sub == "skills") {
					//updateCharacterSkills(cID, key, c[key][sub]);
					continue;
				}
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

	// drawPartyMember(cID);
	drawPlayerHUD(c, new Vector2(0, 0));

	fixCenterText();
}
sessionCallbacks["char"] = msg => updateCharacter(new SessionCharacter(msg.char));

connectingToServer.then(() => {
	sendMessage("session", "ping");
});

function handleSessionMessage(msg) {
	sessionCallbacks[msg.type]?.(msg);
}

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

messageCallbacks["session"] = sessionCallbacks;
