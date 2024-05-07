const loader = require('./loader');

const config = loader.decodeRuntime("./data/config.txt");
const profiles = loader.decodeRuntime("./data/profiles.txt");

function findSuitableAccounts(id) {
    let _accs = config.userProfileWhitelist.find(
        obj => obj.id === id
    );

    return _accs !== undefined ? _accs.accounts : undefined;
}

function formCallbackData(accounts, purpose) {
    let inline = [];

    if(accounts.length < 10) {
        for(let account of accounts) {
            let _id = profiles.find(_acc => _acc.login === account);
            if(!_id)
                continue;

            inline.push([{
                text: _id.id,
                callback_data: `${account}\:${purpose}`
            }]);
        }
    } else if (accounts.length >= 10) {
        let _arr = [];
        for(let i = 0; i < accounts.length; i++) {
            let _id = profiles.find(_acc => _acc.login === accounts[i]);
            if(!_id)
                continue;

            _arr.push({
                text: _id.id,
                callback_data: `${accounts[i]}\:${purpose}`
            })

            if(i % 2 !== 0) {
                inline.push(_arr);
                _arr = [];
            }
        }
    }

    return inline;
}

module.exports = { findSuitableAccounts, formCallbackData }