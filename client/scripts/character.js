class PronounList {
    subject = "they";
    object = "them";
    possessiveSubject = "their";
    possessiveObject = "theirs";
    reflexive = "themself";
}

class Skill {
    name = "";
    description = "";
    mpCost = 0;
}

class JobClass {
    name = "";
    description = "";
    hp = 0;
    mp = 0;
    strength = 0;
    magic = 0;
    defense = 0;
    resistance = 0;
    skills = [];
}

class Character {
    static get baseHP() {
        return 10;
    }
    static get baseMP() {
        return 10;
    }
    static get baseStrength() {
        return 5;
    }
    static get baseMagic() {
        return 5;
    }
    static get baseDefense() {
        return 5;
    }
    static get baseResistance() {
        return 5;
    }

    name = "";
    pronouns = new PronounList();
    species = "";
    player = "";
    biography = "";
    image = "";
    runsWon = 0;
    runsPlayed = 0;
    specialtyClass = new JobClass();

    portrait = null;
    portraitName = null;
}
