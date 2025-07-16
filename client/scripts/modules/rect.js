"use strict";

class Rect {
	/** @type {Vector2} */
	position;

	/** @type {Vector2} */
	size;

	/** @type {number} */
	get left() {
		return this.position.x;
	}

	/** @type {number} */
	get right() {
		return this.position.x + this.size.x;
	}

	/** @type {number} */
	get top() {
		return this.position.y;
	}

	/** @type {number} */
	get bottom() {
		return this.position.y + this.size.y;
	}

	/**
	 * 
	 * @param {Vector2} point
	 * 
	 * @returns {boolean}
	 */
	contains(point) {
		return point.x >= this.left && point.x <= this.right &&
			point.y >= this.top && point.y <= this.bottom;
	}
}
