/**
 * useFriends Hook
 * 
 * Manages friend requests, friends list, and blocking functionality.
 */

import { useState, useCallback } from 'react';
import {
  getFriends,
  getFriendRequests,
  getSentFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getFriendshipStatus,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../services/api';

export interface Friend {
  id: number;
  friendship_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  friends_since: string;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface SentRequest {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface BlockedUser {
  id: number;
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
}

export type FriendshipStatus = 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load friends list
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFriends();
      setFriends(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load friends');
      console.error('Load friends error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load incoming friend requests
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getFriendRequests();
      setRequests(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
      console.error('Load requests error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load sent friend requests
  const loadSentRequests = useCallback(async () => {
    try {
      const response = await getSentFriendRequests();
      setSentRequests(response.data);
    } catch (err: any) {
      console.error('Load sent requests error:', err);
    }
  }, []);

  // Load blocked users
  const loadBlocked = useCallback(async () => {
    try {
      const response = await getBlockedUsers();
      setBlockedUsers(response.data);
    } catch (err: any) {
      console.error('Load blocked error:', err);
    }
  }, []);

  // Load all data
  const refresh = useCallback(async () => {
    await Promise.all([loadFriends(), loadRequests(), loadSentRequests(), loadBlocked()]);
  }, [loadFriends, loadRequests, loadSentRequests, loadBlocked]);

  // Send friend request
  const sendRequest = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await sendFriendRequest(userId);
      await loadSentRequests();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send request');
      return false;
    }
  }, [loadSentRequests]);

  // Accept friend request
  const acceptRequest = useCallback(async (requestId: number): Promise<boolean> => {
    try {
      await acceptFriendRequest(requestId);
      // Refresh both lists
      await Promise.all([loadFriends(), loadRequests()]);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept request');
      return false;
    }
  }, [loadFriends, loadRequests]);

  // Decline friend request
  const declineRequest = useCallback(async (requestId: number): Promise<boolean> => {
    try {
      await declineFriendRequest(requestId);
      await loadRequests();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to decline request');
      return false;
    }
  }, [loadRequests]);

  // Cancel sent request
  const cancelRequest = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await cancelFriendRequest(userId);
      await loadSentRequests();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel request');
      return false;
    }
  }, [loadSentRequests]);

  // Remove friend
  const removeFriendById = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await removeFriend(userId);
      await loadFriends();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove friend');
      return false;
    }
  }, [loadFriends]);

  // Get friendship status with a user
  const getStatus = useCallback(async (userId: number): Promise<FriendshipStatus> => {
    try {
      const response = await getFriendshipStatus(userId);
      return response.data.status;
    } catch (err) {
      return 'none';
    }
  }, []);

  // Block user
  const block = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await blockUser(userId);
      await Promise.all([loadFriends(), loadBlocked()]);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to block user');
      return false;
    }
  }, [loadFriends, loadBlocked]);

  // Unblock user
  const unblock = useCallback(async (userId: number): Promise<boolean> => {
    try {
      await unblockUser(userId);
      await loadBlocked();
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unblock user');
      return false;
    }
  }, [loadBlocked]);

  return {
    // Data
    friends,
    requests,
    sentRequests,
    blockedUsers,
    loading,
    error,
    requestCount: requests.length,
    
    // Actions
    refresh,
    loadFriends,
    loadRequests,
    loadSentRequests,
    loadBlocked,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend: removeFriendById,
    getStatus,
    block,
    unblock,
    
    // Helpers
    clearError: () => setError(null),
  };
}
