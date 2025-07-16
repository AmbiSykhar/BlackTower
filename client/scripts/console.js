import { messageCallbacks } from "/scripts/socket.js";
import { Cookies } from "/scripts/modules/cookies.js";

let consoleOpen = false;
let consoleBuffer = "";
let consolePreCursor = "";
let consolePostCursor = "";
document.addEventListener('keydown', (event) => {
    if (!consoleOpen) {
        switch (event.key) {
            case "`":
                toggleConsole();
                break;
            case "\\":
                if (!dmUnlocked)
                    break;
                toggleDMMode();
                break;
        }
        return;
    }

    switch (event.key) {
        case "Enter":
            consoleBuffer = `${consolePreCursor}${consolePostCursor}`.trim();
            if (consoleBuffer != "") {
                console.log(`Sending command: '${consoleBuffer}'`);
                sendConsoleCommand(consoleBuffer);
            }
        case "Escape":
            toggleConsole();
            break;
        case "Backspace":
            if (consolePreCursor == "")
                break;

            consolePreCursor = consolePreCursor.substring(0, consolePreCursor.length - 1);
            consoleBuffer = `${consolePreCursor}|${consolePostCursor}`;
            document.getElementById("console-input").innerText = `> ${consoleBuffer}`;
            break;
        case "Delete":
            if (consolePostCursor == "")
                break;

            consolePostCursor = consolePostCursor.substring(1, consolePreCursor.length);
            consoleBuffer = `${consolePreCursor}|${consolePostCursor}`;
            document.getElementById("console-input").innerText = `> ${consoleBuffer}`;
            break;
        case "Tab":
            break;
        case "ArrowLeft":
            if (consolePreCursor == "")
                break;

            consolePostCursor = consolePreCursor.charAt(consolePreCursor.length - 1) + consolePostCursor;
            consolePreCursor = consolePreCursor.substring(0, consolePreCursor.length - 1);
            consoleBuffer = `${consolePreCursor}|${consolePostCursor}`;
            document.getElementById("console-input").innerText = `> ${consoleBuffer}`;
            break;
        case "ArrowRight":
            if (consolePostCursor == "")
                break;

            consolePreCursor = consolePreCursor + consolePostCursor.charAt(0);
            consolePostCursor = consolePostCursor.substring(1, consolePostCursor.length);
            consoleBuffer = `${consolePreCursor}|${consolePostCursor}`;
            document.getElementById("console-input").innerText = `> ${consoleBuffer}`;
            break;

        default:
            if (event.key.length > 1)
                break;

            consolePreCursor += event.key;
            consoleBuffer = `${consolePreCursor}|${consolePostCursor}`;

            document.getElementById("console-input").innerText = `> ${consoleBuffer}`;
    }
    event.preventDefault();
});

const consoleElement = document.getElementById("console");
const consoleInputElement = document.getElementById("console-input");
let consoleFading = false;
function toggleConsole() {
    if (consoleOpen) {
        consoleOpen = false;
        for (let l of consoleElement.children) {
            l.classList.add("hidden");
        }
        consoleInputElement.classList.add("hidden");
        consoleInputElement.innerText = "";
        consoleBuffer = "";
        consolePreCursor = "";
        consolePostCursor = "";
        return;
    }

    consoleOpen = true;
    consoleFading = false;
    for (let l of consoleElement.children) {
        l.classList.remove("console-fade");
        l.classList.remove("hidden");
    }
    consoleInputElement.classList.remove("hidden");
    consoleInputElement.innerText = "> |";
}

let dmToken = "";
let dmUnlocked = false;
let dmMode = false;
function unlockDMMode(msg) {
    dmToken = msg.token;
    dmUnlocked = true;
    Cookies.set("dm_token", dmToken);
    toggleDMMode(true);
}
messageCallbacks.system["dm"] = unlockDMMode;

function removeDMToken() {
    Cookies.delete("dm_token");
    dmMode = false;
    dmUnlocked = false;
    dmToken = "";
    toggleDMMode(false);
}
messageCallbacks.system["nodm"] = removeDMToken;

function toggleDMMode(value = null) {
    if (value != null)
        dmMode = !value;
    dmMode = !dmMode;

    let color = "text";
    if (dmUnlocked) {
        color = dmMode ? "accent" : "main";
    }
    let navHeader = document.getElementById("navbar-header");
    if (navHeader)
        navHeader.style.color = `var(--${color}-color)`;

    if (dmMode)
        document.body.classList.add("dm-mode");
    else
        document.body.classList.remove("dm-mode");
}

/**
 * 
 * @param {string} str 
 */
function sendConsoleCommand(str) {
    let space = str.indexOf(" ");
    if (space == -1) {
        sendMessage("console", str);
        return;
    }
    let command = str.substring(0, space).trim();
    let args = str.substring(space, str.length).trim();
    let dm = Cookies.get("dm_token") ?? "";
    sendMessage("console", command, { args: args, dm: dm });
}

let consoleCallbacks = {};
function handleConsoleMessage(msg) {
    consoleCallbacks[msg.type]?.(msg);
}
messageCallbacks["console"] = consoleCallbacks;

function handleLog(msg) {
    let logLine = document.createElement("div");
    logLine.classList.add("console-log", "console-fade");
    logLine.innerText = msg.str;
    consoleElement.appendChild(logLine);
    consoleFading = true;
    setTimeout(hideConsoleLog, 6500, logLine);

    if (consoleElement.childElementCount > 8) {
        consoleElement.removeChild(consoleElement.firstChild);
    }

};
consoleCallbacks["log"] = handleLog;

function hideConsoleLog(line) {
    if (!consoleFading)
        return;

    line.classList.add("hidden");
    line.classList.remove("console-fade");
    consoleFading = false;
}
