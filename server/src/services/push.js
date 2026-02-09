/**
 * Push Notification Service
 * 
 * Handles sending push notifications via Expo.
 * Manages token validation and cleanup of invalid tokens.
 */

const { Expo } = require('expo-server-sdk');
const { db } = require('../database');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notifications to a user
 * @param {number} userId - The recipient user ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload (optional)
 * @returns {Promise<object>} - Result summary
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    // Get user's push tokens
    const tokens = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId);
    
    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No push tokens found for user' };
    }

    // Filter valid Expo push tokens
    const pushTokens = tokens
      .map(t => t.token)
      .filter(token => Expo.isExpoPushToken(token));

    if (pushTokens.length === 0) {
      return { success: false, error: 'No valid Expo push tokens found' };
    }

    // Create messages
    const messages = [];
    for (const pushToken of pushTokens) {
      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        badge: 1, // Increment app badge count (handled by client usually, but good to send)
        channelId: 'default', // Android channel ID
      });
    }

    // Batch messages
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send chunks
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    // Handle receipts/errors (optional cleanup)
    // In a production app, we should store tickets and check receipts later using
    // expo.getPushNotificationReceiptsAsync(receiptIds)
    // For now, we'll just log any immediate errors from the send response
    
    // Check for DeviceNotRegistered errors immediately if possible
    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`Error sending notification to ${pushTokens[index]}:`, ticket.message);
        if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
          // Clean up invalid token
          db.prepare('DELETE FROM push_tokens WHERE token = ?').run(pushTokens[index]);
          console.log(`Removed invalid push token: ${pushTokens[index]}`);
        }
      }
    });

    return { success: true, count: tickets.length };
  } catch (error) {
    console.error('Push notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to multiple users (e.g. group chat)
 * @param {number[]} userIds - Array of recipient user IDs
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Custom data payload
 */
async function sendGroupPushNotification(userIds, title, body, data = {}) {
  const results = [];
  for (const userId of userIds) {
    results.push(sendPushNotification(userId, title, body, data));
  }
  return Promise.all(results);
}

module.exports = {
  sendPushNotification,
  sendGroupPushNotification
};
