import 'dotenv/config';

import connect from 'connect';
import fs from 'node:fs/promises';
import http from 'node:http';
import { minify } from 'csso';
import serveStatic from 'serve-static';
import { WebSocket, WebSocketServer } from 'ws';

import { Character, JobClass, JobClasses, PronounList } from 'types/character';
import { SessionCharacter, Buff, Gem } from 'types/session-character';
import { Session } from 'types/session';

const startTime = Date.now();

interface Indexable {
    [key: string]: any;
}

function getHashCode(str: string) {
    var hash = 0,
        i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
const dmToken = getHashCode(process.env.DM_PASSWORD!);

let ipLogFile: fs.FileHandle;
(async function () {
    await fs.rename("../logs/ips.log", "../logs/ips-old.log").catch(() => null);
    await fs.mkdir("../logs/").catch(() => null);
    ipLogFile = await fs.open("../logs/ips.log", 'a');

})();

const app = connect();

//TODO: TEMPORARY move this later! do this better! this is good enough for now
app.use("/m1", async (req, res, next) => {
    res.end(await fs.readFile("../temp/m1.sh"));
});

app.use(async (req, res, next) => {
    if (req.url && !req.url.match(/\./)) {
        let url = req.url;
        let ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress;
        let timeString = new Date().toISOString();
        console.log(`[${timeString}] ${ip} : ${url}`);
        ipLogFile.appendFile(`[${timeString}] ${ip} : ${url}\n`);
        if (url == "/") {
            url = "/index";
        }
        res.write(await generateHTML(`${url}.html`));
        res.end();
        return;
    }
    if (!req.url?.match(/.*\.css$/)) {
        return next();
    }
    let file = (await fs.readFile(`../client/${req.url}`).catch(_ => { }))?.toString();
    if (!file)
        return next();
    res.write(minify(file).css);
    res.end();
});
app.use(serveStatic("../client", { extensions: ['html'] }));

async function generateHTML(url: string) {
    let file;
    try {
        file = (await fs.readFile(`../client/${url}`)).toString();
    } catch (e) {
        return "";
    }

    let headTag = file.match(/<head.*>/);
    if (!headTag) {
        return "";
    }
    console.log(headTag[0]);

    let templateTag = headTag[0].match(/template="\S*"/);
    let templateName = "";
    if (!templateTag) {
        templateName = "error";
    }
    else {
        templateName = templateTag[0].substring(templateTag[0].indexOf('"') + 1, templateTag[0].lastIndexOf('"'));
    }


    let headStart = file.indexOf(headTag[0]) + headTag[0].length;
    let headEnd = file.indexOf("</head>");
    let head = file.substring(headStart, headEnd);

    let bodyStart = file.indexOf("<body>") + 6;
    let bodyEnd = file.indexOf("</body>");
    let body = file.substring(bodyStart, bodyEnd);
    let template = (await fs.readFile(`assets/templates/${templateName}.html`)).toString();
    return template.replace("$$head", head).replace("$$body", body);
}

let server = http.createServer(app);

const wss = new WebSocketServer({ server: server });

function sendMessage(ws: WebSocket, category: string, type: string, data?: any) {
    let obj = { category, type, ...data };
    let json = JSON.stringify(obj);
    console.log(`Sending to client:\n\t${json}`);
    ws.send(json);
}

function broadcast(category: string, type: string, data?: any) {
    for (let ws of wss.clients) {
        sendMessage(ws, category, type, data);
    }
}

let characters: Array<Character> = [];

let charFiles = [];
fs.readdir("characters/").then((value) => {
    charFiles = value;
    charFiles.forEach(file => {
        console.log(file);
        Character.load(file).then((c) => {
            characters.push(c);
        })
    });
    characters = characters.sort((a, b) => a.name.localeCompare(b.name));
});

let session: Session | null = null;

let messageCallbacks: { [key: string]: { [key: string]: Function } } = {};
messageCallbacks["system"] = {
    "connect": (ws: WebSocket, data: { status: string, startTime: number, connectTime?: number }) => {
        if (data.startTime < startTime) {
            console.log("Out of date client connected. Refreshing...");
            sendMessage(ws, "system", "refresh");
            return;
        }
        switch (data.status) {
        case "reconnecting":
            console.log(`Client reconnected after ${data.connectTime}`);
            break;
        case "refreshing":
            console.log("Refreshed client successfully reconnected!");
            break;
        default:
            console.log("New connection established!");
        }
        sendMessage(ws, "system", "confirm");
        broadcast("system", "viewers", { count: wss.clients.size });
    },
    "dm": (ws: WebSocket, data: { token: number }) => {
        if (data.token == dmToken) {
            sendMessage(ws, "system", "dm", { token: dmToken });
            sendConsoleLog(ws, "DM mode unlocked");
            return;
        }

        console.log(`DM token '${data.token}' does not match '${dmToken}'`);
        sendMessage(ws, "system", "nodm");
    },
}
messageCallbacks["character"] = {
    "chardata": (ws: WebSocket, data: any) => {
        console.log("Sending all character data...");
        sendMessage(ws, "character", "chardata", { chars: characters });
    }
}
messageCallbacks["session"] = {
    "ping": (ws: WebSocket) => {
        if (session === null) {
            console.log("No active session");
            sendMessage(ws, "session", "nosession");
            return;
        }

        console.log("Sending all session data...");
        sendMessage(ws, "session", "start");
    },
    "charnames": (ws: WebSocket) => {
        console.log("Sending character names...");
        sendMessage(ws, "session", "charnames", { charNames: characters.map(c => c.name) });
    },
    "chardata": (ws: WebSocket) => {
        if (session === null) {
            console.log("No active session");
            sendMessage(ws, "session", "nosession");
            return;
        }

        console.log("Sending all session data...");
        sendMessage(ws, "session", "chardata", { chars: session?.characters });
    },
    "start": (ws: WebSocket, data: any) => {
        let chars: Array<string> = data.chars;
        let sessionChars: Array<Character> = characters.filter(ch => chars.includes(ch.name));
        session = new Session(sessionChars);

        broadcast("session", "start");
    }
}

wss.on('connection', function connection(ws) {
    ws.on('error', console.error);

    ws.on('message', function message(json) {
        let data = JSON.parse(json.toString());
        console.log(`Message from client:\n\t${json}`);
        if (data.category != "console") {
            messageCallbacks[data.category]?.[data.type]?.(ws, data);
            return;
        }
        if (data.type == process.env.DM_PASSWORD) {
            sendMessage(ws, "system", "dm", { token: dmToken });
            sendConsoleLog(ws, "DM mode unlocked");
            return;
        }
        if (data.dm == dmToken) {
            handleCommand(ws, data.type, data.args);
        }
        else {
            sendConsoleLog(ws, "You do not have DM permissions!");
            sendMessage(ws, "system", "nodm");
        }
        return;
    });

    ws.on('close', () => {
        broadcast("system", "viewers", { count: wss.clients.size });
    });
});

server.listen(process.env.PORT);

const dmCommands: Map<string, Function> = new Map<string, Function>();

function sendConsoleLog(ws: WebSocket, log: string) {
    sendMessage(ws, "console", "log", { str: log });
}

function broadcastConsoleLog(log: string) {
    broadcast("console", "log", { str: log });
}

function handleCommand(ws: WebSocket, command: string, argsStr?: string) {
    if (!argsStr) {
        let comm = dmCommands.get(command);
        if (!comm) {
            sendConsoleLog(ws, `Command '${command} not found`);
            return;
        }
        comm!(ws, null);

        return;
    }

    let args: Array<string> = [];
    let current: string = "";
    let quote: string | null = null;
    for (let i = 0; i < argsStr.length; i++) {
        let c = argsStr[i];
        if (c == "\\") {
            current += argsStr[++i];
            continue;
        }
        if (quote != null) {
            if (c == quote)
                quote = null;
            else
                current += c;
            continue;
        }

        switch (c) {
        case '\"':
        case '\'':
            quote = c;
            continue;
        case ' ':
            args.push(current);
            current = "";
            continue;
        }

        current += c;
    }
    if (quote) {
        console.error("Invalid command: unclosed quote");
        return;
    }

    args.push(current);

    let comm = dmCommands.get(command);
    if (!comm) {
        sendConsoleLog(ws, `Command '${command} not found`);
        return;
    }
    comm!(ws, args);
}

dmCommands.set("damage", (ws: WebSocket, args: string[]) => {
    handleCommand(ws, "data", `"${args[0]}" currentHP -${args[1]}`);
});
dmCommands.set("heal", (ws: WebSocket, args: string[]) => {
    handleCommand(ws, "data", `"${args[0]}" currentHP +${args[1]}`);
});
dmCommands.set("class", (ws: WebSocket, args: string[]) => {
    handleCommand(ws, "data", `"${args[0]}" equippedClass ${args[1]}`);
});

dmCommands.set("session", (ws: WebSocket, args: Array<string>) => {
    switch (args[0]) {
    case "new":
        let sessionChars: Array<Character> = characters.filter(ch => args.includes(ch.name));
        session = new Session(sessionChars);

        broadcast("session", "start", { chars: session.characters });
        sendConsoleLog(ws, `Started new session with ${sessionChars.length} characters.`);
        break;
    case "end":
        session = null;
        broadcast("session", "end");
        sendConsoleLog(ws, "Ended the current session.");
        break;
    case "turn":
        if (session == null) {
            sendConsoleLog(ws, "There is not currently a session active");
            return;
        }

        for (let c of session.characters) {
            for (let b in c.buffs) {
                let buff = c.buffs[b]!;
                buff.onTurn?.();
                buff.turnsRemaining--;
                if (buff.turnsRemaining <= 0) {
                    buff.onClear?.();
                    buff.unapply?.();
                    delete c.buffs[b];
                }
            }
        }

        broadcast("session", "turn", { chars: session?.characters });
        break;
    }
});

dmCommands.set("data", (ws: WebSocket, args: Array<string>) => {
    if (session == null) {
        sendConsoleLog(ws, "Data command can only be used when a session is active. Did you mean chardata?");
        return;
    }
    if (!args || args.length < 3) {
        sendConsoleLog(ws, "Data command missing args: data <character> <data> <value>");
        return;
    }

    const cName = args[0];
    let character = session.characters.find(c => c.name == cName);
    if (character == undefined) {
        sendConsoleLog(ws, `Character '${cName}' not found`);
        return;
    }

    let layers = args[1]!.split(".")!;
    let lastLayer = layers.pop()!;

    let current = character as Indexable;
    for (let layer of layers) {
        if (!Object.hasOwn(current, layer)) {
            sendConsoleLog(ws, `Unknown key: '${layer}' from '${args[1]}'`);
            return;
        }
        current = current[layer];
    }
    if (!Object.hasOwn(current, lastLayer)) {
        sendConsoleLog(ws, `Unknown key: '${lastLayer}' from '${args[1]}'`);
        return;
    }

    let data: any = args[2]!;
    let relative: boolean = false;
    switch (typeof (current[lastLayer])) {
    case 'number':
        data = Number(data);
        if (isNaN(data)) {
            sendConsoleLog(ws, `'${args[2]}' is not a valid number!`);
            return;
        }
        if (args[2]![0] == '+' || args[2]![0] == '-')
            relative = true;
        break;
    case 'string':
        data = String(data);
        break;

    case 'object':
        switch (lastLayer) {
        case "equippedClass":
            if (data == "null") {
                data = null;
                break;
            }
            if (data == character.specialtyClass.name) {
                sendConsoleLog(ws, "Cannot equip the same class twice");
                return;
            }
            data = JobClasses[data];
            if (!data) {
                sendConsoleLog(ws, `Class '${args[2]}' does not exist`);
                return;
            }
            break;
        default:
            console.log(`Unknown type: ${current[lastLayer].__proto__}`);
            break;
        }
        break;
    }

    if (relative) {
        current[lastLayer] += data;
    } else {
        current[lastLayer] = data;
    }

    if (typeof data == "number") {
        let max: number = 0;
        switch (lastLayer) {
        case "currentHP":
            max = character.maxHP
            break;
        case "currentMP":
            max = character.maxMP
            break;
        }
        current[lastLayer] = Math.max(0, Math.min(current[lastLayer], max));
    }

    broadcast("session", "char", { char: character });
});

dmCommands.set("buff", (ws: WebSocket, args: Array<string>) => {
    if (session == null) {
        sendConsoleLog(ws, "Buff command can only be used when a session is active");
        return;
    }
    if (!args || args.length < 5) {
        sendConsoleLog(ws, "Buff command missing args: buff <player> <name> <icon> <turns> [effects...]");
        return;
    }

    const cName = args.shift();
    let character = session.characters.find(c => c.name == cName);
    if (character == undefined) {
        sendConsoleLog(ws, `Character '${cName}' not found`);
        return;
    }

    let name: string = args.shift()!;
    let iconID: string = args.shift()!;
    let turns: number = Number(args.shift()!);
    let effects: { [key: string]: string } = {};
    for (let arg of args) {
        let effect = arg.split(':');
        if (effect.length != 2) {
            return;
        }
        effects[effect[0]!] = effect[1]!;
    }

    let buff = new Buff();
    buff.name = name;
    buff.icon = iconID;
    buff.turnsRemaining = turns;

    // Separate triggers
    for (let [when, what] of Object.entries(effects)) {
        // Separate stats
        let whatParts = what.split(',');
        let actions: { stat: string, num: number }[] = [];
        let unapplyActions: { stat: string, num: number }[] = [];
        for (let whatPart of whatParts) {
            let [stat, op, numStr] = whatPart.split(/\b/);
            if (!stat || !op || !numStr) {
                return;
            }
            let num = Number(op + numStr);
            actions.push({ stat, num });
            if (when == "apply")
                unapplyActions.push({ stat, num: -num });
        }

        switch (when) {
        case "apply":
            ActivateBuff(character, actions);
            buff.unapply = ActivateBuff.bind(null, character, unapplyActions);
            break;
        case "clear":
            buff.onClear = ActivateBuff.bind(null, character, actions);
            break;
        case "turn":
            buff.onTurn = ActivateBuff.bind(null, character, actions);
            break;
        case "in":
            buff.onIncoming = ActivateBuff.bind(null, character, actions);
            break;
        case "out":
            buff.onOutgoing = ActivateBuff.bind(null, character, actions);
            break;
        }
    }
    character.buffs[buff.name] = buff;
    broadcast("session", "char", { char: character });
});

dmCommands.set("gem", (ws: WebSocket, args: string[]) => {
    if (session == null) {
        sendConsoleLog(ws, "Gem command can only be used when a session is active");
        return;
    }
    if (!args || args.length < 4) {
        sendConsoleLog(ws, "Gem command missing args: gem <player> <slot> <name> <color> [effects...]");
        return;
    }

    const cName = args.shift();
    let character = session.characters.find(c => c.name == cName);
    if (character == undefined) {
        sendConsoleLog(ws, `Character '${cName}' not found`);
        return;
    }

    let slot: number = Number(args.shift()!);
    let name: string = args.shift()!;
    let color: string = args.shift()!;
    let effects: { [key: string]: string } = {};
    for (let arg of args) {
        let effect = arg.split(':');
        if (effect.length != 2) {
            return;
        }
        effects[effect[0]!] = effect[1]!;
    }

    let gem = new Gem();
    gem.name = name;
    gem.color = color;

    // Separate triggers
    for (let [when, what] of Object.entries(effects)) {
        // Separate stats
        let whatParts = what.split(',');
        let actions: { stat: string, num: number }[] = [];
        let unapplyActions: { stat: string, num: number }[] = [];
        for (let whatPart of whatParts) {
            let [stat, op, numStr] = whatPart.split(/\b/);
            if (!stat || !op || !numStr) {
                return;
            }
            let num = Number(op + numStr);
            actions.push({ stat, num });
            if (when == "apply")
                unapplyActions.push({ stat, num: -num });
        }

        switch (when) {
        case "apply":
            ActivateBuff(character, actions);
            gem.unapply = ActivateBuff.bind(null, character, unapplyActions);
            break;
        case "clear":
            gem.onClear = ActivateBuff.bind(null, character, actions);
            break;
        case "turn":
            gem.onTurn = ActivateBuff.bind(null, character, actions);
            break;
        case "in":
            gem.onIncoming = ActivateBuff.bind(null, character, actions);
            break;
        case "out":
            gem.onOutgoing = ActivateBuff.bind(null, character, actions);
            break;
        }
    }
    character.gems[slot] = gem;
    broadcast("session", "char", { char: character });
});

dmCommands.set("potion", (ws: WebSocket, args: string[]) => {
    if (session == null) {
        sendConsoleLog(ws, "Potion command can only be used when a session is active");
        return;
    }
    if (!args || args.length < 2) {
        sendConsoleLog(ws, "Potion command missing args: potion <player> <resource> [restore]");
        return;
    }

    const cName: string = args.shift()!;
    let character: SessionCharacter | undefined = session.characters.find(c => c.name == cName);
    if (character == undefined) {
        sendConsoleLog(ws, `Character '${cName}' not found`);
        return;
    }

    let resource: string = args.shift()!.toLowerCase();

    let restore: string | undefined = args.shift();
    if (restore != undefined) {
        let restoreCount: number = Number(restore);
        if (restoreCount < 1) {
            sendConsoleLog(ws, "Potion restore count must be >0");
            return;
        }

        switch (resource) {
        case "hp":
            character.hpPotions += restoreCount;
            Math.min(character.hpPotions, SessionCharacter.maxHPPotions);
            sendConsoleLog(ws, `${cName} has gained +${restoreCount} HP potions!`);
            break;
        case "mp":
            character.mpPotions += restoreCount;
            Math.min(character.mpPotions, SessionCharacter.maxMPPotions);
            sendConsoleLog(ws, `${cName} has gained +${restoreCount} MP potions!`);
            break;
        default:
            sendConsoleLog(ws, `Unknown potions type: '${resource}`);
            return;
        }
        broadcast("session", "char", { char: character });
        return;
    }

    switch (resource) {
    case "hp":
        if (character.hpPotions < 1) {
            sendConsoleLog(ws, `${cName} has no more HP potions!`);
            break;
        }
        character.currentHP = character.maxHP;
        character.hpPotions--;
        break;
    case "mp":
        if (character.mpPotions < 1) {
            sendConsoleLog(ws, `${cName} has no more MP potions!`);
            break;
        }
        character.currentMP = character.maxMP;
        character.mpPotions--;
        break;
    default:
        sendConsoleLog(ws, `Unknown potions type: '${resource}`);
        return;
    }
    sendConsoleLog(ws, `${cName} has used a ${resource.toUpperCase()} potion`);
    broadcast("session", "char", { char: character });
})

function ActivateBuff(character: SessionCharacter, actions: { stat: string, num: number }[]) {
    for (let action of actions) {
        let statKey: string = action.stat;
        switch (action.stat) {
        case "hp":
            statKey = "currentHP";
            break;
        case "mp":
            statKey = "currentMP";
            break;
        }
        if (!Object.hasOwn(character, statKey)) {
            character.tempStats[statKey] = action.num + (character.tempStats[statKey] ?? 0);
        }
        else {
            (character as Indexable)[statKey] += action.num;
        }
    }
}
