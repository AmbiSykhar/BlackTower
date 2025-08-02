import { sendMessage, messageCallbacks } from "/scripts/socket.js";

export let Jukebox = {
	/** @type {[string]: Song} */
	songs: {},

	async load(id) {
		let request = new Request(`/assets/music/${id}.json`);
		let response = await fetch(request);
		let song = new Song(await response.json());
		for (const section of song.sections) {
			section.player = new Audio(`/assets/music/ogg/${section.filename}`);

			let loop = section.player.loop = (section.loop ?? false);
			if (!loop) {
				section.player.addEventListener("play", () => {
					if (!song.next()) {
						this.stop();
					}
				});
			}
			section.player.preload = "auto";
			section.player.load();
		}
		this.songs[id] = song;
	},
	play(id, section) {
		this.nowPlaying = this.songs[id];
		this.nowPlaying.sectionIndex = section ?? 0;
		this.nowPlaying.player.play()
			.catch((error) => {
				console.error(error);
				let dialog = document.getElementById("jukebox-allow");
				dialog.showModal();
				let button = document.getElementById("jukebox-play");
				button.addEventListener("click", () => {
					dialog.close();
					this.nowPlaying.player.play();
				});
			});
		this.update();
	},
	next() {
		if (this.nowPlaying == null) {
			return;
		}
		this.nowPlaying.next();
	},
	pause() {
		let p = this.nowPlaying.player;

		if (p.paused) {
			p.play();
		} else {
			p.pause();
		}
	},
	stop() {
		this.nowPlaying.player.pause();
		this.nowPlaying.player.currentTime = 0;
		this.nowPlaying = null;
		this.update();
	},
	update() {
		let root = document.querySelector(":root");
		let jukebar = document.getElementById("jukebar");

		let title = document.getElementById("jukebar-title");
		let sub = document.getElementById("jukebar-sub");

		let subtitleStr = null;
		if (this.nowPlaying != null) {
			if (this.nowPlaying.original == null || this.nowPlaying.original == this.nowPlaying.title) {
				subtitleStr = this.nowPlaying.source;
			}
			else {
				subtitleStr = `${this.nowPlaying.original} - ${this.nowPlaying.source}`;
			}
		}

		title.innerText = this.nowPlaying?.title ?? "N/A";
		sub.innerText = subtitleStr ?? "N/A";

		requestAnimationFrame(() => {
			this.width = Math.max(title.offsetWidth, sub.offsetWidth) + 8;

			jukebar.style.transition = "none";
			root.style.setProperty("--jukebar-width", `${Jukebox.width}px`);
			requestAnimationFrame(() => {
				jukebar.style.transition = '';

				if (this.nowPlaying == null) return;

				jukebar.classList.remove("collapsed");
				setTimeout(() => {
					jukebar.classList.add("collapsed");
				}, 3000);
			});
		});
	},

	/** @type {Song | null} */
	nowPlaying: null,

	width: 0
}

export class Song {
	constructor(obj) {
		this.title = obj.title;
		this.original = obj.original;
		this.source = obj.source;
		this.sectionIndex = 0;

		if (obj.filename != undefined) {
			this.sections = [{
				filename: obj.filename,
				loop: obj.loop ?? false,
			}];
		} else if (obj.sections != undefined) {
			this.sections = obj.sections;
		} else {
			console.error(`Song '${obj.title}' does not include files!`);
		}
	}

	/** @type {string} */
	title;

	/** @type {string} */
	original;

	/** @type {string} */
	source;

	/** @type {Section[]} */
	sections = [];

	/** @type {HTMLAudioElement} */
	get player() {
		return this.sections[this.sectionIndex].player;
	};

	next() {
		if (this.sectionIndex + 1 >= this.sections.length) {
			return false;
		}

		this.player.loop = false;
		this.player.addEventListener("ended", () => {
			this.sections[++this.sectionIndex].player.play();
		});

		sendMessage('music', 'next');

		return true;
	}

	reset() {
		this.sectionIndex = 0;
		for (const s of this.sections) {
			s.player.currentTime = 0;
			s.player.loop = s.loop;
		}
	}

	/** @type {number} */
	sectionIndex;
}

class Section {
	/** @type {string} */
	filename;

	/** @type {boolean} */
	loop;

	/** @type {HTMLAudioElement} */
	player;
}

messageCallbacks.music = {};

messageCallbacks.music.play = (data) => {
	if (Jukebox.songs[data.id] != null) {
		Jukebox.play(data.id, data.section);
		return;
	}
	Jukebox.load(data.id).then(() => Jukebox.play(data.id, data.section));
}
messageCallbacks.music.load = (data) => {
	Jukebox.load(data.id);
}
messageCallbacks.music.next = () => Jukebox.next();
messageCallbacks.music.pause = () => Jukebox.pause();
messageCallbacks.music.stop = () => Jukebox.stop();
