import { Rect } from "/scripts/modules/rect.js";
import { Vector2 } from "/scripts/modules/vector2.js";
import { getRandomNumber } from "/scripts/common.js";

export class PlayerHUD {
	static size = new Vector2(92, 92);
	static barRectSize = new Vector2(65, 7);
	static hpBarOffset = new Vector2(22, 75);
	static mpBarOffset = new Vector2(26, 83);

	/** @type {SessionCharacter} */
	player;

	/** @type {Vector2} */
	basePosition;

	/** @type {Vector2} */
	get position() {
		return new Vector2(
			this.basePosition.x + this.positionOffset.x,
			this.basePosition.y + this.positionOffset.y,
		);
	}

	/** @type {Vector2} */
	positionOffset = Vector2.Zero;

	/** @type {string} */
	backgroundColor;

	/** @type {PlayerHUDBar} */
	hpBar;

	/** @type {PlayerHUDBar} */
	mpBar;

	get portrait() {
		return this.player.portrait;
	}

	get portraitName() {
		return this.player.portraitName;
	}

	get rect() {
		return new Rect(this.basePosition, PlayerHUD.size);
	}

	constructor(player, position) {
		this.player = player;
		this.basePosition = position;

		this.hpBar = new PlayerHUDBar('label', "#00cc00", "#88cc88", "#cc0000");
		this.mpBar = new PlayerHUDBar('label', "#00bbbb", "#88cc88", "#cc0000");
	}

	updatePlayer(newPlayer) {
		let oldPlayer = this.player;
		this.player = newPlayer;

		let hp = this.player.currentHP;
		let maxHP = this.player.maxHP;

		if (hp <= 0) {
			this.backgroundColor = "#444444";
		} else if (hp < maxHP / 3) {
			this.backgroundColor = "#880000";
		} else if (hp < maxHP * 2 / 3) {
			this.backgroundColor = "#aaaa00";
		} else {
			this.backgroundColor = "#008800";
		}

		if (this.hpBar.updatePlayer(oldPlayer.currentHP, hp, maxHP)) {
			this.backgroundColor = this.hpBar.delayColor;
		}
		this.mpBar.updatePlayer(oldPlayer.currentMP, this.player.currentMP, this.player.maxMP);
	}

	update(dt) {
		let hpTimerDone = this.hpBar.update(dt, this.player.currentHP);
		this.mpBar.update(dt, this.player.currentMP);

		let hp = this.player.currentHP;
		let maxHP = this.player.maxHP;
		let hpDelta = hp - (this.hpBar.delayValue ?? hp);
		if (hpTimerDone) {
			if (hp <= 0) {
				this.backgroundColor = "#444444";
			} else if (hp < maxHP / 3) {
				this.backgroundColor = "#880000";
			} else if (hp < maxHP * 2 / 3) {
				this.backgroundColor = "#aaaa00";
			} else {
				this.backgroundColor = "#008800";
			}
			this.positionOffset = Vector2.Zero;
		} else {
			if (hpDelta >= 0) {
				return;
			}

			if (-hpDelta < maxHP / 2) {
				this.positionOffset = new Vector2(getRandomNumber(-1, 1), 0);
			} else if (-hpDelta < maxHP) {
				this.positionOffset = new Vector2(getRandomNumber(-2, 2), getRandomNumber(-1, 1));
			} else {
				this.positionOffset = new Vector2(getRandomNumber(-3, 3), getRandomNumber(-2, 2));
			}
		}
	}
}

export class PlayerHUDBar {
	/** @type {string} */
	#delayPositiveColor;
	/** @type {string} */
	#delayNegativeColor;

	/** @type {string} Possible values: 'none', 'label', 'segment' */
	type;

	/** @type {string} */
	color;

	/** @type {number} */
	value;

	/** @type {number} */
	max;

	/** @type {number} */
	delayValue;

	/** @type {string} */
	delayColor;

	/** @type {number} */
	delayTimer;

	constructor(type, color, delayPositiveColor, delayNegativeColor) {
		this.type = type;
		this.color = color;
		this.#delayPositiveColor = delayPositiveColor;
		this.#delayNegativeColor = delayNegativeColor;
	}

	updatePlayer(oldValue, newValue, maxValue) {
		this.value = newValue;
		this.max = maxValue;

		if (oldValue == newValue) {
			return false;
		}

		this.delayValue = oldValue;
		this.delayTimer = 500;
		this.delayColor = oldValue < newValue ? this.#delayPositiveColor : this.#delayNegativeColor;

		return true;
	}

	update(dt, currentValue) {
		let valueDelta = currentValue - this.delayValue;

		if (Math.abs(valueDelta) <= 0.01) {
			return this.delayTimer <= 0;
		}

		if (this.delayTimer <= 0) {
			this.delayValue += (valueDelta > 0 ? 0.1 : -0.1);
			this.delayColor = valueDelta > 0 ? this.#delayPositiveColor : this.#delayNegativeColor;
			return true;
		}

		this.delayTimer -= dt;
		return false;
	}
}
