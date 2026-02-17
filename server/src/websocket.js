const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ChatService = require('./services/chatService');

const debugLog = (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args);
};
const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};
const parseChatId = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

function initializeWebSocket(server, corsOptions) {
    const maxHttpBufferSize = toPositiveInt(process.env.SOCKET_MAX_HTTP_BUFFER_SIZE, 1024 * 1024);
    const pingInterval = toPositiveInt(process.env.SOCKET_PING_INTERVAL_MS, 25000);
    const pingTimeout = toPositiveInt(process.env.SOCKET_PING_TIMEOUT_MS, 20000);
    const membershipCacheTtlMs = toPositiveInt(process.env.SOCKET_MEMBERSHIP_CACHE_TTL_MS, 5000);
    const membershipCache = new Map();

    const io = new Server(server, {
        cors: corsOptions,
        maxHttpBufferSize,
        pingInterval,
        pingTimeout
    });

    // Authentication middleware for WebSocket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            next();
        } catch (err) {
            next(new Error('Invalid token'));
        }
    });

    // Track online users: Map<UserId, Set<SocketId>>
    const onlineUsers = new Map();

    const broadcastPresence = (userId, status) => {
        io.emit('presence:update', { userId, status });
    };

    io.on('connection', (socket) => {
        debugLog(`🔌 User connected: ${socket.username} (${socket.userId})`);

        // Track user presence
        if (!onlineUsers.has(socket.userId)) {
            onlineUsers.set(socket.userId, new Set());
            // First device connected: Broadcast ONLINE
            broadcastPresence(socket.userId, 'online');
        }
        onlineUsers.get(socket.userId).add(socket.id);

        // Send initial state to the new user
        const onlineList = Array.from(onlineUsers.keys());
        socket.emit('presence:initial_state', onlineList);

        // Join user's personal room for DMs
        socket.join(`user:${socket.userId}`);

        const verifyChatAccess = (inputChatId) => {
            const chatId = parseChatId(inputChatId);
            if (!chatId) {
                socket.emit('error', { message: 'Invalid chat id', chatId: inputChatId });
                return null;
            }

            const cacheKey = `${socket.userId}:${chatId}`;
            const cached = membershipCache.get(cacheKey);
            if (cached && cached.expiresAt > Date.now()) {
                return chatId;
            }

            const { isMember, chat } = ChatService.verifyMembership(chatId, socket.userId);
            if (!chat) {
                socket.emit('error', { message: 'Chat not found', chatId });
                return null;
            }
            if (!isMember) {
                socket.emit('error', { message: 'Not authorized for this chat', chatId });
                return null;
            }
            membershipCache.set(cacheKey, { expiresAt: Date.now() + membershipCacheTtlMs });
            return chatId;
        };

        // Join a chat room
        socket.on('join_chat', (inputChatId) => {
            const chatId = verifyChatAccess(inputChatId);
            if (!chatId) return;
            socket.join(`chat:${chatId}`);
            debugLog(`${socket.username} joined chat:${chatId}`);
        });

        // Leave a chat room
        socket.on('leave_chat', (chatId) => {
            socket.leave(`chat:${chatId}`);
            debugLog(`${socket.username} left chat:${chatId}`);
        });

        // Handle new message (broadcast to chat room)
        socket.on('send_message', (data) => {
            const { chatId: inputChatId, message } = data || {};
            const chatId = verifyChatAccess(inputChatId);
            if (!chatId) return;
            // Broadcast to all users in the chat except sender
            socket.to(`chat:${chatId}`).emit('new_message', {
                chatId,
                message,
                sender: {
                    id: socket.userId,
                    username: socket.username
                }
            });
        });

        // Typing indicator
        socket.on('typing', (inputChatId) => {
            const chatId = verifyChatAccess(inputChatId);
            if (!chatId) return;
            socket.to(`chat:${chatId}`).emit('user_typing', {
                chatId,
                userId: socket.userId,
                username: socket.username
            });
        });

        socket.on('stop_typing', (inputChatId) => {
            const chatId = verifyChatAccess(inputChatId);
            if (!chatId) return;
            socket.to(`chat:${chatId}`).emit('user_stop_typing', {
                chatId,
                userId: socket.userId
            });
        });

        socket.on('disconnect', () => {
            debugLog(`🔌 User disconnected: ${socket.username}`);

            // Handle presence
            if (onlineUsers.has(socket.userId)) {
                const userSockets = onlineUsers.get(socket.userId);
                userSockets.delete(socket.id);

                if (userSockets.size === 0) {
                    onlineUsers.delete(socket.userId);
                    // Last device disconnected: Broadcast OFFLINE (with small debounce usually, but direct for now)
                    broadcastPresence(socket.userId, 'offline');
                }
            }
        });
    });

    return io;
}

module.exports = { initializeWebSocket };
