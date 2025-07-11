const { Telegraf } = require('telegraf');
const schedule = require('node-schedule');

const bot = new Telegraf(process.env.BOT_TOKEN || '7630888936:AAGCUMPLwLf7uLVcNmRif7Iz2VQcRPVrWdU');

// Хранилище данных пользователей
const users = {};

// Мотивационные фразы с эмодзи
const motivPhrases = [
    {text: "💧 Вода – твоё топливо! Выпей стакан прямо сейчас!", emoji: "💧"},
    {text: "🚀 Как орикс в пустыне? Не будь им – попей воды!", emoji: "🐪"},
    {text: "🌵 Даже кактусы пьют чаще! Не отставай!", emoji: "🌵"},
    {text: "🧠 Без воды мозг сохнет... Не дай ему превратиться в сухарь!", emoji: "🧠"},
    {text: "💪 Ты же не хочешь превратиться в сухофрукт? Пей воду!", emoji: "🍇"},
    {text: "🚰 Один стакан сейчас – и ты молодец!", emoji: "👏"},
    {text: "⏳ Время пить воду! Прямо сейчас!", emoji: "⏰"}
];

// Клавиатура с кнопками
function getWaterKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Выпил(а)! ✅', callback_data: 'drank'}],
                [{text: 'Отложить на 15 мин ⏳', callback_data: 'delay_15min'}]
            ]
        }
    };
}

// Команда старта
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    users[chatId] = {
        reminders: true,
        timezone: 3,
        waterCount: 0,
        lastDrinkTime: null,
        streak: 0,
        achievements: []
    };
    
    return ctx.replyWithMarkdown(`
Привет, ${ctx.from.first_name}! 💦 Я твой персональный гид по водному балансу.

*Доступные команды:*
/start - Перезапустить бота
/stats - Статистика за сегодня
/achievements - Твои достижения
/settings - Настройки напоминаний
/stop - Остановить напоминания
/resume - Возобновить напоминания
    `);
});

// Команда помощи
bot.help((ctx) => ctx.replyWithMarkdown(`
*Как использовать бота:*
Я буду присылать тебе напоминания пить воду каждые 2 часа с 8:00 до 22:00.

*Команды:*
/stats - Показать статистику за сегодня
/achievements - Показать твои достижения
/settings - Настроить время напоминаний
/stop - Временно отключить напоминания
/resume - Включить напоминания снова
`));

// Статистика
bot.command('stats', (ctx) => {
    const chatId = ctx.chat.id;
    if (users[chatId]) {
        const count = users[chatId].waterCount || 0;
        let message = `Сегодня ты выпил ${count} стаканов воды. `;
        
        if (count < 4) message += "Можно лучше!";
        else if (count < 8) message += "Хороший результат!";
        else message += "Отлично! Ты молодец!";
        
        if (users[chatId].streak > 0) {
            message += `\nТекущая серия: ${users[chatId].streak} дней подряд!`;
        }
        
        return ctx.reply(message);
    }
    return ctx.reply('Сначала запустите бота командой /start');
});

// Достижения
bot.command('achievements', (ctx) => {
    const chatId = ctx.chat.id;
    if (users[chatId]) {
        if (users[chatId].achievements.length === 0) {
            return ctx.reply('У тебя пока нет достижений. Продолжай пить воду!');
        }
        return ctx.reply(`Твои достижения:\n- ${users[chatId].achievements.join('\n- ')}`);
    }
    return ctx.reply('Сначала запустите бота командой /start');
});

// Настройки
bot.command('settings', (ctx) => {
    return ctx.reply('Настройки пока в разработке. Сейчас напоминания приходят каждые 2 часа с 8:00 до 22:00.');
});

// Остановка напоминаний
bot.command('stop', (ctx) => {
    const chatId = ctx.chat.id;
    if (users[chatId]) {
        users[chatId].reminders = false;
        return ctx.reply('Напоминания остановлены. Используйте /resume чтобы возобновить.');
    }
    return ctx.reply('Сначала запустите бота командой /start');
});

// Возобновление напоминаний
bot.command('resume', (ctx) => {
    const chatId = ctx.chat.id;
    if (users[chatId]) {
        users[chatId].reminders = true;
        return ctx.reply('Напоминания возобновлены!');
    }
    return ctx.reply('Сначала запустите бота командой /start');
});

// Отправка напоминания
function sendReminder(chatId) {
    if (users[chatId] && users[chatId].reminders) {
        const randomMotiv = motivPhrases[Math.floor(Math.random() * motivPhrases.length)];
        const message = `${randomMotiv.emoji} ${randomMotiv.text}\n\nТекущий счет: ${users[chatId].waterCount} стаканов`;
        
        bot.telegram.sendMessage(chatId, message, getWaterKeyboard())
            .then(() => {
                setTimeout(() => {
                    if (users[chatId] && (!users[chatId].lastDrinkTime || 
                        Date.now() - new Date(users[chatId].lastDrinkTime).getTime() > 15*60*1000)) {
                        bot.telegram.sendMessage(chatId, "⏰ Кажется, ты ещё не выпил воду! Это важно для здоровья!");
                    }
                }, 15*60*1000);
            });
    }
}

// Обработка кнопки "Выпил"
bot.action('drank', async (ctx) => {
    const chatId = ctx.chat.id;
    if (!users[chatId]) return;

    users[chatId].waterCount += 1;
    users[chatId].lastDrinkTime = new Date();
    
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch(e) {}
    
    // Проверка достижений
    let achievement = '';
    if (users[chatId].waterCount === 5 && !users[chatId].achievements.includes('5 стаканов за день')) {
        users[chatId].achievements.push('5 стаканов за день');
        achievement = '\n\n🎉 Новое достижение: 5 стаканов за день!';
    } else if (users[chatId].waterCount === 8 && !users[chatId].achievements.includes('8 стаканов за день')) {
        users[chatId].achievements.push('8 стаканов за день');
        achievement = '\n\n🏆 Новое достижение: 8 стаканов за день!';
    }
    
    await ctx.reply(`✅ Принято! Сегодня: ${users[chatId].waterCount} стаканов${achievement}`);
});

// Обработка кнопки "Отложить"
bot.action('delay_15min', async (ctx) => {
    await ctx.answerCbQuery('Напомню через 15 минут!');
    setTimeout(() => sendReminder(ctx.chat.id), 15*60*1000);
});

// Вечерний отчет
schedule.scheduleJob('0 22 * * *', () => {
    Object.keys(users).forEach(chatId => {
        const today = users[chatId]?.waterCount || 0;
        let message = '';
        
        if (today < 4) {
            message = `😐 Сегодня только ${today} стаканов... Завтра будет лучше!`;
            users[chatId].streak = 0;
        } else if (today < 8) {
            message = `👍 Неплохо! ${today} стаканов.`;
            users[chatId].streak += 1;
        } else {
            message = `🎉 Фантастика! ${today} стаканов - ты на верном пути!`;
            users[chatId].streak += 1;
            
            if (users[chatId].streak === 3 && !users[chatId].achievements.includes('3 дня подряд')) {
                users[chatId].achievements.push('3 дня подряд');
                message += '\n\n🔥 Новое достижение: 3 дня подряд!';
            }
        }
        
        if (users[chatId].streak > 0) {
            message += `\nТекущая серия: ${users[chatId].streak} ${users[chatId].streak === 1 ? 'день' : 'дня'} подряд!`;
        }
        
        bot.telegram.sendMessage(chatId, message);
        users[chatId].waterCount = 0;
    });
});

// Настройка напоминаний
function setupReminders() {
    const rule = new schedule.RecurrenceRule();
    rule.hour = [8, 10, 12, 14, 16, 18, 20, 22];
    rule.minute = 0;
    
    schedule.scheduleJob(rule, () => {
        Object.keys(users).forEach(chatId => {
            sendReminder(chatId);
        });
    });
}

// Запуск бота
bot.launch().then(() => {
    console.log('Бот запущен!');
    setupReminders();
});

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));