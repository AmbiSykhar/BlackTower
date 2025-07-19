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

export function slugify(str) {
    return str.replace(/\s/g, "");
}

export function getRandomNumber(min, max) {
    return (max - min) * Math.random() + min;
}

export function clamp(value, min, max) {
    return Math.max(Math.min(value, max), min);
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
