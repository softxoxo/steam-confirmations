const TelegramBot = require('node-telegram-bot-api');
const loader = require('./loader');

const config = loader.decodeRuntime("./data/config.txt");
const utils = require('./utils');
const steamCustom = require('./steamRelated');

const bot = new TelegramBot(config.telegram_bot_token, { polling: true });
var globalResult;
global.profileObjects = [];

let default_hello = `Hello`

const sendDefaultMessage = async (chatId) => {
    await bot.sendMessage(
        chatId,
        default_hello,
        {
            parse_mode: "HTML",
            reply_markup: config.inline_setups.default
        }
    );
}

const deleteMessage = async (chatId, msgId) => {
    try {
        await bot.deleteMessage(chatId, msgId);
    } catch (err) { }
}

bot.onText(/\/start/, async (msg) => {
    await bot.sendMessage(
        msg.chat.id,
        default_hello,
        {
            parse_mode: "HTML",
            reply_markup: config.inline_setups.default
        }
    );
    await deleteMessage(msg.chat.id, msg.message_id);
});

bot.setMyCommands([{ command: "/start", description: "Start." }]);

bot.on('callback_query', async (query) => {
    if (query.data == "query_confirm_market" || query.data == "query_confirm_trades" || query.data == "query_account_login") {
        const _accounts = utils.findSuitableAccounts(query.from.id);

        if (_accounts) {
            const _inline = utils.formCallbackData(_accounts, query.data);
            _inline.push([{ text: "Вернуться в меню", callback_data: "return_to_menu" }]);

            await bot.sendMessage(
                query.from.id,
                "Выберите аккаунты",
                {
                    reply_markup: { inline_keyboard: _inline }
                }
            );
            await deleteMessage(query.from.id, query.message.message_id)
        } else {
            await bot.sendMessage(query.from.id, "У вас нет аккаунтов");
            await deleteMessage(query.from.id, query.message.message_id)
        }
    }

    if (query.data === "return_to_menu") {
        await sendDefaultMessage(query.from.id);
        await deleteMessage(query.from.id, query.message.message_id)
    }

    if (/.*\:query_confirm_market/.test(query.data)) {
        try {
            for (let i = 0; i < 5; i++) {
                try {
                    globalResult = await steamCustom.confirmListings(
                        (query.data.split(':'))[0]
                    );
                } catch (err) { continue; }

                break;
            }
        } catch (err) {
            console.log(err);
            await bot.sendMessage(query.from.id, "Произошла ошибка, повторите еще раз.", {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.default
            });
            await deleteMessage(query.from.id, query.message.message_id)
            return;
        }

        if (!globalResult) {
            await bot.sendMessage(query.from.id, "Вам нечего подтверждать...", {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.default
            });
            await deleteMessage(query.from.id, query.message.message_id)
            return;
        }

        globalResult['type'] = "market";

        await bot.sendMessage(
            query.from.id,
            `Confirm ${globalResult.confirmations.confirms.length} items?`,
            {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.acceptOrDecline
            }
        );
        await deleteMessage(query.from.id, query.message.message_id)
    } else if (/.*\:query_confirm_trades/.test(query.data)) {
        try {
            for (let i = 0; i < 5; i++) {
                try {
                    globalResult = await steamCustom.confirmTrades(
                        (query.data.split(':'))[0]
                    );
                } catch (err) { continue; }

                globalResult['type'] = "trades";
                break;
            }
        } catch (err) {
            console.log(err);
            await bot.sendMessage(query.from.id, "Произошла ошибка, повторите еще раз.", {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.default
            });
            await deleteMessage(query.from.id, query.message.message_id)
            return;
        }

        await bot.sendMessage(
            query.from.id,
            "Подтверждены все обмены, в которых вы не отдаете предметы.", {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.default
            });
        await deleteMessage(query.from.id, query.message.message_id)

    } else if (/.*\:query_account_login/.test(query.data)) {
        try {
            let result = await steamCustom.getLoginData(
                (query.data.split(':'))[0]
            );

            await bot.sendMessage(
                query.from.id,
                `Логин: <code>${result.login}</code>\nПароль: <code>${result.password}</code>\n2FA код: <code>${result.code}</code>`,
                {
                    parse_mode: "HTML",
                    reply_markup: config.inline_setups.default
                }
            );
            await deleteMessage(query.from.id, query.message.message_id)
        } catch (err) {
            console.log(err);
            await bot.sendMessage(query.from.id, "Произошла ошибка, повторите еще раз.", {
                parse_mode: "HTML",
                reply_markup: config.inline_setups.default
            });
            await deleteMessage(query.from.id, query.message.message_id)
            return;
        }
    }

    if (query.data == "decline") {
        await deleteMessage(query.from.id, query.message.message_id)
        globalResult = undefined;

        await sendDefaultMessage(query.from.id);
    }

    if (query.data == "accept") {
        if (!globalResult)
            return;

        if (globalResult.type === "market") {
            await globalResult.dataToConfirm.community.acceptAllConfirmations(
                globalResult.dataToConfirm.codeTime,
                globalResult.dataToConfirm.confirmKey,
                globalResult.dataToConfirm.allowKey,
                async (callback) => {
                    if (callback == null) {
                        await bot.sendMessage(query.from.id, "Все предметы были подтверждены", {
                            parse_mode: "HTML",
                            reply_markup: config.inline_setups.default
                        });
                    }
                }
            );

            await deleteMessage(query.from.id, query.message.message_id)
        }
    }
});
