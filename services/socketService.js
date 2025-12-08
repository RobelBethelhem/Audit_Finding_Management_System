// // services/socketService.js
// const socketIO = require('socket.io');
// const jwt = require('jsonwebtoken');
// const { ConversationParticipant, User, TokenBlacklist, ActiveSession } = require('../models');

// class SocketService {
//   constructor() {
//     this.io = null;
//     this.userSockets = new Map(); // userId -> [socketIds]
//   }

//   initialize(server, app) {
//     this.io = socketIO(server, {
//       cors: {
//         origin: 'https://aps2.zemenbank.com',
//         methods: ['GET', 'POST'],
//         credentials: true
//       },
//       transports: ['websocket', 'polling']
//     });

//     // Authentication middleware for socket connections
//     this.io.use(async (socket, next) => {
//       try {
//         const token = socket.handshake.auth.token;
//         if (!token) {
//           return next(new Error('Authentication required'));
//         }

//         // Verify token using your existing token verification
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
//         // Check if token is blacklisted
//         const isBlacklisted = await TokenBlacklist.isTokenBlacklisted(token);
//         if (isBlacklisted) {
//           return next(new Error('Token has been revoked'));
//         }

//         // Check if this is the active session for the user
//         const isActiveSession = await ActiveSession.isActiveSession(token, decoded.id);
//         if (!isActiveSession) {
//           return next(new Error('Session is not active or has been replaced'));
//         }
        
//         // Get user with your existing User model
//         const user = await User.findByPk(decoded.id, {
//           attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch_id']
//         });

//         if (!user || !user.is_active) {
//           return next(new Error('User not found or inactive'));
//         }

//         socket.userId = user.id;
//         socket.user = user.get({ plain: true });
//         socket.token = token;
//         next();
//       } catch (error) {
//         console.error('Socket authentication error:', error);
//         next(new Error('Authentication failed'));
//       }
//     });

//     // Handle connections
//     this.io.on('connection', (socket) => {
//       console.log(`User ${socket.user.username} connected via socket`);
      
//       // Store socket connection
//       this.addUserSocket(socket.userId, socket.id);
      
//       // Join user to their conversation rooms
//       this.joinUserConversations(socket);

//       // Emit online status
//       this.broadcastUserStatus(socket.userId, 'online');

//       // Handle events
//       this.handleSocketEvents(socket);

//       // Handle disconnect
//       socket.on('disconnect', () => {
//         console.log(`User ${socket.user.username} disconnected from socket`);
//         this.removeUserSocket(socket.userId, socket.id);
        
//         // Check if user has no more active sockets
//         if (!this.userSockets.has(socket.userId)) {
//           this.broadcastUserStatus(socket.userId, 'offline');
//         }
//       });
//     });

//     // Store io instance in app for use in controllers
//     app.set('io', this.io);
//     app.set('socketService', this);
//   }

//   // Add user socket connection
//   addUserSocket(userId, socketId) {
//     if (!this.userSockets.has(userId)) {
//       this.userSockets.set(userId, []);
//     }
//     this.userSockets.get(userId).push(socketId);
//   }

//   // Remove user socket connection
//   removeUserSocket(userId, socketId) {
//     if (this.userSockets.has(userId)) {
//       const sockets = this.userSockets.get(userId).filter(id => id !== socketId);
//       if (sockets.length > 0) {
//         this.userSockets.set(userId, sockets);
//       } else {
//         this.userSockets.delete(userId);
//       }
//     }
//   }

//   // Get online users
//   getOnlineUsers() {
//     return Array.from(this.userSockets.keys());
//   }

//   // Check if user is online
//   isUserOnline(userId) {
//     return this.userSockets.has(userId);
//   }

//   // Join user to all their conversation rooms
//   async joinUserConversations(socket) {
//     try {
//       const participations = await ConversationParticipant.findAll({
//         where: {
//           user_id: socket.userId,
//           is_active: true
//         }
//       });

//       for (let participation of participations) {
//         socket.join(`conversation:${participation.conversation_id}`);
//         console.log(`User ${socket.user.username} joined conversation:${participation.conversation_id}`);
//       }
//     } catch (error) {
//       console.error('Error joining conversations:', error);
//     }
//   }

//   // Handle socket events
//   handleSocketEvents(socket) {
//     // Join a conversation room
//     socket.on('join_conversation', async (conversationId) => {
//       try {
//         // Verify user is participant
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: conversationId,
//             user_id: socket.userId,
//             is_active: true
//           }
//         });

//         if (participant) {
//           socket.join(`conversation:${conversationId}`);
//           socket.emit('joined_conversation', { conversationId });
//           console.log(`User ${socket.user.username} joined conversation ${conversationId}`);
//         } else {
//           socket.emit('error', { message: 'Not a participant in this conversation' });
//         }
//       } catch (error) {
//         console.error('Error joining conversation:', error);
//         socket.emit('error', { message: 'Failed to join conversation' });
//       }
//     });

//     // Leave a conversation room
//     socket.on('leave_conversation', (conversationId) => {
//       socket.leave(`conversation:${conversationId}`);
//       socket.emit('left_conversation', { conversationId });
//       console.log(`User ${socket.user.username} left conversation ${conversationId}`);
//     });

//     // User is typing
//     socket.on('typing_start', (data) => {
//       socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
//         conversationId: data.conversationId,
//         userId: socket.userId,
//         username: socket.user.username,
//         firstName: socket.user.first_name,
//         lastName: socket.user.last_name
//       });
//     });

//     // User stopped typing
//     socket.on('typing_stop', (data) => {
//       socket.to(`conversation:${data.conversationId}`).emit('user_stopped_typing', {
//         conversationId: data.conversationId,
//         userId: socket.userId
//       });
//     });

//     // Mark message as read
//     socket.on('message_read', (data) => {
//       socket.to(`conversation:${data.conversationId}`).emit('message_read_update', {
//         messageId: data.messageId,
//         userId: socket.userId,
//         readAt: new Date()
//       });
//     });

//     // Get online status for users
//     socket.on('get_online_status', (userIds) => {
//       const onlineStatus = {};
//       userIds.forEach(userId => {
//         onlineStatus[userId] = this.isUserOnline(userId);
//       });
//       socket.emit('online_status_update', onlineStatus);
//     });

//     // Request refresh of conversation list
//     socket.on('refresh_conversations', () => {
//       socket.emit('conversations_refresh_needed');
//     });
//   }

//   // Broadcast user online/offline status
//   broadcastUserStatus(userId, status) {
//     this.io.emit('user_status_change', {
//       userId,
//       status,
//       timestamp: new Date()
//     });
//   }

//   // Send message to conversation (called from controller)
//   sendMessageToConversation(conversationId, message) {
//     this.io.to(`conversation:${conversationId}`).emit('new_message', {
//       conversationId,
//       message,
//       timestamp: new Date()
//     });
//   }

//   // Send notification to specific user
//   sendToUser(userId, event, data) {
//     if (this.userSockets.has(userId)) {
//       const socketIds = this.userSockets.get(userId);
//       socketIds.forEach(socketId => {
//         this.io.to(socketId).emit(event, data);
//       });
//     }
//   }

//   // Notify when user is added to conversation
//   notifyUserAddedToConversation(userId, conversation) {
//     this.sendToUser(userId, 'added_to_conversation', {
//       conversation,
//       timestamp: new Date()
//     });
    
//     // Also make the user join the conversation room if they're online
//     if (this.userSockets.has(userId)) {
//       const socketIds = this.userSockets.get(userId);
//       socketIds.forEach(socketId => {
//         const socket = this.io.sockets.sockets.get(socketId);
//         if (socket) {
//           socket.join(`conversation:${conversation.id}`);
//         }
//       });
//     }
//   }

//   // Notify when user is removed from conversation
//   notifyUserRemovedFromConversation(userId, conversationId) {
//     this.sendToUser(userId, 'removed_from_conversation', { 
//       conversationId,
//       timestamp: new Date()
//     });
    
//     // Also make the user leave the conversation room if they're online
//     if (this.userSockets.has(userId)) {
//       const socketIds = this.userSockets.get(userId);
//       socketIds.forEach(socketId => {
//         const socket = this.io.sockets.sockets.get(socketId);
//         if (socket) {
//           socket.leave(`conversation:${conversationId}`);
//         }
//       });
//     }
//   }

//   // Broadcast conversation update
//   broadcastConversationUpdate(conversationId, conversation) {
//     this.io.to(`conversation:${conversationId}`).emit('conversation_updated', {
//       conversation,
//       timestamp: new Date()
//     });
//   }

//   // Broadcast message edit
//   broadcastMessageEdit(conversationId, message) {
//     this.io.to(`conversation:${conversationId}`).emit('message_edited', {
//       conversationId,
//       message,
//       timestamp: new Date()
//     });
//   }

//   // Broadcast message deletion
//   broadcastMessageDeletion(conversationId, messageId) {
//     this.io.to(`conversation:${conversationId}`).emit('message_deleted', { 
//       conversationId,
//       messageId,
//       timestamp: new Date()
//     });
//   }

//   // Broadcast reaction added
//   broadcastReaction(conversationId, data) {
//     this.io.to(`conversation:${conversationId}`).emit('reaction_added', {
//       conversationId,
//       ...data,
//       timestamp: new Date()
//     });
//   }

//   // Broadcast reaction removed
//   broadcastReactionRemoved(conversationId, data) {
//     this.io.to(`conversation:${conversationId}`).emit('reaction_removed', {
//       conversationId,
//       ...data,
//       timestamp: new Date()
//     });
//   }

//   // Send notification for mentions
//   sendMentionNotification(userId, message, conversation) {
//     this.sendToUser(userId, 'mentioned_in_message', {
//       message,
//       conversation,
//       timestamp: new Date()
//     });
//   }

//   // Broadcast when someone is recording audio
//   broadcastRecordingStatus(conversationId, userId, isRecording) {
//     this.io.to(`conversation:${conversationId}`).emit('recording_status', {
//       conversationId,
//       userId,
//       isRecording,
//       timestamp: new Date()
//     });
//   }
// }

// module.exports = new SocketService();



class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map();
  }

  // Stub initialization - doesn't actually create socket server
  initialize(server, app) {
    console.log('Socket.IO is disabled - using HTTP polling instead');
    
    // Store stub instance in app for compatibility
    app.set('io', null);
    app.set('socketService', this);
  }

  // Stub methods that do nothing
  addUserSocket(userId, socketId) {
    // No-op
  }

  removeUserSocket(userId, socketId) {
    // No-op
  }

  getOnlineUsers() {
    return [];
  }

  isUserOnline(userId) {
    return false;
  }

  joinUserConversations(socket) {
    // No-op
  }

  handleSocketEvents(socket) {
    // No-op
  }

  broadcastUserStatus(userId, status) {
    // No-op
  }

  sendMessageToConversation(conversationId, message) {
    // No-op - messages will be fetched via polling
  }

  sendToUser(userId, event, data) {
    // No-op
  }

  notifyUserAddedToConversation(userId, conversation) {
    // No-op - user will see new conversation on next poll
  }

  notifyUserRemovedFromConversation(userId, conversationId) {
    // No-op
  }

  broadcastConversationUpdate(conversationId, conversation) {
    // No-op
  }

  broadcastMessageEdit(conversationId, message) {
    // No-op
  }

  broadcastMessageDeletion(conversationId, messageId) {
    // No-op
  }

  broadcastReaction(conversationId, data) {
    // No-op
  }

  broadcastReactionRemoved(conversationId, data) {
    // No-op
  }

  sendMentionNotification(userId, message, conversation) {
    // No-op
  }

  broadcastRecordingStatus(conversationId, userId, isRecording) {
    // No-op
  }
}

module.exports = new SocketService();

