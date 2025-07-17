import { Vector2 } from "/scripts/modules/vector2.js";
import { Rect } from "/scripts/modules/rect.js";
import { loadImage } from "/scripts/common.js";

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

		if (pos.x < rect.left || pos.x > rect.right ||
			pos.y < rect.top || pos.y > rect.bottom) {
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
		this.clearRect(new Vector2(0, 0), this.resolution);
	}

	/**
	 * Draws a rectangular box.
	 * @param  {Rect | Vector2[2]} args 
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


	// HUD Elements

	static #loadingPortraitFrame = loadImage("/assets/textures/portrait-frame.png");
	static #loadingPortraitBackground = loadImage("/assets/textures/portrait-background.png");

	async drawPlayerHUD(character, pos) {
		let loadingPortrait = loadImage(`/assets/images/${character.name}/portrait.png`);
		let loadingPortraitName = loadImage(`/assets/images/${character.name}/name.png`);

		this.drawImage(await TowerCanvas.#loadingPortraitFrame, pos);
		this.drawImage(await TowerCanvas.#loadingPortraitBackground, pos);
		// TODO: Background color
		try {
			this.drawImage(await loadingPortrait, pos);
		} catch {
			console.error(`Cannot find portrait for character '${character.name}'!`);
		}
		try {
			this.drawImage(await loadingPortraitName, new Vector2(0, 0));
		} catch {
			console.error(`Cannot find portrait name for character '${character.name}'!`);
		}

		this.drawHUDBar('label', new Vector2(pos.x + 24, pos.y + 75), "#00cc00", character.currentHP, character.maxHP);
		this.drawHUDBar('label', new Vector2(pos.x + 28, pos.y + 83), "#00bbbb", character.currentMP, character.maxMP);

		let numHP = `${' '.repeat(3 - character.currentHP.toString().length)}${character.currentHP}/${' '.repeat(3 - character.maxHP.toString().length)}${character.maxHP}`;
		let numMP = `${' '.repeat(3 - character.currentMP.toString().length)}${character.currentMP}/${' '.repeat(3 - character.maxMP.toString().length)}${character.maxMP}`;
		this.writeSmall(new Vector2(pos.x + 45, pos.y + 77), numHP);
		this.writeSmall(new Vector2(pos.x + 49, pos.y + 85), numMP);
	}
	static #loadingBarFillTextures = {
		none: loadImage("assets/textures/bar-fill-none.png"),
		label: loadImage("assets/textures/bar-fill-label.png"),
		segment: loadImage("assets/textures/bar-fill-segment.png"),
	};

	/**
	 * 
	 * @param {string} type Possible values: 'none', 'label', 'segment'
	 * @param {Vector2} pos 
	 * @param {string} color 
	 * @param {number} value 
	 * @param {number} max 
	 */
	async drawHUDBar(type, pos, color, value, max) {
		let rowOffsets;
		switch (type) {
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
		this.drawImage(await TowerCanvas.#loadingBarFillTextures[type], pos);

		// apply color
		const gco = this.#context.globalCompositeOperation;

		const p = value / max;
		const fill = 59 * p;
		for (let i = 0; i < 7; i++) {
			const start = rowOffsets[i];

			const f = 59 - start + i / 2 + 0.5;
			const w = fill - start + i / 2 + 0.5;

			// fill
			if (w > 0) {
				this.#context.fillStyle = color;
				this.#context.globalCompositeOperation = "overlay";
				this.#context.fillRect(pos.x + start, pos.y + i, w, 1);
			}

			// empty
			if (f - w > 0) {
				this.#context.globalCompositeOperation = "source-over";
				this.#context.fillStyle = "#494949";
				this.#context.fillRect(pos.x + start + w, pos.y + i, f - w, 1);
			}
		}
		this.#context.globalCompositeOperation = gco;
	}
}
