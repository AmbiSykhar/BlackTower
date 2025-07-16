"use strict";

import { Vector2 } from "/scripts/modules/vector2.js";
import { messageCallbacks } from "/scripts/socket.js";

if (localStorage.lightning === undefined) localStorage.lightning = true; // default true
if (localStorage.rain === undefined) localStorage.rain = true; // default true

export let loadingNavbar = null;
if (document.getElementById("navbar") !== null) {
    loadingNavbar = fetch("/assets/templates/navbar.html")
        .then(data => { return data.text(); })
        .then(data => { document.getElementById("navbar").innerHTML = data; })
        .then(updateViewElement);
}

// General Utilities


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
export function getMousePosInCanvas(canvas, ctx) {
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

export function getRandomNumber(min, max) {
    return (max - min) * Math.random() + min;
}

export function loadImage(path) {
    return new Promise(resolve => {
        let image = new Image();
        image.onload = resolve.bind(resolve, image);
        image.src = path;
    });
}

function refresh() {
    localStorage.setItem("refreshing", true);
    window.location.reload();
}
messageCallbacks.system["refresh"] = refresh;

let viewCount = 0;
function updateViewCount(msg) {
    viewCount = msg.count;
    updateViewElement();
}
messageCallbacks.system["viewers"] = updateViewCount;

function updateViewElement() {
    let viewCounter = document.getElementById("view-count");
    if (!viewCounter)
        return;
    viewCounter.innerText = `Viewing: ${viewCount}`;
}

// Black Tower Utilities


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

export function fixCenterText() {
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
