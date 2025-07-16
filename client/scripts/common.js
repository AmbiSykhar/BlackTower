"use strict";

if (localStorage.lightning === undefined) localStorage.lightning = true; // default true
if (localStorage.rain === undefined) localStorage.rain = true; // default true

let loadingNavbar = null;
if (document.getElementById("navbar") !== null) {
    loadingNavbar = fetch("/assets/templates/navbar.html")
        .then(data => { return data.text(); })
        .then(data => { document.getElementById("navbar").innerHTML = data; })
        .then(updateViewElement);
}

// General Utilities

class Vector2 {
    /** @type {Number} */
    x;
    /** @type {Number} */
    y;

    /**
     * @param {Number} x
     * @param {Number} y 
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {VectorHex} hex 
     */
    static fromVectorHex(hex) {
        let x = hex.q;
        let y = hex.r + (hex.q - (hex.q & 1)) / 2;
        return new Vector2(x, y);
    }

    [Symbol.toPrimitive](hint) {
        if (hint === "string" || hint === "default")
            return `[Vector2 {${this.x},${this.y}}]`;

        return this.x * 1000000 + this.y;
    }
}

class VectorHex {
    /** @type {Number} west -> east */
    q = null;
    /** @type {Number} northeast -> southwest */
    r = null;
    /** @type {Number} southeast -> northwest */
    s = null;

    /**
     * @param {Number} q
     * @param {Number} r
     * @param {Number} s
     */
    constructor(q, r, s = null) {
        this.q = q;
        this.r = r;
        this.s = s ?? (-q - r);
        if ((this.q ?? 0) + (this.r ?? 0) + (this.s ?? 0) != 0)
            console.log(`Hex coordinate (${q}, ${r}, ${s}) has wrong sum!`);
    }

    /**
     * @param {Vector2} vec2 
     */
    static fromVector2(vec2) {
        let q = vec2.x;
        let r = vec2.y - (vec2.x - (vec2.x & 1)) / 2;
        let s = -this.q - this.r;
        return new VectorHex(q, r, s);
    }

    calculateMissing() {
        this.q = this.q ?? -this.r - this.s;
        this.r = this.r ?? -this.q - this.s;
        this.s = this.s ?? -this.q - this.r;
    }

    getNeighbor(dir) {
        return add(this, HexDirectionVectors[dir]);
    }

    round() {
        let q = Math.round(this.q);
        let r = Math.round(this.r);
        let s = Math.round(this.s);

        let q_diff = Math.abs(q - this.q);
        let r_diff = Math.abs(r - this.r);
        let s_diff = Math.abs(s - this.s);

        if (q_diff > r_diff && q_diff > s_diff) {
            q = -r - s;
        }
        else if (r_diff > s_diff) {
            r = - q - s;
        }
        else {
            s = - q - r;
        }
        this.q = q;
        this.r = r;
        this.s = s;

        return this;
    }

    static add(hex1, hex2) {
        return new VectorHex(hex1.q + hex2.q, hex1.r + hex2.r, hex1.s + hex2.s);
    }

    static equals(hex1, hex2) {
        if (hex1 === null || hex2 === null)
            return hex1 === hex2;
        return hex1.q == hex2.q && hex1.r == hex2.r && hex1.s == hex2.s;
    }

    [Symbol.toPrimitive](hint) {
        if (hint === "string" || hint === "default")
            return `[VectorHex {${this.q},${this.r},${this.s}}]`;

        return this.q * 1000000 + this.r * 1000 + this.s;
    }
}

const HexDirections = {
    no: 0,
    nw: 1,
    sw: 2,
    so: 3,
    se: 4,
    ne: 5,
}

const HexDirectionVectors = [
    new VectorHex(0, -1, -1), new VectorHex(+1, -1, 0), new VectorHex(+1, 0, -1),
    new VectorHex(+1, 0, -1), new VectorHex(-1, +1, 0), new VectorHex(-1, 0, +1),
];

let mousePosition = new Vector2(0, 0);
/**
 * 
 * @param {MouseEvent} e 
 */
function mouseMoved(e) {
    mousePosition = new Vector2(e.clientX, e.clientY);
}
document.addEventListener("mousemove", mouseMoved, false);
/**
 * @param {HTMLCanvasElement} canvas
 * @param {CanvasRenderingContext2D} ctx
 */
function getMousePosInCanvas(canvas, ctx) {
    let rect = canvas.getBoundingClientRect();
    let scale = new Vector2(canvas.width / rect.width, canvas.height / rect.height);

    let imatrix = ctx.getTransform().invertSelf();

    let pos = new Vector2(
        (mousePosition.x - rect.left) * scale.x,
        (mousePosition.y - rect.top) * scale.y
    );

    if (pos.x > 0 && pos.x < rect.width &&
        pos.y > 0 && pos.y < rect.height) {

        return new Vector2(
            pos.x * imatrix.a + pos.y * imatrix.c + imatrix.e,
            pos.x * imatrix.b + pos.y * imatrix.d + imatrix.f,
        );
    }
    return null;
}

function slugify(str) {
    return str.replace(/\s/g, "");
}

function getRandomNumber(min, max) {
    return (max - min) * Math.random() + min;
}

function loadImage(path) {
    return new Promise(resolve => {
        let image = new Image();
        image.onload = resolve.bind(resolve, image);
        image.src = path;
    });
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
        return parts.pop().split(';').shift();
}
function setCookie(name, value) {
    document.cookie = `${name}=${value}`;
}
function deleteCookie(name) {
    document.cookie = `${name}=; max-age=0`;
}

// Websocket

const serverURL = `ws${(window.location.hostname != "localhost" ? "s" : "")}://${window.location.host}/ws`;

let messageCallbacks = {};

/** @type {WebSocket} */
let socket;

let reconnectDelay = 1;

const startTime = Date.now();

/**
 * Values:
 *   starting     - not yet attempted to connect
 *   start_failed - failed to connect on first attempt
 *   connected    - successfully connected
 *   reconnecting - attempting to reconnect after disconnecting
 *   refreshing   - server sent a refresh command to client
 */
let socketStatus = localStorage.getItem("refreshing") ? "refreshing" : "starting";
let socketConnectStart = 0;

function connectToServer() {
    return new Promise((resolve, reject) => {
        socket = new WebSocket(serverURL);

        socket.addEventListener("error", (event) => {
            console.log(event);
        });

        socket.addEventListener("open", async (event) => {
            sendMessage("system", "connect", {
                status: socketStatus,
                startTime: startTime,
                connectTime: Date.now() - socketConnectStart,
            });
            resolve(socket);
            reconnectDelay = 1;
            socketStatus = "connected";
            localStorage.setItem("refreshing", false);

            await loadingNavbar;
            let dmToken = getCookie("dm_token");
            if (dmToken != undefined) {
                sendMessage("system", "dm", { token: dmToken });
            }
        });

        socket.addEventListener("close", (event) => {
            switch (socketStatus) {
                case "starting":
                    socketStatus = "start_failed";
                    socketConnectStart = Date.now();
                case "start_failed":
                case "reconnecting":
                case "refreshing":
                    console.log(`Connection failed. Retrying in ${reconnectDelay} second${reconnectDelay == 1 ? '' : 's'}...`);
                    break;
                case "connected":
                    socketStatus = "reconnecting";
                    socketConnectStart = Date.now();
                    console.log(`Connection lost. Retrying in ${reconnectDelay} second${reconnectDelay == 1 ? '' : 's'}...`);
                    break;
            }
            setTimeout(connectToServer, reconnectDelay * 1000);
            reconnectDelay = Math.min(reconnectDelay * 2, 60)
        });

        socket.addEventListener("message", (event) => {
            console.log("Message from server:\n\t", event.data);
            let data = JSON.parse(event.data);
            messageCallbacks[data.category]?.(data);
        });
    });
}

let connectingToServer = connectToServer();

function sendMessage(category, type, data = {}) {
    let obj = { category, type, ...data };
    let json = JSON.stringify(obj);
    console.log("Sending to server:\n\t" + json);
    socket.send(json);
}

function handleSystemMessage(msg) {
    systemCallbacks[msg.type]?.(msg);
}
messageCallbacks["system"] = handleSystemMessage;
let systemCallbacks = {};

function refresh() {
    localStorage.setItem("refreshing", true);
    window.location.reload();
}
systemCallbacks["refresh"] = refresh;

let viewCount = 0;
function updateViewCount(msg) {
    viewCount = msg.count;
    updateViewElement();
}
systemCallbacks["viewers"] = updateViewCount;

function updateViewElement() {
    let viewCounter = document.getElementById("view-count");
    if (!viewCounter)
        return;
    viewCounter.innerText = `Viewing: ${viewCount}`;
}

// Black Tower Utilities

const smallFontWidth = 5;
const smallFontHeight = 9;
const smallFont = new Promise((resolve, reject) => {
    let image = new Image();
    image.onload = resolve.bind(resolve, image);
    image.src = '/assets/fonts/small-font.png';
});

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y 
 * @param {string} str
 */
async function writeSmall(ctx, x, y, str) {
    let xx = x;
    str = str.toString();
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        const cIndex = c.charCodeAt(0) - 32;

        let charX = (cIndex & 0xF) * smallFontWidth;
        let charY = (cIndex >> 4) * smallFontHeight;

        ctx.drawImage(await smallFont, charX, charY, smallFontWidth, smallFontHeight, xx, y, smallFontWidth, smallFontHeight);
        xx += smallFontWidth;
    }
}

const barBorder = loadImage('/assets/textures/bar-border.png');
const barFill = loadImage('/assets/textures/bar-fill.png');
const barColorBlend = "hard-light";

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} width 
 * @param {Number} fillValue 
 * @param {Number} fillMax 
 * @param {String} fillColor 
 * @param {Image} labelImage 
 * @param {Boolean} text 
 */
async function drawBar(ctx, x, y, width, fillValue, fillMax, fillColor, labelImage, text = true) {
    const borderHeight = 9;
    const borderSliceX = {
        leftEdge: 0,
        label: 7,
        left: 8,
        middle: 13,
        right: 14,
    };
    const borderSliceW = {
        leftEdge: 7,
        label: 1,
        left: 5,
        middle: 1,
        right: 10,
    };

    const borderTexture = await barBorder;
    const fillTexture = await barFill;

    ctx.transform(1, 0, 0, 1, x, y);

    let currentX = 0;

    // Draw the empty label
    ctx.drawImage(borderTexture,
        borderSliceX.leftEdge, 0, borderSliceW.leftEdge, borderHeight,
        currentX, 0, borderSliceW.leftEdge, borderHeight
    );
    currentX += borderSliceW.leftEdge;

    const labelWidth = labelImage.width;
    ctx.drawImage(borderTexture,
        borderSliceX.label, 0, borderSliceW.label, borderHeight,
        currentX, 0, labelWidth, borderHeight
    );
    currentX += labelWidth;

    // Draw the empty bar
    ctx.drawImage(borderTexture,
        borderSliceX.left, 0, borderSliceW.left, borderHeight,
        currentX, 0, borderSliceW.left, borderHeight
    );
    currentX += borderSliceW.left;

    const blankWidth = width - currentX - borderSliceW.right;
    const fillStart = currentX + 2;
    ctx.drawImage(borderTexture,
        borderSliceX.middle, 0, borderSliceW.middle, borderHeight,
        currentX, 0, blankWidth, borderHeight
    );
    currentX += blankWidth;

    ctx.drawImage(borderTexture,
        borderSliceX.right, 0, borderSliceW.right, borderHeight,
        currentX, 0, borderSliceW.right, borderHeight
    );
    currentX += borderSliceW.right;

    // draw the label
    ctx.drawImage(labelImage, borderSliceW.leftEdge + 1, 1);

    // Skew canvas
    ctx.transform(1, 0, -1, 1, 0, 0);

    // draw the bar fill
    const fillWidth = (blankWidth + 6) * (fillValue / fillMax);
    ctx.fillStyle = fillColor;
    ctx.fillRect(fillStart, 1, fillWidth, 6);

    const oldGCO = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = barColorBlend;
    ctx.drawImage(fillTexture,
        0.5, 0, 0.5, 8,
        fillStart, 0, Math.min(1, fillWidth), 8
    );
    ctx.drawImage(fillTexture,
        1.5, 0, 0.5, 8,
        fillStart + 1, 0, Math.max(0, fillWidth - 2), 8
    );
    ctx.drawImage(fillTexture,
        2.5, 0, 0.5, 8,
        fillStart + 1 + fillWidth - 2, 0, fillWidth <= 1 ? 0 : 1, 8
    );
    ctx.resetTransform();
    ctx.globalCompositeOperation = oldGCO;
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Number} x 
 * @param {Number} y 
 * @param {Number} fillValue 
 * @param {Number} fillMax 
 * @param {Number} fillColor 
 */
async function drawSegmentedBar(ctx, x, y, fillValue, fillMax, fillColor) {
    const segmentHeight = 6;
    const segmentSlicesX = {
        left: 0,
        middle: 8,
        right: 19,
    };
    const segmentSlicesW = {
        left: 8,
        middle: 11,
        right: 6,
    };
    const segmentBorder = await loadImage('/assets/textures/potion-bar.png');
    const segmentFill = await loadImage('assets/textures/potion-fill.png');

    ctx.transform(1, 0, 0, 1, x, y);

    let currentX = -segmentSlicesW.right;
    ctx.drawImage(segmentBorder,
        segmentSlicesX.right, 0, segmentSlicesW.right, segmentHeight,
        currentX, 0, segmentSlicesW.right, segmentHeight
    );

    for (let i = 0; i < fillMax; i++) {
        currentX -= segmentSlicesW.middle;
        ctx.drawImage(segmentBorder,
            segmentSlicesX.middle, 0, segmentSlicesW.middle, segmentHeight,
            currentX, 0, segmentSlicesW.middle, segmentHeight
        );

        if (fillValue >= fillMax - i) {
            const oldTransform = ctx.getTransform();
            ctx.transform(1, 0, -1, 1, -y, 0);
            ctx.fillStyle = fillColor;
            ctx.fillRect(currentX + 13, 1, segmentSlicesW.middle - 2, 3);
            ctx.setTransform(oldTransform);

            const oldGCO = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = barColorBlend;
            ctx.drawImage(segmentFill,
                0, 0, 11, segmentHeight,
                currentX, 0, segmentSlicesW.middle, segmentHeight
            );

            ctx.globalCompositeOperation = oldGCO;
        }
    }

    currentX -= segmentSlicesW.left;
    ctx.drawImage(segmentBorder,
        segmentSlicesX.left, 0, segmentSlicesW.left, segmentHeight,
        currentX, 0, segmentSlicesW.left, segmentHeight
    );

    ctx.resetTransform();
}

// Misc

function fixCenterText() {
    let centerTexts = document.getElementsByClassName("center-text");
    for (let t of centerTexts) {
        t.style.paddingLeft = "0";
        let text = t.TEXT_NODE
        let l = t.getBoundingClientRect().left;
        if (l % 1) {
            t.style.paddingLeft = "1px";
        }
    }
}
document.onload = () => {
    fixCenterText();
};
