const axios = require('axios');
const fs = require('fs');
const path = require('path');

function getNotificationsFilePath(dataDir) {
  const dir = dataDir || (process.env.NODE_ENV === 'production' ? path.join(__dirname, "..", "data") : path.join(__dirname, "..", "..", "data"));
  return path.join(dir, 'notifications.json');
}

function loadNotificationStore(dataDir) {
  const filePath = getNotificationsFilePath(dataDir);
  if (!fs.existsSync(filePath)) {
    return { clearedIds: [], items: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      clearedIds: Array.isArray(parsed.clearedIds) ? parsed.clearedIds : [],
      items: Array.isArray(parsed.items) ? parsed.items : []
    };
  } catch (err) {
    console.error('[Notifier] Error reading notifications.json:', err.message);
    return { clearedIds: [], items: [] };
  }
}

function saveNotificationStore(dataDir, store) {
  const filePath = getNotificationsFilePath(dataDir);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error('[Notifier] Error writing notifications.json:', err.message);
  }
}

function addNotificationRecord(dataDir, { title, message, priority = 'normal', tags = '', topic = '', source = 'system' }) {
  const store = loadNotificationStore(dataDir);
  const newItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: title || 'Alert',
    message: message || '',
    priority: priority || 'normal',
    tags: tags || '',
    topic: topic || '',
    timestamp: new Date().toISOString(),
    read: false,
    source: source || 'system'
  };

  store.items = [newItem, ...store.items].slice(0, 100);
  saveNotificationStore(dataDir, store);
  return newItem;
}

async function syncNtfyTopicMessages(dataDir, topic) {
  const store = loadNotificationStore(dataDir);
  const clearedSet = new Set(store.clearedIds);

  if (topic && topic.trim()) {
    const cleanTopic = topic.trim();
    const url = `https://ntfy.sh/${cleanTopic}/json?poll=1&since=48h`;
    try {
      const res = await axios.get(url, { timeout: 4000, responseType: 'text' });
      if (res.data && typeof res.data === 'string') {
        const lines = res.data.split('\n').filter(Boolean);
        const fetchedItems = [];
        for (const line of lines) {
          try {
            const item = JSON.parse(line);
            if (item.event === 'message') {
              fetchedItems.push({
                id: item.id || `ntfy-${item.time}`,
                title: item.title || 'Ntfy Alert',
                message: item.message || '',
                priority: item.priority === 5 ? 'urgent' : item.priority === 4 ? 'high' : item.priority === 2 ? 'low' : 'normal',
                tags: Array.isArray(item.tags) ? item.tags.join(',') : (item.tags || ''),
                timestamp: new Date((item.time || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                read: false,
                source: 'ntfy'
              });
            }
          } catch (e) {}
        }

        const existingIds = new Set(store.items.map(i => i.id));
        let updated = false;
        for (const item of fetchedItems) {
          if (!clearedSet.has(item.id) && !existingIds.has(item.id)) {
            store.items.push(item);
            existingIds.add(item.id);
            updated = true;
          }
        }

        if (updated) {
          store.items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          store.items = store.items.slice(0, 100);
          saveNotificationStore(dataDir, store);
        }
      }
    } catch (err) {
      console.warn(`[Notifier] Note: Fetching ntfy topic '${cleanTopic}' skipped or offline (${err.message}).`);
    }
  }

  const activeItems = store.items.filter(i => !clearedSet.has(i.id));
  const unreadCount = activeItems.filter(i => !i.read).length;
  return { notifications: activeItems, unreadCount };
}

function clearNotifications(dataDir, id = null) {
  const store = loadNotificationStore(dataDir);
  if (id) {
    store.clearedIds.push(id);
    store.items = store.items.filter(i => i.id !== id);
  } else {
    const currentIds = store.items.map(i => i.id);
    store.clearedIds = Array.from(new Set([...store.clearedIds, ...currentIds]));
    store.items = [];
  }
  saveNotificationStore(dataDir, store);
  return { success: true, notifications: store.items, unreadCount: 0 };
}

function markNotificationsRead(dataDir, id = null) {
  const store = loadNotificationStore(dataDir);
  if (id) {
    store.items = store.items.map(i => i.id === id ? { ...i, read: true } : i);
  } else {
    store.items = store.items.map(i => ({ ...i, read: true }));
  }
  saveNotificationStore(dataDir, store);
  const activeItems = store.items.filter(i => !store.clearedIds.includes(i.id));
  const unreadCount = activeItems.filter(i => !i.read).length;
  return { success: true, notifications: activeItems, unreadCount };
}

/**
 * Sends a notification via ntfy.sh
 */
async function sendNtfyNotification({ message, title = 'New Data Alert', priority = 'high', tags = 'chart_with_upwards_trend,package', topic, dataDir }) {
  // Record notification in local storage
  addNotificationRecord(dataDir, { title, message, priority, tags, topic, source: 'ntfy' });

  const targetTopic = topic !== undefined ? topic : (process.env.NTFY_TOPIC || '');
  if (!targetTopic || !targetTopic.trim()) {
    console.log('[NTFY] Skipping HTTP post: ntfy topic not configured.');
    return { success: true, skipped: true, reason: 'Ntfy topic not configured, saved to internal notification list' };
  }
  const url = `https://ntfy.sh/${targetTopic.trim()}`;

  try {
    const response = await axios({
      method: 'POST',
      url,
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags
      },
      data: message
    });

    console.log(`[NTFY] Notification sent successfully to topic '${targetTopic}': ${title}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`[NTFY] Failed to send notification to topic '${targetTopic}':`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Sends a notification via generic webhook (Slack, Discord, Home Assistant compatible)
 */
async function sendWebhookNotification({ message, title = 'AppRankly Alert', webhookUrl }) {
  const url = webhookUrl || process.env.WEBHOOK_URL;
  if (!url || !url.trim()) return { success: false, skipped: true };

  const trimmedUrl = url.trim();
  const isSlack = trimmedUrl.includes('hooks.slack.com');
  const isDiscord = trimmedUrl.includes('discord.com');

  let payload;
  if (isSlack) {
    const safeTitle = title.length > 150 ? title.substring(0, 147) + '...' : title;
    payload = {
      text: `*${title}*\n${message}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: safeTitle,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message
          }
        }
      ]
    };
  } else if (isDiscord) {
    payload = {
      username: 'AppRankly',
      content: `**${title}**\n${message}`
    };
  } else {
    payload = {
      title,
      message,
      text: `*${title}*\n${message}`,
      content: `**${title}**\n${message}`,
      username: 'AppRankly'
    };
  }

  try {
    const response = await axios.post(trimmedUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });

    console.log(`[Webhook] Notification sent to ${trimmedUrl}`);
    return { success: true, data: response.data };
  } catch (error) {
    const errMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`[Webhook] Failed to send to ${trimmedUrl}:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Sends a notification via Telegram Bot API with automatic entity fallback
 */
async function sendTelegramNotification({ message, title = 'AppRankly Alert', botToken, chatId }) {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chat = chatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !token.trim() || !chat || !String(chat).trim()) {
    return { success: false, skipped: true };
  }

  const cleanToken = token.trim();
  const cleanChat = String(chat).trim();
  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
  const text = `*${title}*\n\n${message}`;

  try {
    const response = await axios.post(url, {
      chat_id: cleanChat,
      text,
      parse_mode: 'Markdown'
    }, { timeout: 8000 });

    console.log(`[Telegram] Notification sent to chat ${cleanChat}`);
    return { success: true, data: response.data };
  } catch (error) {
    // If Markdown parsing fails due to unescaped underscores/symbols, retry in plain text
    if (error.response?.data?.description?.includes("can't parse entities")) {
      try {
        const retryResponse = await axios.post(url, {
          chat_id: cleanChat,
          text: `${title}\n\n${message}`
        }, { timeout: 8000 });
        console.log(`[Telegram] Notification sent to chat ${cleanChat} (fallback plain text)`);
        return { success: true, data: retryResponse.data };
      } catch (retryErr) {
        // Fall through to regular error reporting
      }
    }
    const errMsg = error.response ? `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}` : error.message;
    console.error(`[Telegram] Failed to send message:`, errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Broadcast alert to all active channels (ntfy + webhook + slack + telegram)
 */
async function broadcastAlert(options) {
  const ntfyResult = await sendNtfyNotification(options);
  const webhookResult = await sendWebhookNotification(options);

  let slackResult = { skipped: true };
  const slackUrl = options.slackWebhookUrl || options.baseConfig?.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;
  if (slackUrl && slackUrl !== options.webhookUrl) {
    slackResult = await sendWebhookNotification({ ...options, webhookUrl: slackUrl });
  }

  const telegramResult = await sendTelegramNotification({
    title: options.title,
    message: options.message,
    botToken: options.telegramBotToken || options.telegram?.botToken,
    chatId: options.telegramChatId || options.telegram?.chatId
  });

  return { ntfyResult, webhookResult, slackResult, telegramResult };
}

module.exports = {
  sendNtfyNotification,
  sendWebhookNotification,
  sendTelegramNotification,
  broadcastAlert,
  addNotificationRecord,
  syncNtfyTopicMessages,
  clearNotifications,
  markNotificationsRead
};


