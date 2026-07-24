const axios = require('axios');

/**
 * Sends a notification via ntfy.sh
 * @param {Object} options
 * @param {string} options.message - Body text of the notification
 * @param {string} [options.title] - Notification title (default: 'New Store Data Alert')
 * @param {string} [options.priority] - Notification priority ('min', 'low', 'default', 'high', 'urgent') (default: 'high')
 * @param {string} [options.tags] - Emojis or tags separated by commas (default: 'chart_with_upwards_trend,package')
 * @param {string} [options.topic] - Ntfy topic name
 * @returns {Promise<{success: boolean, skipped?: boolean, reason?: string, error?: string}>}
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

module.exports = {
  sendNtfyNotification
};
