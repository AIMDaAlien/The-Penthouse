/**
 * Friends Routes
 * 
 * Endpoints for friend requests, friend list management, and blocking users.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { friendRequestLimiter } = require('../middleware/rateLimit');
const { validateFriendRequest, validateUserId, validateRequestId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────
// Friend Requests
// ─────────────────────────────────────────────────────────────
const { sendPushNotification } = require('../services/push');

/**
 * POST /api/friends/request
 * Send a friend request
 */
router.post('/request', friendRequestLimiter, validateFriendRequest, async (req, res) => {
  try {
    const senderId = req.user.id || req.user.userId;
    const { userId } = req.body;
    
    // ... validation checks (userId required, self-check, blocked check, existing friendship/request) ...

    if (userId === senderId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if user exists
    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if blocked
    const isBlocked = db.prepare(`
      SELECT id FROM blocked_users 
      WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
    `).get(userId, senderId, senderId, userId);
    
    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot send friend request' });
    }

    // Check if already friends
    const existingFriendship = db.prepare(`
      SELECT id FROM friendships 
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(senderId, userId, userId, senderId);

    if (existingFriendship) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check for existing request
    const existingRequest = db.prepare(`
      SELECT id, sender_id, status FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(senderId, userId, userId, senderId);

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        // If they sent us a request, auto-accept
        if (existingRequest.sender_id === userId) {
          // Accept their request
          db.prepare('DELETE FROM friend_requests WHERE id = ?').run(existingRequest.id);
          db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(senderId, userId);
          db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(userId, senderId);
          
          // Notify sender that request was accepted
          sendPushNotification(
            userId,
            'Friend Request Accepted',
            `${req.user.username} accepted your friend request!`,
            { type: 'friend_request_accepted', userId: senderId }
          );

          return res.json({ message: 'Friend request accepted', status: 'friends' });
        }
        return res.status(400).json({ error: 'Friend request already sent' });
      }
    }

    // Create friend request
    const result = db.prepare(`
      INSERT INTO friend_requests (sender_id, receiver_id, status)
      VALUES (?, ?, 'pending')
    `).run(senderId, userId);

    // Send push notification to receiver
    sendPushNotification(
      userId,
      'New Friend Request',
      `${req.user.username} sent you a friend request`,
      { type: 'friend_request', requestId: result.lastInsertRowid, senderId }
    );

    res.status(201).json({ 
      message: 'Friend request sent',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * GET /api/friends/requests
 * Get pending friend requests (incoming)
 */
router.get('/requests', (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = db.prepare(`
      SELECT 
        fr.id,
        fr.sender_id,
        fr.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM friend_requests fr
      JOIN users u ON fr.sender_id = u.id
      WHERE fr.receiver_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId);

    res.json(requests);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

/**
 * GET /api/friends/requests/sent
 * Get outgoing friend requests
 */
router.get('/requests/sent', (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = db.prepare(`
      SELECT 
        fr.id,
        fr.receiver_id as user_id,
        fr.created_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM friend_requests fr
      JOIN users u ON fr.receiver_id = u.id
      WHERE fr.sender_id = ? AND fr.status = 'pending'
      ORDER BY fr.created_at DESC
    `).all(userId);

    res.json(requests);
  } catch (error) {
    console.error('Error getting sent requests:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

/**
 * POST /api/friends/accept/:id
 * Accept a friend request
 */
router.post('/accept/:id', (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = req.params.id;

    const request = db.prepare(`
      SELECT * FROM friend_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).get(requestId, userId);

    if (!request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Delete the request
    db.prepare('DELETE FROM friend_requests WHERE id = ?').run(requestId);

    // Create bidirectional friendship
    db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(userId, request.sender_id);
    db.prepare('INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)').run(request.sender_id, userId);

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/friends/decline/:id
 * Decline a friend request
 */
router.post('/decline/:id', (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = req.params.id;

    const result = db.prepare(`
      DELETE FROM friend_requests 
      WHERE id = ? AND receiver_id = ? AND status = 'pending'
    `).run(requestId, userId);

    if (result.lastInsertRowid === 0) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

/**
 * DELETE /api/friends/request/:userId
 * Cancel a sent friend request
 */
router.delete('/request/:userId', (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;

    db.prepare(`
      DELETE FROM friend_requests 
      WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).run(senderId, receiverId);

    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

// ─────────────────────────────────────────────────────────────
// Friends List
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/friends
 * Get friends list
 */
router.get('/', (req, res) => {
  try {
    const userId = req.user.userId;

    const friends = db.prepare(`
      SELECT 
        f.id as friendship_id,
        f.friend_id as id,
        f.created_at as friends_since,
        u.username,
        u.display_name,
        u.avatar_url
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ?
      ORDER BY u.display_name, u.username
    `).all(userId);

    res.json(friends);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Failed to get friends list' });
  }
});

/**
 * DELETE /api/friends/:userId
 * Remove a friend
 */
router.delete('/:userId', (req, res) => {
  try {
    const userId = req.user.userId;
    const friendId = req.params.userId;

    // Remove bidirectional friendship
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(userId, friendId);
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(friendId, userId);

    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

/**
 * GET /api/friends/status/:userId
 * Get friendship status with a user
 */
router.get('/status/:userId', (req, res) => {
  try {
    const userId = req.user.userId;
    const targetId = req.params.userId;

    // Check if friends
    const friendship = db.prepare(`
      SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?
    `).get(userId, targetId);

    if (friendship) {
      return res.json({ status: 'friends' });
    }

    // Check for pending request
    const sentRequest = db.prepare(`
      SELECT id FROM friend_requests 
      WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).get(userId, targetId);

    if (sentRequest) {
      return res.json({ status: 'request_sent', requestId: sentRequest.id });
    }

    const receivedRequest = db.prepare(`
      SELECT id FROM friend_requests 
      WHERE sender_id = ? AND receiver_id = ? AND status = 'pending'
    `).get(targetId, userId);

    if (receivedRequest) {
      return res.json({ status: 'request_received', requestId: receivedRequest.id });
    }

    // Check if blocked
    const blocked = db.prepare(`
      SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?
    `).get(userId, targetId);

    if (blocked) {
      return res.json({ status: 'blocked' });
    }

    res.json({ status: 'none' });
  } catch (error) {
    console.error('Error getting friendship status:', error);
    res.status(500).json({ error: 'Failed to get friendship status' });
  }
});

// ─────────────────────────────────────────────────────────────
// Blocking
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/friends/block/:userId
 * Block a user
 */
router.post('/block/:userId', (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    if (blockerId === parseInt(blockedId)) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(blockedId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove any friendships
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(blockerId, blockedId);
    db.prepare('DELETE FROM friendships WHERE user_id = ? AND friend_id = ?').run(blockedId, blockerId);

    // Remove any pending friend requests
    db.prepare(`
      DELETE FROM friend_requests 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).run(blockerId, blockedId, blockedId, blockerId);

    // Add to blocked users
    try {
      db.prepare('INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)').run(blockerId, blockedId);
    } catch (e) {
      // Already blocked
    }

    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

/**
 * DELETE /api/friends/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', (req, res) => {
  try {
    const blockerId = req.user.id;
    const blockedId = req.params.userId;

    db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(blockerId, blockedId);

    res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

/**
 * GET /api/friends/blocked
 * Get list of blocked users
 */
router.get('/blocked', (req, res) => {
  try {
    const userId = req.user.userId;

    const blocked = db.prepare(`
      SELECT 
        b.id,
        b.blocked_id as user_id,
        b.created_at as blocked_at,
        u.username,
        u.display_name,
        u.avatar_url
      FROM blocked_users b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `).all(userId);

    res.json(blocked);
  } catch (error) {
    console.error('Error getting blocked users:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
});

module.exports = router;
