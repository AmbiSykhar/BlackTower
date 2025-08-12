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

async function initializePopup(template) {
	let html = await fetch(`/assets/popups/${template}.html`);
	dmPopup.innerHTML = await html.text();
	popupScript = await import(`/assets/popups/${template}.js`);
	popupScript.initialize();
}


async function promptStart() {
	initializePopup("start-session");
	dmPopup.showModal();
}


document.getElementById("start-session").addEventListener('click', promptStart);
document.getElementById("end-session").addEventListener('click', () => { sendConsoleCommand("session end"); });
