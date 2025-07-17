export class SessionCharacter {
    static baseHP = 10;
    static baseMP = 10;
    static baseStrength = 5;
    static baseMagic = 5;
    static baseDefense = 5;
    static baseResistance = 5;
    static maxHPPotions = 3;
    static maxMPPotions = 3;

    /**
     * 
     * @param {object} serverCharacter
     */
    constructor(serverCharacter) {
        this.full = serverCharacter.full;
        this.currentHP = serverCharacter.currentHP;
        this.hpPotions = serverCharacter.hpPotions;
        this.currentMP = serverCharacter.currentMP;
        this.mpPotions = serverCharacter.mpPotions;
        this.equippedClass = serverCharacter.equippedClass;
        this.buffs = serverCharacter.buffs;
        this.tempStats = serverCharacter.tempStats;
    }

    /** @type {Character} */
    full;

    /** @type {number} */
    get maxHP() {
        return Math.max(5, SessionCharacter.baseHP +
            this.specialtyClass.hp +
            (this.equippedClass == null ? 0 : this.equippedClass.hp)) +
            (this.tempStats["maxHP"] ?? 0);
    }
    /** @type {number} */
    get maxMP() {
        return Math.max(5, SessionCharacter.baseMP +
            this.full.specialtyClass.mp +
            (this.equippedClass == null ? 0 : this.equippedClass.mp)) +
            (this.tempStats["maxMP"] ?? 0);
    }
    /** @type {number} */
    get strength() {
        return Math.max(0, SessionCharacter.baseStrength +
            this.full.specialtyClass.strength +
            (this.equippedClass == null ? 0 : this.equippedClass.strength)) +
            (this.tempStats["str"] ?? 0);
    }
    /** @type {number} */
    get magic() {
        return Math.max(0, SessionCharacter.baseMagic +
            this.full.specialtyClass.magic +
            (this.equippedClass == null ? 0 : this.equippedClass.magic)) +
            (this.tempStats["mag"] ?? 0);
    }
    /** @type {number} */
    get defense() {
        return Math.max(0, SessionCharacter.baseDefense +
            this.full.specialtyClass.defense +
            (this.equippedClass == null ? 0 : this.equippedClass.defense)) +
            (this.tempStats["def"] ?? 0);
    }
    /** @type {number} */
    get resistance() {
        return Math.max(0, SessionCharacter.baseResistance +
            this.full.specialtyClass.resistance +
            (this.equippedClass == null ? 0 : this.equippedClass.resistance)) +
            (this.tempStats["res"] ?? 0);
    }

    /** @type {string} */
    get name() { return this.full.name; }
    /** @type {PronounList} */
    get pronouns() { return this.full.pronouns; }
    /** @type {string} */
    get species() { return this.full.species; }
    /** @type {string} */
    get player() { return this.full.player; }
    /** @type {string} */
    get image() { return this.full.image; }
    /** @type {JobClass} */
    get specialtyClass() { return this.full.specialtyClass; }

    /** @type {number} */
    currentHP;
    /** @type {number} */
    hpPotions;
    /** @type {number} */
    currentMP;
    /** @type {number} */
    mpPotions;
    /** @type {JobClass} */
    equippedClass = null;
    /** @type {{ [key: string]: Buff }} */
    buffs = {};

    /** @type {{ [id: string]: number }} */
    tempStats = {};

    toJSON() {
        return { ...this.full, ...this };
    }
}

class Buff {
    name = "";
    description = "";
    icon = "";
    turnsRemaining = 0;
}
