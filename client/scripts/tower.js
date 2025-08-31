import { sendConsoleCommand } from "/scripts/console.js";
import { Jukebox } from "/scripts/jukebox.js";

export function toggleSidebar(e) {
	let p = e.target.parentElement;

	if (p.classList.contains("collapsed")) {
		p.classList.remove("collapsed");
	}
	else {
		p.classList.add("collapsed");
	}
}

let sidebarTabs = document.getElementsByClassName("sidebar-tab");
for (let tab of sidebarTabs) {
	tab.addEventListener('click', toggleSidebar);
}

let juketab = document.getElementById("juketab");
juketab.addEventListener('click', toggleSidebar)

Jukebox.update();

// DM sidebar

/** @type {HTMLDialogElement} */
let dmPopup = document.getElementById("dm-popup");

let popupScript = null;

export async function initializePopup(template, ...args) {
	let html = await fetch(`/assets/popups/${template}.html`);
	dmPopup.innerHTML = await html.text();
	popupScript = await import(`/assets/popups/${template}.js`);
	popupScript.initialize(...args);
	dmPopup.showModal();
}

function initializeDMButton(id, action) {
	if (action === "popup") {
		action = () => { initializePopup(id); };
	}

	document.getElementById(id).addEventListener('click', action);
}

initializeDMButton("start-session", "popup");
initializeDMButton("end-session", () => { sendConsoleCommand("session end"); });
initializeDMButton("queue-music", "popup");
initializeDMButton("play-music", "popup");
initializeDMButton("pause-music", () => { sendConsoleCommand("music pause"); });
initializeDMButton("stop-music", () => { sendConsoleCommand("music stop"); });
