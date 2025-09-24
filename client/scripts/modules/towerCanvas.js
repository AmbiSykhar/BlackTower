import { Vector2 } from "/scripts/modules/vector2.js";
import { Rect } from "/scripts/modules/rect.js";
import { loadImage, clamp, mousePosition } from "/scripts/common.js";
import { PlayerHUD, PlayerHUDBar } from "/scripts/modules/playerHUD.js";

export class TowerCanvas {
	/** @type {HTMLCanvasElement} */
	#canvas = null;

	/** @type {HTMLCanvasElement} */
	get canvas() {
		return this.#canvas;
	}

	/** @type {CanvasRenderingContext2D} */
	#context = null;

	/** @type {CanvasRenderingContext2D} */
	get context() {
		return this.#context;
	}

	/** @type {Vector2} */
	#resolution = null;

	get resolution() {
		return this.#resolution;
	}
	/** @type {Vector2} */
	set resolution(vec2) {
		this.#resolution = vec2;
		this.#canvas.width = this.#resolution.x;
		this.#canvas.height = this.#resolution.y;
	}

	/**
	 * Creates a new TowerCanvas.
	 * @param {string} canvasID
	 * @param {Vector2} resolution
	 */
	constructor(canvasID, resolution) {
		this.#canvas = document.getElementById(canvasID);
		if (this.#canvas == null) {
			return;
		}

		this.#context = this.#canvas.getContext("2d");

		this.resolution = resolution;

		this.#context.imageSmoothingEnabled = false;
	}

	addClickListener(listener) {
		this.#canvas.addEventListener("click", listener);
	}

	/**
	 * Returns the position of the mouse within the canvas.
	 * @returns {Vector2 | null}
	 */
	getMousePosition() {
		let rect = this.#canvas.getBoundingClientRect();
		let scale = new Vector2(this.#resolution.x / rect.width, this.#resolution.y / rect.height);

		let imatrix = this.#context.getTransform().invertSelf();

		let pos = new Vector2(
			(mousePosition.x - rect.left) * scale.x,
			(mousePosition.y - rect.top) * scale.y
		);

		if (pos.x < 0 || pos.x > rect.width ||
			pos.y < 0 || pos.y > rect.height) {
			return null;
		}

		return new Vector2(
			pos.x * imatrix.a + pos.y * imatrix.c + imatrix.e,
			pos.x * imatrix.b + pos.y * imatrix.d + imatrix.f,
		);
	}

	/**
	 * Clears a rectangle section of the canvas.
	 * @param { Rect | Vector2[2] } args
	 */
	clearRect(...args) {
		let pos, size;
		if (args[0] instanceof Rect) {
			const rect = args.shift();
			pos = rect.position;
			size = rect.size;
		} else {
			pos = args.shift();
			size = args.shift();
		}

		this.#context.clearRect(pos.x, pos.y, size.x, size.y);
	}

	/**
	 * Clears the entire canvas.
	 */
	clear() {
		this.clearRect(Vector2.Zero, this.resolution);
	}

	/**
	 * Draws a rectangular box.
	 * @param  {Rect | Vector2[2]. number, string, string} args 
	 */
	drawBox(...args) {
		let pos, size;
		if (args[0] instanceof Rect) {
			const rect = args.shift();
			pos = rect.position;
			size = rect.size;
		} else {
			pos = args.shift();
			size = args.shift();
		}
		let borderThickness = args[0] ?? 1;
		let borderColor = args[1] ?? "white";
		let fillColor = args[2] ?? "transparent";

		this.#context.fillStyle = fillColor;
		this.#context.strokeStyle = borderColor;
		this.#context.lineWidth = borderThickness;
		this.#context.fillRect(pos.x, pos.y, size.x, size.y);
		this.#context.strokeRect(pos.x, pos.y, size.x, size.y);
	}

	/**
	 * Draws an image.
	 * @param {CanvasImageSource} image 
	 * @param {Vector2} position 
	 */
	drawImage(...args) {
		let image = args.shift();
		/** @type {Vector2} */
		let dPos, dSize, sPos, sSize;
		if (args[0] instanceof Rect) {
			const dRect = args.shift();
			dPos = dRect.position;
			dSize = dRect.size;

			if (args[0] instanceof Rect) {
				/** @type {Rect} */
				const sRect = args.shift();
				sPos = sRect.position;
				sSize = sRect.size;
				this.#context.drawImage(image, sPos.x, sPos.y, sSize.x, sSize.y, dPos.x, dPos.y, dSize.x, dSize.y);
				return;
			}
			this.#context.drawImage(image, dPos.x, dPos.y, dSize.x, dSize.y);
			return;
		}

		dPos = args.shift();

		if (args[0] instanceof Vector2) {
			dSize = args.shift();
			if (args[0] instanceof Vector2) {
				sPos = args.shift();
				sSize = args.shift();
				this.#context.drawImage(image, sPos.x, sPos.y, sSize.x, sSize.y, dPos.x, dPos.y, dSize.x, dSize.y);
				return;
			}
			this.#context.drawImage(image, dPos.x, dPos.y, dSize.x, dSize.y);
			return;
		}
		this.#context.drawImage(image, dPos.x, dPos.y);
	}


	// SMALL FONT

	#smallFont = new Promise((resolve) => {
		let image = new Image();
		image.onload = resolve.bind(resolve, image);
		image.src = '/assets/fonts/small-font.png';
	});

	/**
	 * 
	 * @param {Vector2} pos
	 * @param {string} str
	 */
	async writeSmall(pos, str) {
		const sfW = 5;
		const sfH = 9;

		let x = pos.x;
		str = str.toString();
		for (let i = 0; i < str.length; i++) {
			const cIndex = str[i].charCodeAt(0) - 32;

			let cx = (cIndex & 0xF) * sfW;
			let cy = (cIndex >> 4) * sfH;

			this.#context.drawImage(await this.#smallFont, cx, cy, sfW, sfH, x, pos.y, sfW, sfH);
			x += sfW;
		}
	}

	// Character List

	static #loadingProfilePortraitFrame = loadImage("/assets/textures/profile-portrait-frame.png");
	static #loadingProfileInfoFrame = loadImage("/assets/textures/profile-info-frame.png");
	static #loadingProfileClassFrame = loadImage("/assets/textures/profile-class-frame.png");
	static #loadingProfileIcons = {
		hp: loadImage("/assets/textures/profile-hp.png"),
		mp: loadImage("/assets/textures/profile-mp.png"),
		strength: loadImage("/assets/textures/profile-str.png"),
		magic: loadImage("/assets/textures/profile-mag.png"),
		defense: loadImage("/assets/textures/profile-def.png"),
		resistance: loadImage("/assets/textures/profile-res.png"),
	};
	static #profileIconPositions = {
		hp: new Vector2(92, 53),
		mp: new Vector2(126, 53),
		strength: new Vector2(96, 61),
		magic: new Vector2(130, 61),
		defense: new Vector2(100, 69),
		resistance: new Vector2(134, 69),
	}

	async drawPlayerProfile(player) {
		this.drawImage(await TowerCanvas.#loadingProfilePortraitFrame, Vector2.Zero);
		this.drawImage(await TowerCanvas.#loadingProfileInfoFrame, Vector2.Zero);
		this.drawImage(await TowerCanvas.#loadingProfileClassFrame, Vector2.Zero);
		if (player.portrait != null) {
			this.drawImage(player.portrait, Vector2.Zero);
		}
		if (player.portraitName != null) {
			this.drawImage(player.portraitName, Vector2.Zero);
		}
		if (player.profileInfo != null) {
			this.drawImage(player.profileInfo, Vector2.Zero);
		}
		if (player.profileClass != null) {
			this.drawImage(player.profileClass, Vector2.Zero);
		}

		for (const key in TowerCanvas.#loadingProfileIcons) {
			for (let i = 1; i < player.specialtyClass[key]; i++) {
				let x = TowerCanvas.#profileIconPositions[key].x + (5 * (i - 1));
				let y = TowerCanvas.#profileIconPositions[key].y;

				this.drawImage(await TowerCanvas.#loadingProfileIcons[key], new Vector2(x, y));
			}
		}
	}

	// HUD Elements

	static #loadingPortraitFrame = loadImage("/assets/textures/portrait-frame.png");
	static #loadingPortraitBackground = loadImage("/assets/textures/portrait-background.png");

	/**
	 * 
	 * @param {PlayerHUD} hud 
	 */
	async drawPlayerHUD(hud) {
		this.drawImage(await TowerCanvas.#loadingPortraitFrame, hud.position);

		this.drawImage(await TowerCanvas.#loadingPortraitBackground, hud.position);

		const gco = this.#context.globalCompositeOperation;
		const tf = this.#context.getTransform();

		this.#context.globalCompositeOperation = "overlay";
		this.#context.transform(1, 0, 0.5, 1, hud.position.x + 2, hud.position.y + 33);
		this.drawBox(Vector2.Zero, new Vector2(59, 42), 0, "transparent", hud.backgroundColor);

		this.#context.setTransform(tf);
		this.#context.globalCompositeOperation = gco;

		// TODO: Background color
		if (hud.portrait != null) {
			this.drawImage(hud.portrait, hud.position);
		}
		if (hud.portraitName != null) {
			this.drawImage(hud.portraitName, hud.position);
		}

		this.drawHUDBar(hud.hpBar, new Vector2(hud.position.x + 24, hud.position.y + 75));
		this.drawHUDBar(hud.mpBar, new Vector2(hud.position.x + 28, hud.position.y + 83));

		// draw numbers after both bars to get the proper layering
		let numHP = `${' '.repeat(3 - hud.player.currentHP.toString().length)}${hud.player.currentHP}/${' '.repeat(3 - hud.player.maxHP.toString().length)}${hud.player.maxHP}`;
		let numMP = `${' '.repeat(3 - hud.player.currentMP.toString().length)}${hud.player.currentMP}/${' '.repeat(3 - hud.player.maxMP.toString().length)}${hud.player.maxMP}`;
		this.writeSmall(new Vector2(hud.position.x + 45, hud.position.y + 77), numHP);
		this.writeSmall(new Vector2(hud.position.x + 49, hud.position.y + 85), numMP);
	}
	static #loadingBarFillTextures = {
		none: loadImage("assets/textures/bar-fill-none.png"),
		label: loadImage("assets/textures/bar-fill-label.png"),
		segment: loadImage("assets/textures/bar-fill-segment.png"),
	};

	/**
	 * 
	 * @param {PlayerHUDBar} bar
	 * @param {Vector2} pos
	 */
	async drawHUDBar(bar, pos) {
		let delayValue = bar.delayValue ?? bar.value;
		let rowOffsets;
		switch (bar.type) {
			case 'label':
				rowOffsets = [5, 5, 5, 4, 2, 2, 3];
				break;
			case 'segment':
				rowOffsets = [20, 21, 21, 4, 2, 2, 3];
				break;
			default:
				rowOffsets = [0, 0, 1, 1, 2, 2, 3];
		}


		// apply texture
		this.drawImage(await TowerCanvas.#loadingBarFillTextures[bar.type], pos);

		// apply color
		const gco = this.#context.globalCompositeOperation;

		// normal fill
		const p = bar.value / bar.max;
		const dp = delayValue / bar.max;

		const fill = 61 * Math.min(p, dp);
		const delayFill = 61 * Math.max(p, dp);


		for (let i = 0; i < 7; i++) {
			const start = rowOffsets[i];

			const fullX = 58 + i / 2;
			const fillX = clamp(fill, start, fullX);
			const delayX = clamp(delayFill, fillX, fullX);

			// fill
			if (fillX > start) {
				this.#context.fillStyle = bar.color;
				this.#context.globalCompositeOperation = "overlay";
				this.#context.fillRect(pos.x + start, pos.y + i, fillX - start, 1);
			}

			// delay
			if (delayX > fillX) {
				this.#context.fillStyle = bar.delayColor;
				this.#context.globalCompositeOperation = "source-over";
				this.#context.fillRect(pos.x + fillX, pos.y + i, delayX - fillX, 1);
			}

			// empty
			if (fullX > delayX) {
				this.#context.globalCompositeOperation = "source-over";
				this.#context.fillStyle = "#494949";
				this.#context.fillRect(pos.x + delayX, pos.y + i, fullX - delayX, 1);
			}
		}
		this.#context.globalCompositeOperation = gco;
	}
}
