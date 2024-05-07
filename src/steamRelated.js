const loader = require('./loader');
const Request = require('request');
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');
const SteamTradeManager = require('steam-tradeoffer-manager');
const { LoginSession, EAuthTokenPlatformType } = require('steam-session');

const profiles = loader.decodeRuntime("./data/profiles.txt");

const checkIfLoggedIn = async (community) => {
    return new Promise((resolve, reject) => {
        community.loggedIn((err, loggedIn) => {
            if (err)
                reject(err);

            resolve(loggedIn);
        })
    });
}

const communityLogin = async (details, community) => {
    let _item = global.profileObjects.find(item => item.accountName === details.accountName);
    if (_item) {
        const _check = await checkIfLoggedIn(_item.communityObject.community);

        if (_check)
            return _item.communityObject;
    }

    return new Promise(async (resolve, reject) => {
        try {
            let session = new LoginSession(EAuthTokenPlatformType.SteamClient);

            await session.startWithCredentials({
                accountName: details.accountName,
                password: details.password,
                steamGuardCode: details.twoFactorCode
            });

            session.on("authenticated", async () => {
                let _c = await session.getWebCookies();

                community.setCookies(_c);
                resolve({
                    community
                });
            });

            session.on("error", async () => {
                reject(new Error("Failed to log in"));
            })
        } catch (err) { reject(new Error("Failed to establish connection")) }
    })
}

const getConfirmations = async (community, params) => {
    return new Promise((resolve, reject) => {
        community.getConfirmations(params.codeTime, params.confirmKey, (callback, confirms) => {
            resolve({
                callback,
                confirms
            })
        });
    });
}

const setManagerCookies = async (manager, cookies) => {
    return new Promise((resolve, reject) => {
        manager.setCookies(cookies, (err) => {
            if (err)
                reject(err);

            resolve(manager);
        })
    });
}

const getActiveTradeOffers = async (manager) => {
    return new Promise((resolve, reject) => {
        manager.getOffers(1, (err, sent, received) => {
            if (err)
                reject(err);

            resolve({
                sent,
                received
            })
        });
    });
}

const acceptTradeOffer = async (tradeoffer) => {
    return new Promise((resolve, reject) => {
        tradeoffer.accept(true, (err, status) => {
            if (err)
                reject(err);

            resolve(status);
        })
    });
}

async function confirmListings(account) {
    //Проверка поиска по ID/Login аккаунта, поставишь как надо если что
    const profile = profiles.find(_acc => _acc.login == account);
    const maFile = loader.decodeRuntime(`./data/maFiles/${profile.login}.txt`);

    let community = new SteamCommunity(
        {
            request: Request.defaults({
                proxy: profile.proxy
            })
        }
    );

    const code = SteamTotp.getAuthCode(maFile.shared_secret);
    const codeTime = SteamTotp.time([code.timeOffset]);
    const confirmKey = SteamTotp.getConfirmationKey(
        maFile.identity_secret,
        codeTime,
        "conf"
    );
    const allowKey = SteamTotp.getConfirmationKey(
        maFile.identity_secret,
        codeTime,
        "allow"
    );

    const details = {
        accountName: profile.login,
        password: profile.password,
        twoFactorCode: code,
        disableMobile: true,
    };

    community = await communityLogin(details, community).then(r => r.community);

    const confirmations = await getConfirmations(
        community, { codeTime, confirmKey }
    );

    if (!confirmations)
        return;

    if (confirmations.confirms.length == 0)
        return;

    return {
        confirmations,
        dataToConfirm: {
            community,
            codeTime,
            confirmKey,
            allowKey
        }
    };
}

async function confirmTrades(account) {
    const profile = profiles.find(_acc => _acc.login == account);
    const maFile = loader.decodeRuntime(`./data/maFiles/${profile.login}.txt`);

    let community = new SteamCommunity(
        {
            request: Request.defaults({
                proxy: profile.proxy
            })
        }
    );

    const code = SteamTotp.getAuthCode(maFile.shared_secret);
    const codeTime = SteamTotp.time([code.timeOffset]);
    const confirmKey = SteamTotp.getConfirmationKey(
        maFile.identity_secret,
        codeTime,
        "conf"
    );
    const allowKey = SteamTotp.getConfirmationKey(
        maFile.identity_secret,
        codeTime,
        "allow"
    );

    const details = {
        accountName: profile.login,
        password: profile.password,
        twoFactorCode: code,
        disableMobile: true,
    };

    community = await communityLogin(details, community);

    let manager = new SteamTradeManager({
        pollInterval: 5000,
        language: "en"
    });

    manager = await setManagerCookies(manager, community.cookies);
    const offers = await getActiveTradeOffers(manager);

    for (let offer of offers.received) {
        if (offer.itemsToGive.length == 0) {
            try {
                await acceptTradeOffer(offer);
            } catch (e) { }
        }
    }

    return await getActiveTradeOffers(manager);
}

async function getLoginData(account) {
    const profile = profiles.find(_acc => _acc.login == account);
    const maFile = loader.decodeRuntime(`./data/maFiles/${profile.login}.txt`);

    const code = SteamTotp.getAuthCode(maFile.shared_secret);

    return {
        login: profile.login,
        password: profile.password,
        code: code
    }
}

module.exports = { confirmListings, confirmTrades, getLoginData }
