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


