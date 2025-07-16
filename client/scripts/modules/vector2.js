"use strict";

export class Vector2 {
	/** @type {Number} */
	x;
	/** @type {Number} */
	y;

	/**
	 * @param {Number} x
	 * @param {Number} y 
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	/**
	 * @param {VectorHex} hex 
	 */
	static fromVectorHex(hex) {
		let x = hex.q;
		let y = hex.r + (hex.q - (hex.q & 1)) / 2;
		return new Vector2(x, y);
	}

	[Symbol.toPrimitive](hint) {
		if (hint === "string" || hint === "default")
			return `[Vector2 {${this.x},${this.y}}]`;

		return this.x * 1000000 + this.y;
	}
}
