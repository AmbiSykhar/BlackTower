"use strict";

export class VectorHex {
	/** @type {Number} west -> east */
	q = null;
	/** @type {Number} northeast -> southwest */
	r = null;
	/** @type {Number} southeast -> northwest */
	s = null;

	/**
	 * @param {Number} q
	 * @param {Number} r
	 * @param {Number} s
	 */
	constructor(q, r, s = null) {
		this.q = q;
		this.r = r;
		this.s = s ?? (-q - r);
		if ((this.q ?? 0) + (this.r ?? 0) + (this.s ?? 0) != 0)
			console.log(`Hex coordinate (${q}, ${r}, ${s}) has wrong sum!`);
	}

	/**
	 * @param {Vector2} vec2 
	 */
	static fromVector2(vec2) {
		let q = vec2.x;
		let r = vec2.y - (vec2.x - (vec2.x & 1)) / 2;
		let s = -this.q - this.r;
		return new VectorHex(q, r, s);
	}

	calculateMissing() {
		this.q = this.q ?? -this.r - this.s;
		this.r = this.r ?? -this.q - this.s;
		this.s = this.s ?? -this.q - this.r;
	}

	getNeighbor(dir) {
		return add(this, HexDirectionVectors[dir]);
	}

	round() {
		let q = Math.round(this.q);
		let r = Math.round(this.r);
		let s = Math.round(this.s);

		let q_diff = Math.abs(q - this.q);
		let r_diff = Math.abs(r - this.r);
		let s_diff = Math.abs(s - this.s);

		if (q_diff > r_diff && q_diff > s_diff) {
			q = -r - s;
		}
		else if (r_diff > s_diff) {
			r = - q - s;
		}
		else {
			s = - q - r;
		}
		this.q = q;
		this.r = r;
		this.s = s;

		return this;
	}

	static add(hex1, hex2) {
		return new VectorHex(hex1.q + hex2.q, hex1.r + hex2.r, hex1.s + hex2.s);
	}

	static equals(hex1, hex2) {
		if (hex1 === null || hex2 === null)
			return hex1 === hex2;
		return hex1.q == hex2.q && hex1.r == hex2.r && hex1.s == hex2.s;
	}

	[Symbol.toPrimitive](hint) {
		if (hint === "string" || hint === "default")
			return `[VectorHex {${this.q},${this.r},${this.s}}]`;

		return this.q * 1000000 + this.r * 1000 + this.s;
	}
}

export const HexDirections = {
	no: 0,
	nw: 1,
	sw: 2,
	so: 3,
	se: 4,
	ne: 5,
}

export const HexDirectionVectors = [
	new VectorHex(0, -1, -1), new VectorHex(+1, -1, 0), new VectorHex(+1, 0, -1),
	new VectorHex(+1, 0, -1), new VectorHex(-1, +1, 0), new VectorHex(-1, 0, +1),
];
