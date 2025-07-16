class TowerCanvas {
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
	 * 
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
	 * 
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
	 * 
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

	clear() {
		this.clearRect(new Vector2(0, 0), this.resolution);
	}

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

	drawImage(image, position) {
		this.#context.drawImage(image, position.x, position.y)
	}


	// SMALL FONT

	#smallFont = new Promise((resolve) => {
		let image = new Image();
		image.onload = resolve.bind(resolve, image);
		image.src = '/assets/fonts/small-font.png';
	});

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {string} str
	 */
	writeSmall(x, y, str) {
		const sfWidth = 5;
		const sfHeight = 9;

		let xx = x;
		str = str.toString();
		for (let i = 0; i < str.length; i++) {
			const c = str[i];
			const cIndex = c.charCodeAt(0) - 32;

			let charX = (cIndex & 0xF) * sfWidth;
			let charY = (cIndex >> 4) * sfHeight;

			this.#context.drawImage(this.#smallFont, charX, charY, sfWidth, sfHeight, xx, y, sfWidth, sfHeight);
			xx += sfWidth;
		}
	}
}
