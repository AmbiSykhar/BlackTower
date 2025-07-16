import { Vector2 } from "/scripts/classes/vector2.js"
import { VectorHex } from "/scripts/classes/vectorHex.js"
import { loadImage, getMousePosInCanvas } from "/scripts/common.js";

const sessionCallbacks = {};

const newBarFillTexture = loadImage("assets/textures/new-bar-fill.png");

const barColors = {
    hp: "#00cc00",
    mp: "#00bbbb",
};

/** @type HTMLCanvasElement */
const fieldElement = document.getElementById("field");
const fieldCtx = fieldElement.getContext("2d");
fieldCtx.imageSmoothingEnabled = false;

const fieldDrawScale = 1;

const resizer = new ResizeObserver(() => {
    fieldElement.width = fieldElement.getBoundingClientRect().width / fieldDrawScale;
    fieldElement.height = fieldElement.getBoundingClientRect().height / fieldDrawScale;
});
resizer.observe(fieldElement);

const hexOutlineThickness = 2;
const gridHexRadius = 32 / fieldDrawScale;
const hexRatio = Math.sqrt(3) / 2;

class CharacterToken {
    /**
     * 
     * @param {VectorHex} position 
     * @param {string} fillColor 
     * @param {string} borderColor 
     */
    constructor(position, fillColor, borderColor = null) {
        this.position = position;
        this.fillColor = fillColor;
        this.borderColor = borderColor ?? "white";
    }

    /** @type {VectorHex} */
    position;
    /** @type {string} */
    borderColor;
    /** @type {string} */
    fillColor;

    draw() {
        drawCircle(getHexCenter(this.position), gridHexRadius * (5 / 8), 2, this.borderColor, this.fillColor);
    }
}

let CharacterTokens = [
    new CharacterToken(new VectorHex(0, -1, 1), "red"),
    new CharacterToken(new VectorHex(-1, 1, 0), "blue"),
    new CharacterToken(new VectorHex(1, 0, -1), "green"),
];

drawField(3, CharacterTokens);

/**
 * @param {VectorHex} hex 
 */
function getHexCenter(hex) {
    let x = gridHexRadius * (3 / 2 * hex.q);
    let y = gridHexRadius * (hexRatio * hex.q + Math.sqrt(3) * hex.r);
    return new Vector2(x, y);
}

/**
 * 
 * @param {Vector2} vec 
 */
function getHexAtPosition(vec) {
    if (vec === null) {
        return null;
    }

    let q = (2 / 3 * vec.x) / gridHexRadius;
    let r = (-1 / 3 * vec.x + Math.sqrt(3) / 3 * vec.y) / gridHexRadius;

    return new VectorHex(q, r).round();
}

/**
 * 
 * @param {VectorHex} hex 
 */
function getTokenAtHex(hex) {
    return CharacterTokens.find(token => VectorHex.equals(token.position, hex));
}

/**
 * 
 * @param {PointerEvent} e 
 */
function handleClick(e) {
    const pos = getMousePosInCanvas(fieldElement, fieldCtx);
    if (!pos)
        return;

    const hex = getHexAtPosition(pos);
    if (!hex)
        return;

    const token = getTokenAtHex(hex);
    if (!token)
        return;

    token.borderColor = token.borderColor == "white" ? "black" : "white";
}
document.addEventListener("click", handleClick, false);

/**
 * @param {Number} gridRadius 
 * @param {Array<CharacterToken>} characterTokens 
 */
function drawField(gridRadius, characterTokens) {
    fieldCtx.resetTransform();

    fieldCtx.clearRect(0, 0, fieldElement.width, fieldElement.height);
    fieldCtx.translate(fieldElement.width / 2, fieldElement.height / 2);

    let mousePos = getMousePosInCanvas(fieldElement, fieldCtx);
    if (mousePos !== null) {
        drawCircle(mousePos, 16 / fieldDrawScale, 2, "lime");
    }

    drawGrid(gridRadius, mousePos);
    for (const c of characterTokens) {
        c.draw();
    }

    requestAnimationFrame(drawField.bind(null, ...arguments));
}

/**
 * @param {Number} radius
 * @param {Vector2} mousePos
 */
function drawGrid(radius, mousePos) {
    const hexWidth = gridHexRadius * 2;

    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius - q, -radius); r <= Math.min(radius - q, radius); r++) {
            let hex = new VectorHex(q, r);
            let fill = "transparent";
            if (VectorHex.equals(hex, getHexAtPosition(mousePos))) {
                fill = "rgba(255, 255, 255, 0.5)";
            }

            drawHexagon(getHexCenter(hex), hexWidth / 2, hexOutlineThickness, "white", fill);
        }
    }
}

/**
 * @param {Vector2} center
 * @param {Number} radius
 * @param {Number} lineThickness
 * @param {string} borderColor
 * @param {string} fillColor
 */
function drawHexagon(center, radius, lineThickness, borderColor = "white", fillColor = "transparent") {
    const cx = center.x;
    const cy = center.y;
    const w = radius * 2;
    const h = radius * hexRatio * 2;

    fieldCtx.lineWidth = lineThickness;
    fieldCtx.strokeStyle = borderColor;
    fieldCtx.fillStyle = fillColor;

    fieldCtx.beginPath();
    fieldCtx.moveTo(cx - w / 4, cy - h / 2);
    fieldCtx.lineTo(cx + w / 4, cy - h / 2);
    fieldCtx.lineTo(cx + w / 2, cy);
    fieldCtx.lineTo(cx + w / 4, cy + h / 2);
    fieldCtx.lineTo(cx - w / 4, cy + h / 2);
    fieldCtx.lineTo(cx - w / 2, cy);
    fieldCtx.closePath();

    fieldCtx.fill();
    fieldCtx.stroke();
}

/**
 * @param {Vector2} center
 * @param {Number} radius
 * @param {Number} lineThickness
 * @param {string} borderColor
 * @param {string} fillColor
 */
function drawCircle(center, radius, lineThickness, borderColor = "white", fillColor = "transparent") {
    fieldCtx.lineWidth = hexOutlineThickness;
    fieldCtx.strokeStyle = borderColor;
    fieldCtx.fillStyle = fillColor;

    fieldCtx.beginPath();
    fieldCtx.ellipse(center.x, center.y, radius, radius, 0, 0, 2 * Math.PI);
    fieldCtx.closePath();

    fieldCtx.fill();
    fieldCtx.stroke();
}

/** @type {{ [charID: string]: SessionCharacter }} */
let characters = {};

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

    drawPartyMember(cID);

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

messageCallbacks["session"] = handleSessionMessage;
