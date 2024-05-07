const dotenv = require('dotenv');
const crypto = require('crypto-js');
const fs = require('fs');
const envcfg = dotenv.config( { path: ".env"} ).parsed;

function _read(path) {
    const fileContent = fs.readFileSync(path, { encoding: 'utf8' });
    return fileContent;
}

function _decode(text, key) {
    const _b = crypto.AES.decrypt(text, key);
    const _t = _b.toString(crypto.enc.Utf8);

    return _t;
}

function decodeRuntime(path) {
    const _t = _read(path);
    const _d = _decode(_t, envcfg.key)

    return JSON.parse(_d);
}

function _decodeAll() {
    let datadir = fs.readdirSync("./data", { encoding: "utf8" });
    let mafiledir = fs.readdirSync("./data/maFiles", { encoding: "utf8" });

    for(let file of datadir) {
        if(file.indexOf("txt") == -1)
            continue;

        const _t = _read(`./data/${file}`);
        const _d = _decode(_t, envcfg.key);

        fs.writeFileSync(`./data/${file.replace("txt", "json")}`, _d, { flag: 'a+', encoding: 'utf-8' });
        fs.rm(`./data/${file}`, (err) => {});
    }

    for(let mafile of mafiledir) {
        if(mafile.indexOf("txt") == -1)
            continue;

        const _t = _read(`./data/maFiles/${mafile}`);
        const _d = _decode(_t, envcfg.key);

        fs.writeFileSync(`./data/maFiles/${mafile.replace("txt", "maFile")}`, _d, { flag: 'a+', encoding: 'utf8' });
        fs.rm(`./data/maFiles/${mafile}`, (err) => {});
    }
}

function _encodeAll() {
    let datadir = fs.readdirSync("./data", { encoding: "utf8" });
    let mafiledir = fs.readdirSync("./data/maFiles", { encoding: "utf8" });

    for(let file of datadir) {
        if(file.indexOf("json") == -1) 
            continue;

        const _t = _read(`./data/${file}`);
        const _tEncoded = crypto.AES.encrypt(_t, envcfg.key).toString();

        fs.writeFileSync(`./data/${file.replace("json", "txt")}`, _tEncoded, { flag: 'a+', encoding: 'utf-8' });
        fs.rm(`./data/${file}`, (err) => {});
    }

    for(let mafile of mafiledir) {
        if(mafile.indexOf("maFile") == -1) 
            continue;

        const _t = _read(`./data/maFiles/${mafile}`);
        const _tEncoded = crypto.AES.encrypt(_t, envcfg.key).toString();

        fs.writeFileSync(`./data/maFiles/${mafile.replace("maFile", "txt")}`, _tEncoded, { flag: 'a+', encoding: 'utf8' });
        fs.rm(`./data/maFiles/${mafile}`, (err) => {});
    }
}

function cryptography_datafolder(action) {
    if(action == "decodeAll") 
        _decodeAll();
    else if (action == "encodeAll")
        _encodeAll();
}

cryptography_datafolder(process.argv[2]);

module.exports = { cryptography_datafolder, decodeRuntime }