const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function initializeWebSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*', // In production, restrict this to your domain
            methods: ['GET', 'POST']
        }
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

    io.on('connection', (socket) => {
        console.log(`🔌 User connected: ${socket.username} (${socket.userId})`);

        // Join user's personal room for DMs
        socket.join(`user:${socket.userId}`);

        // Join a chat room
        socket.on('join_chat', (chatId) => {
            socket.join(`chat:${chatId}`);
            console.log(`${socket.username} joined chat:${chatId}`);
        });

        // Leave a chat room
        socket.on('leave_chat', (chatId) => {
            socket.leave(`chat:${chatId}`);
            console.log(`${socket.username} left chat:${chatId}`);
        });

        // Handle new message (broadcast to chat room)
        socket.on('send_message', (data) => {
            const { chatId, message } = data;
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
        socket.on('typing', (chatId) => {
            socket.to(`chat:${chatId}`).emit('user_typing', {
                chatId,
                userId: socket.userId,
                username: socket.username
            });
        });

        socket.on('stop_typing', (chatId) => {
            socket.to(`chat:${chatId}`).emit('user_stop_typing', {
                chatId,
                userId: socket.userId
            });
        });

        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.username}`);
        });
    });

    return io;
}

module.exports = { initializeWebSocket };
