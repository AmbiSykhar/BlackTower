function toggleSidebar(el) {
	let p = el.parentElement;

	if (p.classList.contains("collapsed")) {
		p.classList.remove("collapsed");
	}
	else {
		p.classList.add("collapsed");
	}
}

// DM sidebar


