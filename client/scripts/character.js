export class Character {
    static baseHP = 10;
    static baseMP = 10;
    static baseStrength = 5;
    static baseMagic = 5;
    static baseDefense = 5;
    static baseResistance = 5;

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

