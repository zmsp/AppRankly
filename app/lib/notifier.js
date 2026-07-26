const axios = require('axios');

/**
 * Sends a notification via ntfy.sh
 */
async function sendNtfyNotification({ message, title = 'New Data Alert', priority = 'high', tags = 'chart_with_upwards_trend,package', topic }) {
  const targetTopic = topic !== undefined ? topic : (process.env.NTFY_TOPIC || '');
  if (!targetTopic || !targetTopic.trim()) {
    console.log('[NTFY] Skipping notification: ntfy alert is off (no topic configured).');
    return { success: false, skipped: true, reason: 'Ntfy alert is off (no topic configured)' };
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
 * Sends a notification via generic webhook (Discord, Slack, Home Assistant compatible)
 */
async function sendWebhookNotification({ message, title = 'AppRankly Alert', webhookUrl }) {
  const url = webhookUrl || process.env.WEBHOOK_URL;
  if (!url || !url.trim()) return { success: false, skipped: true };

  try {
    const response = await axios.post(url.trim(), {
      content: `**${title}**\n${message}`,
      text: `*${title}*\n${message}`,
      username: 'AppRankly'
    }, { timeout: 8000 });

    console.log(`[Webhook] Notification sent to ${url}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`[Webhook] Failed to send to ${url}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Broadcast alert to all active channels (ntfy + webhook)
 */
async function broadcastAlert(options) {
  const ntfyResult = await sendNtfyNotification(options);
  const webhookResult = await sendWebhookNotification(options);
  return { ntfyResult, webhookResult };
}

module.exports = {
  sendNtfyNotification,
  sendWebhookNotification,
  broadcastAlert
};
