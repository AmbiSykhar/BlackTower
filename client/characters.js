import { fixCenterText } from "/scripts/common.js";
import { connectingToServer, sendMessage, messageCallbacks } from "/scripts/socket.js";

const charactersElement = document.getElementById("characters");
const sheetTemplate = fetch("/assets/templates/character-sheet-full.html")
    .then(sheet => sheet.text());

const skillEntryTemplate = fetch("/assets/templates/skill-list-entry.html")
    .then(entry => entry.text());

let characterCallbacks = {};

function slugify(str) {
    return str.replace(/\s/g, "");
}

async function addFullSheet(charID) {
    let template = await sheetTemplate;
    let element = document.createElement("div");
    element.id = charID;
    element.innerHTML = template;
    charactersElement.append(element);
}

async function addSkillEntry(charID, skillID) {
    let template = await skillEntryTemplate;
    let element = document.createElement("div");
    element.className = "table-item";
    element.id = `${charID}-skills-${skillID}`;
    element.innerHTML = template.replace(/\{cID\}/g, charID).replace(/\{skillName\}/g, skillID);

    let skillList = document.querySelector(`#${charID} [data-update="specialtyClass-skills"]`);
    skillList.append(element);
    return element;
}

let characters = {};

function updateCharacter(c) {
    const cID = slugify(c.name);
    characters[cID] = c;

    for (let key in c) {
        if (typeof c[key] === "object") {
            for (let sub in c[key]) {
                if (sub == "skills") {
                    updateCharacterSkills(cID, c[key][sub]);
                    continue;
                }
                updateCharacterData(cID, `${key}-${sub}`, c[key][sub]);
            }
            continue;
        }
        updateCharacterData(cID, key, c[key]);
    }

    fixCenterText();
}

function updateCharacterData(cID, key, data) {
    let elems = document.querySelectorAll(`#${cID} [data-update="${key}"]`);
    if (elems.length < 1)
        return;

    for (let elem of elems) {
        if (elem?.tagName == "IMG") {
            elem.srcset = data;
            elem.alt = cID;
            continue;
        }
        if (elem.getAttribute("data-stat") == "relative") {
            if (data > 0) {
                data = `+${data}`;
                elem.classList.add("positive");
            }
            if (data < 0) {
                elem.classList.add("negative");
            }
            if (data == 0) {
                data = `±${data}`;
                elem.classList.add("zero");
            }
        }

        elem.textContent = data;
    }
}

async function updateCharacterSkills(cID, data) {
    for (let skill of data) {
        const skillID = slugify(skill.name);
        let elem = document.getElementById(`${cID}-skills-${skillID}`);
        if (elem === null) {
            await addSkillEntry(cID, skillID);
        }
        for (let key in skill) {
            updateCharacterData(`${cID}-skills-${skillID}`, `skill-${key}`, skill[key]);
        }
    }
}

connectingToServer.then(() => {
    sendMessage("character", "chardata");
});

function handleCharacterMessage(msg) {
    characterCallbacks[msg.type]?.(msg)
}

function addAllCharacters(msg) {
    msg.chars.forEach(async c => {
        if (!(c.name in characters)) {
            await addFullSheet(slugify(c.name));
        }
        updateCharacter(c);
    });
}
characterCallbacks["chardata"] = addAllCharacters;

function handleUpdateMessage(msg) {

}


messageCallbacks["character"] = characterCallbacks;
