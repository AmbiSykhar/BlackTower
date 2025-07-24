import { messageCallbacks } from "/scripts/socket.js";

export let Jukebox = {
	/** @type {[string]: Song} */
	songs: {},

	async load(id) {
		let request = new Request(`/assets/music/${id}.json`);
		let response = await fetch(request);
		let song = new Song(await response.json());
		song.player = new Audio(`/assets/music/ogg/${song.filename}`);
		song.player.loop = true;
		this.songs[id] = song;
	},
	play(id) {
		this.nowPlaying = this.songs[id];
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
		this.filename = obj.filename;
		this.player = null;
	}

	title;
	original;
	source;
	filename;
	/** @type {HTMLAudioElement} */
	player;
}

messageCallbacks.music = {};

messageCallbacks.music.play = (data) => {
	if (Jukebox.songs[data.id] != null) {
		Jukebox.play(data.id);
		return;
	}
	Jukebox.load(data.id).then(() => Jukebox.play(data.id));
}
messageCallbacks.music.load = (data) => {
	Jukebox.load(data.id);
}
messageCallbacks.music.pause = Jukebox.pause;
