const { db } = require('../database');

class ChatService {
  /**
   * Get basic chat details
   * @param {number} chatId 
   * @returns {object|null} Chat object
   */
  static getChat(chatId) {
    return db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  }

  /**
   * Verify if a user is a member of a chat (Direct, Group, or Server Channel)
   * @param {number} chatId 
   * @param {number} userId 
   * @returns {object} { isMember, chat }
   */
  static verifyMembership(chatId, userId) {
    const chat = this.getChat(chatId);
    if (!chat) {
      return { isMember: false, chat: null };
    }

    let isMember = false;
    if (chat.server_id) {
      // Server channel: Check server membership
      const member = db.prepare(
        'SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?'
      ).get(chat.server_id, userId);
      isMember = !!member;
    } else {
      // DM/Group: Check chat membership
      const member = db.prepare(
        'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?'
      ).get(chatId, userId);
      isMember = !!member;
    }

    return { isMember, chat };
  }

  /**
   * Get all members of a chat (handles both Server Channels and DM/Groups)
   * @param {object} chat Chat object
   * @param {number} [excludeUserId] Optional user ID to exclude from list
   * @returns {Array} Array of user objects
   */
  static getChatMembers(chat, excludeUserId = null) {
    let sql;
    const params = [];

    if (chat.server_id) {
       sql = `
        SELECT u.id, u.username, u.display_name, u.avatar_url
        FROM server_members sm
        JOIN users u ON sm.user_id = u.id
        WHERE sm.server_id = ?
      `;
      params.push(chat.server_id);
    } else {
      sql = `
        SELECT u.id, u.username, u.display_name, u.avatar_url
        FROM chat_members cm
        JOIN users u ON cm.user_id = u.id
        WHERE cm.chat_id = ?
      `;
      params.push(chat.id);
    }

    if (excludeUserId) {
      sql += ' AND u.id != ?';
      params.push(excludeUserId);
    }

    return db.prepare(sql).all(...params);
  }
}

module.exports = ChatService;
