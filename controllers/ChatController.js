// // controllers/ChatController.js
// const { 
//     Conversation, 
//     ConversationParticipant, 
//     Message, 
//     MessageAttachment, 
//     MessageReadStatus,
//     MessageReaction,
//     User 
//   } = require('../models');
//   const { Op } = require('sequelize');
//   const path = require('path');
//   const fs = require('fs');
  
//   class ChatController {
//     // ============ CONVERSATION ENDPOINTS ============
  
//     // Get all conversations for the logged-in user
//     async getMyConversations(req, res) {
//       try {
//         const userId = req.user.id;
//         const { type, search, limit = 50, offset = 0 } = req.query;
  
//         const whereClause = {};
//         if (type) whereClause.type = type;
//         if (search) {
//           whereClause[Op.or] = [
//             { name: { [Op.like]: `%${search}%` } },
//             { description: { [Op.like]: `%${search}%` } }
//           ];
//         }
  
//         const conversations = await Conversation.findAll({
//           where: whereClause,
//           include: [
//             {
//               model: ConversationParticipant,
//               where: { user_id: userId, is_active: true },
//               required: true
//             },
//             {
//               model: User,
//               as: 'participants',
//               attributes: ['id', 'username', 'email'],
//               through: { attributes: ['role', 'is_muted'] }
//             },
//             {
//               model: Message,
//               limit: 1,
//               order: [['created_at', 'DESC']],
//               include: [
//                 {
//                   model: User,
//                   as: 'sender',
//                   attributes: ['id', 'username']
//                 }
//               ]
//             }
//           ],
//           limit: parseInt(limit),
//           offset: parseInt(offset),
//           order: [['last_message_at', 'DESC']]
//         });
  
//         // Get unread counts
//         for (let conv of conversations) {
//           const unreadCount = await Message.count({
//             where: {
//               conversation_id: conv.id,
//               sender_id: { [Op.ne]: userId }
//             },
//             include: [{
//               model: MessageReadStatus,
//               where: {
//                 user_id: userId,
//                 is_read: false
//               },
//               required: false
//             }]
//           });
//           conv.dataValues.unread_count = unreadCount;
//         }
  
//         res.json(conversations);
//       } catch (error) {
//         console.error('Error fetching conversations:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Create a new conversation (direct or group)
//     async createConversation(req, res) {
//       try {
//         const userId = req.user.id;
//         const { name, type = 'direct', participant_ids, description } = req.body;
  
//         // Validation
//         if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
//           return res.status(400).json({ error: 'Participant IDs are required' });
//         }
  
//         // For direct chat, ensure only 2 participants
//         if (type === 'direct' && participant_ids.length !== 1) {
//           return res.status(400).json({ error: 'Direct chat requires exactly one other participant' });
//         }
  
//         // Check if direct conversation already exists
//         if (type === 'direct') {
//           const existingConv = await Conversation.findOne({
//             where: { type: 'direct' },
//             include: [{
//               model: ConversationParticipant,
//               where: {
//                 user_id: { [Op.in]: [userId, participant_ids[0]] },
//                 is_active: true
//               }
//             }]
//           });
  
//           if (existingConv) {
//             const participantCount = await ConversationParticipant.count({
//               where: { 
//                 conversation_id: existingConv.id,
//                 user_id: { [Op.in]: [userId, participant_ids[0]] }
//               }
//             });
  
//             if (participantCount === 2) {
//               return res.status(200).json(existingConv);
//             }
//           }
//         }
  
//         // Create conversation
//         const conversation = await Conversation.create({
//           name: type === 'group' ? name : null,
//           type,
//           description,
//           created_by: userId
//         });
  
//         // Add creator as participant (admin for groups)
//         await ConversationParticipant.create({
//           conversation_id: conversation.id,
//           user_id: userId,
//           role: type === 'group' ? 'admin' : 'member'
//         });
  
//         // Add other participants
//         for (let participantId of participant_ids) {
//           await ConversationParticipant.create({
//             conversation_id: conversation.id,
//             user_id: participantId,
//             role: 'member'
//           });
//         }
  
//         // Fetch complete conversation with participants
//         const completeConversation = await Conversation.findByPk(conversation.id, {
//           include: [{
//             model: User,
//             as: 'participants',
//             attributes: ['id', 'username', 'email']
//           }]
//         });
  
//         // Emit socket event for new conversation
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           participant_ids.forEach(participantId => {
//             socketService.notifyUserAddedToConversation(participantId, completeConversation);
//           });
//         }
  
//         res.status(201).json(completeConversation);
//       } catch (error) {
//         console.error('Error creating conversation:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Get single conversation details
//     async getConversation(req, res) {
//       try {
//         const { id } = req.params;
//         const userId = req.user.id;
  
//         // Check if user is participant
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant in this conversation' });
//         }
  
//         const conversation = await Conversation.findByPk(id, {
//           include: [{
//             model: User,
//             as: 'participants',
//             attributes: ['id', 'username', 'email', 'role'],
//             through: { attributes: ['role', 'joined_at', 'is_muted'] }
//           }]
//         });
  
//         res.json(conversation);
//       } catch (error) {
//         console.error('Error fetching conversation:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Update conversation (group name, description, etc.)
//     async updateConversation(req, res) {
//       try {
//         const { id } = req.params;
//         const userId = req.user.id;
//         const { name, description } = req.body;
  
//         // Check if user is admin
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: userId,
//             role: 'admin',
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'Only group admins can update conversation details' });
//         }
  
//         const conversation = await Conversation.findByPk(id);
//         if (!conversation) {
//           return res.status(404).json({ error: 'Conversation not found' });
//         }
  
//         await conversation.update({ name, description });
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.broadcastConversationUpdate(id, conversation);
//         }
  
//         res.json(conversation);
//       } catch (error) {
//         console.error('Error updating conversation:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Add participants to group
//     async addParticipants(req, res) {
//       try {
//         const { id } = req.params;
//         const userId = req.user.id;
//         const { participant_ids } = req.body;
  
//         // Check if user is admin
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: userId,
//             role: 'admin',
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'Only group admins can add participants' });
//         }
  
//         const conversation = await Conversation.findByPk(id);
//         if (conversation.type !== 'group') {
//           return res.status(400).json({ error: 'Cannot add participants to direct chat' });
//         }
  
//         // Add participants
//         const added = [];
//         for (let participantId of participant_ids) {
//           const existing = await ConversationParticipant.findOne({
//             where: {
//               conversation_id: id,
//               user_id: participantId
//             }
//           });
  
//           if (!existing) {
//             await ConversationParticipant.create({
//               conversation_id: id,
//               user_id: participantId,
//               role: 'member'
//             });
//             added.push(participantId);
//           } else if (!existing.is_active) {
//             await existing.update({ is_active: true });
//             added.push(participantId);
//           }
//         }
  
//         // Notify new participants via socket
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           const fullConversation = await Conversation.findByPk(id, {
//             include: [{
//               model: User,
//               as: 'participants',
//               attributes: ['id', 'username', 'email']
//             }]
//           });
          
//           added.forEach(participantId => {
//             socketService.notifyUserAddedToConversation(participantId, fullConversation);
//           });
//         }
  
//         res.json({ message: 'Participants added successfully', added });
//       } catch (error) {
//         console.error('Error adding participants:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Remove participant from group
//     async removeParticipant(req, res) {
//       try {
//         const { id, participantId } = req.params;
//         const userId = req.user.id;
  
//         // Check if user is admin or removing themselves
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant' });
//         }
  
//         if (participant.role !== 'admin' && userId !== participantId) {
//           return res.status(403).json({ error: 'Only admins can remove other participants' });
//         }
  
//         // Soft delete participant
//         await ConversationParticipant.update(
//           { is_active: false },
//           {
//             where: {
//               conversation_id: id,
//               user_id: participantId
//             }
//           }
//         );
  
//         // Notify removed user via socket
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.notifyUserRemovedFromConversation(participantId, id);
//         }
  
//         res.json({ message: 'Participant removed successfully' });
//       } catch (error) {
//         console.error('Error removing participant:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // ============ MESSAGE ENDPOINTS ============
  
//     // Get messages for a conversation
//     async getMessages(req, res) {
//       try {
//         const { id } = req.params;
//         const userId = req.user.id;
//         const { limit = 50, offset = 0, before_date } = req.query;
  
//         // Check if user is participant
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant in this conversation' });
//         }
  
//         const whereClause = {
//           conversation_id: id,
//           is_deleted: false
//         };
  
//         if (before_date) {
//           whereClause.created_at = { [Op.lt]: before_date };
//         }
  
//         const messages = await Message.findAll({
//           where: whereClause,
//           include: [
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             },
//             {
//               model: MessageAttachment,
//               where: { is_active: true },
//               required: false
//             },
//             {
//               model: MessageReadStatus,
//               where: { user_id: userId },
//               required: false
//             },
//             {
//               model: MessageReaction,
//               include: [{
//                 model: User,
//                 attributes: ['id', 'username']
//               }]
//             },
//             {
//               model: Message,
//               as: 'parentMessage',
//               include: [{
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'username']
//               }]
//             }
//           ],
//           limit: parseInt(limit),
//           offset: parseInt(offset),
//           order: [['created_at', 'DESC']]
//         });
  
//         // Mark messages as read
//         const messageIds = messages.map(m => m.id);
//         await MessageReadStatus.update(
//           { is_read: true, read_at: new Date() },
//           {
//             where: {
//               message_id: { [Op.in]: messageIds },
//               user_id: userId
//             }
//           }
//         );
  
//         res.json(messages.reverse()); // Return in chronological order
//       } catch (error) {
//         console.error('Error fetching messages:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Send a message
//     async sendMessage(req, res) {
//       try {
//         const { id: conversation_id } = req.params;
//         const userId = req.user.id;
//         const { content, parent_message_id } = req.body;
//         const files = req.files;
  
//         // Check if user is participant
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant in this conversation' });
//         }
  
//         // Determine message type
//         let message_type = 'text';
//         if (files && files.length > 0) {
//           const file = files[0];
//           if (file.mimetype.startsWith('image/')) {
//             message_type = 'image';
//           } else {
//             message_type = 'document';
//           }
//         }
  
//         // Create message
//         const message = await Message.create({
//           conversation_id,
//           sender_id: userId,
//           content,
//           message_type,
//           parent_message_id
//         });
  
//         // Handle file attachments
//         if (files && files.length > 0) {
//           for (let file of files) {
//             await MessageAttachment.create({
//               message_id: message.id,
//               file_name: file.originalname,
//               file_path: file.path,
//               file_type: path.extname(file.originalname),
//               file_size: file.size,
//               mime_type: file.mimetype
//             });
//           }
//         }
  
//         // Update conversation last_message_at
//         await Conversation.update(
//           { last_message_at: new Date() },
//           { where: { id: conversation_id } }
//         );
  
//         // Create read status for all participants
//         const participants = await ConversationParticipant.findAll({
//           where: {
//             conversation_id,
//             is_active: true
//           }
//         });
  
//         for (let p of participants) {
//           await MessageReadStatus.create({
//             message_id: message.id,
//             user_id: p.user_id,
//             is_read: p.user_id === userId,
//             read_at: p.user_id === userId ? new Date() : null
//           });
//         }
  
//         // Fetch complete message with associations
//         const completeMessage = await Message.findByPk(message.id, {
//           include: [
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             },
//             {
//               model: MessageAttachment
//             },
//             {
//               model: MessageReaction,
//               include: [{
//                 model: User,
//                 attributes: ['id', 'username']
//               }]
//             }
//           ]
//         });
  
//         // Emit socket event for new message
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.sendMessageToConversation(conversation_id, completeMessage);
//         }
  
//         res.status(201).json(completeMessage);
//       } catch (error) {
//         console.error('Error sending message:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Forward message to another conversation
//     async forwardMessage(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
//         const { conversation_ids, additional_content } = req.body;
  
//         if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
//           return res.status(400).json({ error: 'Conversation IDs are required' });
//         }
  
//         // Get original message
//         const originalMessage = await Message.findByPk(messageId, {
//           include: [
//             {
//               model: MessageAttachment
//             },
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             }
//           ]
//         });
  
//         if (!originalMessage) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         const forwardedMessages = [];
  
//         for (let conversationId of conversation_ids) {
//           // Check if user is participant in target conversation
//           const participant = await ConversationParticipant.findOne({
//             where: {
//               conversation_id: conversationId,
//               user_id: userId,
//               is_active: true
//             }
//           });
  
//           if (!participant) {
//             continue; // Skip conversations user is not part of
//           }
  
//           // Create forwarded message
//           const forwardContent = additional_content 
//             ? `${additional_content}\n\n[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`
//             : `[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`;
  
//           const newMessage = await Message.create({
//             conversation_id: conversationId,
//             sender_id: userId,
//             content: forwardContent,
//             message_type: originalMessage.message_type
//           });
  
//           // Copy attachments if any
//           if (originalMessage.MessageAttachments && originalMessage.MessageAttachments.length > 0) {
//             for (let attachment of originalMessage.MessageAttachments) {
//               await MessageAttachment.create({
//                 message_id: newMessage.id,
//                 file_name: attachment.file_name,
//                 file_path: attachment.file_path,
//                 file_type: attachment.file_type,
//                 file_size: attachment.file_size,
//                 mime_type: attachment.mime_type
//               });
//             }
//           }
  
//           // Update conversation last_message_at
//           await Conversation.update(
//             { last_message_at: new Date() },
//             { where: { id: conversationId } }
//           );
  
//           // Create read status for all participants
//           const participants = await ConversationParticipant.findAll({
//             where: {
//               conversation_id: conversationId,
//               is_active: true
//             }
//           });
  
//           for (let p of participants) {
//             await MessageReadStatus.create({
//               message_id: newMessage.id,
//               user_id: p.user_id,
//               is_read: p.user_id === userId,
//               read_at: p.user_id === userId ? new Date() : null
//             });
//           }
  
//           // Fetch complete message
//           const completeMessage = await Message.findByPk(newMessage.id, {
//             include: [
//               {
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'username']
//               },
//               {
//                 model: MessageAttachment
//               }
//             ]
//           });
  
//           forwardedMessages.push(completeMessage);
  
//           // Emit socket event
//           const socketService = req.app.get('socketService');
//           if (socketService) {
//             socketService.sendMessageToConversation(conversationId, completeMessage);
//           }
//         }
  
//         res.json({ 
//           message: 'Message forwarded successfully', 
//           forwarded_to: forwardedMessages.length,
//           messages: forwardedMessages 
//         });
//       } catch (error) {
//         console.error('Error forwarding message:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Add reaction to message
//     async addReaction(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
//         const { reaction } = req.body;
  
//         if (!reaction) {
//           return res.status(400).json({ error: 'Reaction is required' });
//         }
  
//         // Get message to verify it exists and get conversation_id
//         const message = await Message.findByPk(messageId);
//         if (!message) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         // Check if user is participant in the conversation
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: message.conversation_id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant in this conversation' });
//         }
  
//         // Check if user already has this reaction
//         const existingReaction = await MessageReaction.findOne({
//           where: {
//             message_id: messageId,
//             user_id: userId,
//             reaction
//           }
//         });
  
//         if (existingReaction) {
//           return res.status(200).json({ message: 'Reaction already exists', reaction: existingReaction });
//         }
  
//         // Create reaction
//         const newReaction = await MessageReaction.create({
//           message_id: messageId,
//           user_id: userId,
//           reaction
//         });
  
//         // Fetch complete reaction with user info
//         const completeReaction = await MessageReaction.findByPk(newReaction.id, {
//           include: [{
//             model: User,
//             attributes: ['id', 'username']
//           }]
//         });
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.broadcastReaction(message.conversation_id, {
//             messageId,
//             reaction: completeReaction
//           });
//         }
  
//         res.status(201).json(completeReaction);
//       } catch (error) {
//         console.error('Error adding reaction:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Remove reaction from message
//     async removeReaction(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
//         const { reaction } = req.body;
  
//         // Get message to verify it exists and get conversation_id
//         const message = await Message.findByPk(messageId);
//         if (!message) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         // Delete reaction
//         const deleted = await MessageReaction.destroy({
//           where: {
//             message_id: messageId,
//             user_id: userId,
//             reaction
//           }
//         });
  
//         if (!deleted) {
//           return res.status(404).json({ error: 'Reaction not found' });
//         }
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.broadcastReactionRemoved(message.conversation_id, {
//             messageId,
//             userId,
//             reaction
//           });
//         }
  
//         res.json({ message: 'Reaction removed successfully' });
//       } catch (error) {
//         console.error('Error removing reaction:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Get reactions for a message
//     async getMessageReactions(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
  
//         // Get message
//         const message = await Message.findByPk(messageId);
//         if (!message) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         // Check if user is participant
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: message.conversation_id,
//             user_id: userId,
//             is_active: true
//           }
//         });
  
//         if (!participant) {
//           return res.status(403).json({ error: 'You are not a participant in this conversation' });
//         }
  
//         const reactions = await MessageReaction.findAll({
//           where: { message_id: messageId },
//           include: [{
//             model: User,
//             attributes: ['id', 'username']
//           }]
//         });
  
//         // Group reactions by type
//         const groupedReactions = {};
//         reactions.forEach(r => {
//           if (!groupedReactions[r.reaction]) {
//             groupedReactions[r.reaction] = [];
//           }
//           groupedReactions[r.reaction].push(r.User);
//         });
  
//         res.json({
//           reactions,
//           grouped: groupedReactions,
//           total: reactions.length
//         });
//       } catch (error) {
//         console.error('Error fetching reactions:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Edit a message
//     async editMessage(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
//         const { content } = req.body;
  
//         const message = await Message.findByPk(messageId);
//         if (!message) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         if (message.sender_id !== userId) {
//           return res.status(403).json({ error: 'You can only edit your own messages' });
//         }
  
//         await message.update({
//           content,
//           is_edited: true,
//           edited_at: new Date()
//         });
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.broadcastMessageEdit(message.conversation_id, message);
//         }
  
//         res.json(message);
//       } catch (error) {
//         console.error('Error editing message:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Delete a message (soft delete)
//     async deleteMessage(req, res) {
//       try {
//         const { messageId } = req.params;
//         const userId = req.user.id;
  
//         const message = await Message.findByPk(messageId);
//         if (!message) {
//           return res.status(404).json({ error: 'Message not found' });
//         }
  
//         if (message.sender_id !== userId) {
//           return res.status(403).json({ error: 'You can only delete your own messages' });
//         }
  
//         await message.update({
//           is_deleted: true,
//           deleted_at: new Date(),
//           content: '[Message deleted]'
//         });
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           socketService.broadcastMessageDeletion(message.conversation_id, messageId);
//         }
  
//         res.json({ message: 'Message deleted successfully' });
//       } catch (error) {
//         console.error('Error deleting message:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Mark messages as read
//     async markAsRead(req, res) {
//       try {
//         const { id } = req.params;
//         const userId = req.user.id;
//         const { message_ids } = req.body;
  
//         await MessageReadStatus.update(
//           { is_read: true, read_at: new Date() },
//           {
//             where: {
//               message_id: { [Op.in]: message_ids },
//               user_id: userId
//             }
//           }
//         );
  
//         // Emit socket event
//         const socketService = req.app.get('socketService');
//         if (socketService) {
//           message_ids.forEach(messageId => {
//             socketService.io.to(`conversation:${id}`).emit('message_read_update', {
//               messageId,
//               userId,
//               readAt: new Date()
//             });
//           });
//         }
  
//         res.json({ message: 'Messages marked as read' });
//       } catch (error) {
//         console.error('Error marking messages as read:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Download attachment
//     async downloadAttachment(req, res) {
//       try {
//         const { attachmentId } = req.params;
//         const userId = req.user.id;
  
//         const attachment = await MessageAttachment.findByPk(attachmentId, {
//           include: [{
//             model: Message,
//             include: [{
//               model: Conversation,
//               include: [{
//                 model: ConversationParticipant,
//                 where: {
//                   user_id: userId,
//                   is_active: true
//                 }
//               }]
//             }]
//           }]
//         });
  
//         if (!attachment) {
//           return res.status(404).json({ error: 'Attachment not found' });
//         }
  
//         const filePath = path.join(__dirname, '..', attachment.file_path);
//         if (!fs.existsSync(filePath)) {
//           return res.status(404).json({ error: 'File not found on server' });
//         }
  
//         res.download(filePath, attachment.file_name);
//       } catch (error) {
//         console.error('Error downloading attachment:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Get unread message count
//     async getUnreadCount(req, res) {
//       try {
//         const userId = req.user.id;
  
//         const unreadCount = await MessageReadStatus.count({
//           where: {
//             user_id: userId,
//             is_read: false
//           },
//           include: [{
//             model: Message,
//             where: {
//               sender_id: { [Op.ne]: userId },
//               is_deleted: false
//             }
//           }]
//         });
  
//         res.json({ unread_count: unreadCount });
//       } catch (error) {
//         console.error('Error getting unread count:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
  
//     // Search messages
//     async searchMessages(req, res) {
//       try {
//         const userId = req.user.id;
//         const { query, conversation_id, limit = 20 } = req.query;
  
//         if (!query) {
//           return res.status(400).json({ error: 'Search query is required' });
//         }
  
//         const whereClause = {
//           content: { [Op.like]: `%${query}%` },
//           is_deleted: false
//         };
  
//         if (conversation_id) {
//           whereClause.conversation_id = conversation_id;
//         }
  
//         const messages = await Message.findAll({
//           where: whereClause,
//           include: [
//             {
//               model: Conversation,
//               include: [{
//                 model: ConversationParticipant,
//                 where: {
//                   user_id: userId,
//                   is_active: true
//                 },
//                 required: true
//               }]
//             },
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             }
//           ],
//           limit: parseInt(limit),
//           order: [['created_at', 'DESC']]
//         });
  
//         res.json(messages);
//       } catch (error) {
//         console.error('Error searching messages:', error);
//         res.status(500).json({ error: error.message });
//       }
//     }
//   }
  
//   module.exports = new ChatController();





























  
  // controllers/ChatController.js - No Socket.IO Version

// const { 
//   Conversation, 
//   ConversationParticipant, 
//   Message, 
//   MessageAttachment, 
//   MessageReadStatus,
//   MessageReaction,
//   User 
// } = require('../models');
// const { Op } = require('sequelize');
// const path = require('path');
// const fs = require('fs');

// class ChatController {
//   // ============ CONVERSATION ENDPOINTS ============

//   // Get all conversations for the logged-in user
//   async getMyConversations(req, res) {
//     try {
//       const userId = req.user.id;
//       const { type, search, limit = 50, offset = 0 } = req.query;

//       const whereClause = {};
//       if (type) whereClause.type = type;
//       if (search) {
//         whereClause[Op.or] = [
//           { name: { [Op.like]: `%${search}%` } },
//           { description: { [Op.like]: `%${search}%` } }
//         ];
//       }

//       const conversations = await Conversation.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: ConversationParticipant,
//             where: { user_id: userId, is_active: true },
//             required: true
//           },
//           {
//             model: User,
//             as: 'participants',
//             attributes: ['id', 'username', 'email'],
//             through: { attributes: ['role', 'is_muted'] }
//           },
//           {
//             model: Message,
//             limit: 1,
//             order: [['created_at', 'DESC']],
//             include: [
//               {
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'username']
//               }
//             ]
//           }
//         ],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         order: [['last_message_at', 'DESC']]
//       });

//       // Get unread counts
//       for (let conv of conversations) {
//         const unreadCount = await Message.count({
//           where: {
//             conversation_id: conv.id,
//             sender_id: { [Op.ne]: userId }
//           },
//           include: [{
//             model: MessageReadStatus,
//             where: {
//               user_id: userId,
//               is_read: false
//             },
//             required: false
//           }]
//         });
//         conv.dataValues.unread_count = unreadCount;
//       }

//       res.json(conversations);
//     } catch (error) {
//       console.error('Error fetching conversations:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Create a new conversation (direct or group)
//   async createConversation(req, res) {
//     try {
//       const userId = req.user.id;
//       const { name, type = 'direct', participant_ids, description } = req.body;

//       // Validation
//       if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
//         return res.status(400).json({ error: 'Participant IDs are required' });
//       }

//       // For direct chat, ensure only 2 participants
//       if (type === 'direct' && participant_ids.length !== 1) {
//         return res.status(400).json({ error: 'Direct chat requires exactly one other participant' });
//       }

//       // Check if direct conversation already exists
//       if (type === 'direct') {
//         const existingConv = await Conversation.findOne({
//           where: { type: 'direct' },
//           include: [{
//             model: ConversationParticipant,
//             where: {
//               user_id: { [Op.in]: [userId, participant_ids[0]] },
//               is_active: true
//             }
//           }]
//         });

//         if (existingConv) {
//           const participantCount = await ConversationParticipant.count({
//             where: { 
//               conversation_id: existingConv.id,
//               user_id: { [Op.in]: [userId, participant_ids[0]] }
//             }
//           });

//           if (participantCount === 2) {
//             return res.status(200).json(existingConv);
//           }
//         }
//       }

//       // Create conversation
//       const conversation = await Conversation.create({
//         name: type === 'group' ? name : null,
//         type,
//         description,
//         created_by: userId
//       });

//       // Add creator as participant (admin for groups)
//       await ConversationParticipant.create({
//         conversation_id: conversation.id,
//         user_id: userId,
//         role: type === 'group' ? 'admin' : 'member'
//       });

//       // Add other participants
//       for (let participantId of participant_ids) {
//         await ConversationParticipant.create({
//           conversation_id: conversation.id,
//           user_id: participantId,
//           role: 'member'
//         });
//       }

//       // Fetch complete conversation with participants
//       const completeConversation = await Conversation.findByPk(conversation.id, {
//         include: [{
//           model: User,
//           as: 'participants',
//           attributes: ['id', 'username', 'email']
//         }]
//       });

//       res.status(201).json(completeConversation);
//     } catch (error) {
//       console.error('Error creating conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get single conversation details
//   async getConversation(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const conversation = await Conversation.findByPk(id, {
//         include: [{
//           model: User,
//           as: 'participants',
//           attributes: ['id', 'username', 'email', 'role'],
//           through: { attributes: ['role', 'joined_at', 'is_muted'] }
//         }]
//       });

//       res.json(conversation);
//     } catch (error) {
//       console.error('Error fetching conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Update conversation (group name, description, etc.)
//   async updateConversation(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { name, description } = req.body;

//       // Check if user is admin
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           role: 'admin',
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'Only group admins can update conversation details' });
//       }

//       const conversation = await Conversation.findByPk(id);
//       if (!conversation) {
//         return res.status(404).json({ error: 'Conversation not found' });
//       }

//       await conversation.update({ name, description });

//       res.json(conversation);
//     } catch (error) {
//       console.error('Error updating conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Add participants to group
//   async addParticipants(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { participant_ids } = req.body;

//       // Check if user is admin
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           role: 'admin',
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'Only group admins can add participants' });
//       }

//       const conversation = await Conversation.findByPk(id);
//       if (conversation.type !== 'group') {
//         return res.status(400).json({ error: 'Cannot add participants to direct chat' });
//       }

//       // Add participants
//       const added = [];
//       for (let participantId of participant_ids) {
//         const existing = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: participantId
//           }
//         });

//         if (!existing) {
//           await ConversationParticipant.create({
//             conversation_id: id,
//             user_id: participantId,
//             role: 'member'
//           });
//           added.push(participantId);
//         } else if (!existing.is_active) {
//           await existing.update({ is_active: true });
//           added.push(participantId);
//         }
//       }

//       res.json({ message: 'Participants added successfully', added });
//     } catch (error) {
//       console.error('Error adding participants:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Remove participant from group
//   async removeParticipant(req, res) {
//     try {
//       const { id, participantId } = req.params;
//       const userId = req.user.id;

//       // Check if user is admin or removing themselves
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant' });
//       }

//       if (participant.role !== 'admin' && userId !== participantId) {
//         return res.status(403).json({ error: 'Only admins can remove other participants' });
//       }

//       // Soft delete participant
//       await ConversationParticipant.update(
//         { is_active: false },
//         {
//           where: {
//             conversation_id: id,
//             user_id: participantId
//           }
//         }
//       );

//       res.json({ message: 'Participant removed successfully' });
//     } catch (error) {
//       console.error('Error removing participant:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // ============ MESSAGE ENDPOINTS ============

//   // Get messages for a conversation
//   async getMessages(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { limit = 50, offset = 0, before_date } = req.query;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const whereClause = {
//         conversation_id: id,
//         is_deleted: false
//       };

//       if (before_date) {
//         whereClause.created_at = { [Op.lt]: before_date };
//       }

//       const messages = await Message.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           },
//           {
//             model: MessageAttachment,
//             where: { is_active: true },
//             required: false
//           },
//           {
//             model: MessageReadStatus,
//             where: { user_id: userId },
//             required: false
//           },
//           {
//             model: MessageReaction,
//             include: [{
//               model: User,
//               attributes: ['id', 'username']
//             }]
//           },
//           {
//             model: Message,
//             as: 'parentMessage',
//             include: [{
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             }]
//           }
//         ],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         order: [['created_at', 'DESC']]
//       });

//       // Mark messages as read (optional - you might want to have a separate endpoint for this)
//       const messageIds = messages.map(m => m.id);
//       if (messageIds.length > 0) {
//         await MessageReadStatus.update(
//           { is_read: true, read_at: new Date() },
//           {
//             where: {
//               message_id: { [Op.in]: messageIds },
//               user_id: userId,
//               is_read: false
//             }
//           }
//         );
//       }

//       res.json(messages.reverse()); // Return in chronological order
//     } catch (error) {
//       console.error('Error fetching messages:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Send a message
//   async sendMessage(req, res) {
//     try {
//       const { id: conversation_id } = req.params;
//       const userId = req.user.id;
//       const { content, parent_message_id } = req.body;
//       const files = req.files;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       // Determine message type
//       let message_type = 'text';
//       if (files && files.length > 0) {
//         const file = files[0];
//         if (file.mimetype.startsWith('image/')) {
//           message_type = 'image';
//         } else {
//           message_type = 'document';
//         }
//       }

//       // Create message
//       const message = await Message.create({
//         conversation_id,
//         sender_id: userId,
//         content,
//         message_type,
//         parent_message_id
//       });

//       // Handle file attachments
//       if (files && files.length > 0) {
//         for (let file of files) {
//           await MessageAttachment.create({
//             message_id: message.id,
//             file_name: file.originalname,
//             file_path: file.path,
//             file_type: path.extname(file.originalname),
//             file_size: file.size,
//             mime_type: file.mimetype
//           });
//         }
//       }

//       // Update conversation last_message_at
//       await Conversation.update(
//         { last_message_at: new Date() },
//         { where: { id: conversation_id } }
//       );

//       // Create read status for all participants
//       const participants = await ConversationParticipant.findAll({
//         where: {
//           conversation_id,
//           is_active: true
//         }
//       });

//       for (let p of participants) {
//         await MessageReadStatus.create({
//           message_id: message.id,
//           user_id: p.user_id,
//           is_read: p.user_id === userId,
//           read_at: p.user_id === userId ? new Date() : null
//         });
//       }

//       // Fetch complete message with associations
//       const completeMessage = await Message.findByPk(message.id, {
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           },
//           {
//             model: MessageAttachment
//           },
//           {
//             model: MessageReaction,
//             include: [{
//               model: User,
//               attributes: ['id', 'username']
//             }]
//           }
//         ]
//       });

//       res.status(201).json(completeMessage);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Forward message to another conversation
//   async forwardMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { conversation_ids, additional_content } = req.body;

//       if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
//         return res.status(400).json({ error: 'Conversation IDs are required' });
//       }

//       // Get original message
//       const originalMessage = await Message.findByPk(messageId, {
//         include: [
//           {
//             model: MessageAttachment
//           },
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           }
//         ]
//       });

//       if (!originalMessage) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       const forwardedMessages = [];

//       for (let conversationId of conversation_ids) {
//         // Check if user is participant in target conversation
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: conversationId,
//             user_id: userId,
//             is_active: true
//           }
//         });

//         if (!participant) {
//           continue; // Skip conversations user is not part of
//         }

//         // Create forwarded message
//         const forwardContent = additional_content 
//           ? `${additional_content}\n\n[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`
//           : `[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`;

//         const newMessage = await Message.create({
//           conversation_id: conversationId,
//           sender_id: userId,
//           content: forwardContent,
//           message_type: originalMessage.message_type
//         });

//         // Copy attachments if any
//         if (originalMessage.MessageAttachments && originalMessage.MessageAttachments.length > 0) {
//           for (let attachment of originalMessage.MessageAttachments) {
//             await MessageAttachment.create({
//               message_id: newMessage.id,
//               file_name: attachment.file_name,
//               file_path: attachment.file_path,
//               file_type: attachment.file_type,
//               file_size: attachment.file_size,
//               mime_type: attachment.mime_type
//             });
//           }
//         }

//         // Update conversation last_message_at
//         await Conversation.update(
//           { last_message_at: new Date() },
//           { where: { id: conversationId } }
//         );

//         // Create read status for all participants
//         const participants = await ConversationParticipant.findAll({
//           where: {
//             conversation_id: conversationId,
//             is_active: true
//           }
//         });

//         for (let p of participants) {
//           await MessageReadStatus.create({
//             message_id: newMessage.id,
//             user_id: p.user_id,
//             is_read: p.user_id === userId,
//             read_at: p.user_id === userId ? new Date() : null
//           });
//         }

//         // Fetch complete message
//         const completeMessage = await Message.findByPk(newMessage.id, {
//           include: [
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             },
//             {
//               model: MessageAttachment
//             }
//           ]
//         });

//         forwardedMessages.push(completeMessage);
//       }

//       res.json({ 
//         message: 'Message forwarded successfully', 
//         forwarded_to: forwardedMessages.length,
//         messages: forwardedMessages 
//       });
//     } catch (error) {
//       console.error('Error forwarding message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Add reaction to message
//   async addReaction(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { reaction } = req.body;

//       if (!reaction) {
//         return res.status(400).json({ error: 'Reaction is required' });
//       }

//       // Get message to verify it exists and get conversation_id
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Check if user is participant in the conversation
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: message.conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       // Check if user already has this reaction
//       const existingReaction = await MessageReaction.findOne({
//         where: {
//           message_id: messageId,
//           user_id: userId,
//           reaction
//         }
//       });

//       if (existingReaction) {
//         return res.status(200).json({ message: 'Reaction already exists', reaction: existingReaction });
//       }

//       // Create reaction
//       const newReaction = await MessageReaction.create({
//         message_id: messageId,
//         user_id: userId,
//         reaction
//       });

//       // Fetch complete reaction with user info
//       const completeReaction = await MessageReaction.findByPk(newReaction.id, {
//         include: [{
//           model: User,
//           attributes: ['id', 'username']
//         }]
//       });

//       res.status(201).json(completeReaction);
//     } catch (error) {
//       console.error('Error adding reaction:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Remove reaction from message
//   async removeReaction(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { reaction } = req.body;

//       // Get message to verify it exists
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Delete reaction
//       const deleted = await MessageReaction.destroy({
//         where: {
//           message_id: messageId,
//           user_id: userId,
//           reaction
//         }
//       });

//       if (!deleted) {
//         return res.status(404).json({ error: 'Reaction not found' });
//       }

//       res.json({ message: 'Reaction removed successfully' });
//     } catch (error) {
//       console.error('Error removing reaction:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get reactions for a message
//   async getMessageReactions(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;

//       // Get message
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: message.conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const reactions = await MessageReaction.findAll({
//         where: { message_id: messageId },
//         include: [{
//           model: User,
//           attributes: ['id', 'username']
//         }]
//       });

//       // Group reactions by type
//       const groupedReactions = {};
//       reactions.forEach(r => {
//         if (!groupedReactions[r.reaction]) {
//           groupedReactions[r.reaction] = [];
//         }
//         groupedReactions[r.reaction].push(r.User);
//       });

//       res.json({
//         reactions,
//         grouped: groupedReactions,
//         total: reactions.length
//       });
//     } catch (error) {
//       console.error('Error fetching reactions:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Edit a message
//   async editMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { content } = req.body;

//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       if (message.sender_id !== userId) {
//         return res.status(403).json({ error: 'You can only edit your own messages' });
//       }

//       await message.update({
//         content,
//         is_edited: true,
//         edited_at: new Date()
//       });

//       res.json(message);
//     } catch (error) {
//       console.error('Error editing message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Delete a message (soft delete)
//   async deleteMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;

//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       if (message.sender_id !== userId) {
//         return res.status(403).json({ error: 'You can only delete your own messages' });
//       }

//       await message.update({
//         is_deleted: true,
//         deleted_at: new Date(),
//         content: '[Message deleted]'
//       });

//       res.json({ message: 'Message deleted successfully' });
//     } catch (error) {
//       console.error('Error deleting message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Mark messages as read
//   async markAsRead(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { message_ids } = req.body;

//       await MessageReadStatus.update(
//         { is_read: true, read_at: new Date() },
//         {
//           where: {
//             message_id: { [Op.in]: message_ids },
//             user_id: userId
//           }
//         }
//       );

//       res.json({ message: 'Messages marked as read' });
//     } catch (error) {
//       console.error('Error marking messages as read:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Download attachment
//   async downloadAttachment(req, res) {
//     try {
//       const { attachmentId } = req.params;
//       const userId = req.user.id;

//       const attachment = await MessageAttachment.findByPk(attachmentId, {
//         include: [{
//           model: Message,
//           include: [{
//             model: Conversation,
//             include: [{
//               model: ConversationParticipant,
//               where: {
//                 user_id: userId,
//                 is_active: true
//               }
//             }]
//           }]
//         }]
//       });

//       if (!attachment) {
//         return res.status(404).json({ error: 'Attachment not found' });
//       }

//       const filePath = path.join(__dirname, '..', attachment.file_path);
//       if (!fs.existsSync(filePath)) {
//         return res.status(404).json({ error: 'File not found on server' });
//       }

//       res.download(filePath, attachment.file_name);
//     } catch (error) {
//       console.error('Error downloading attachment:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get unread message count
//   async getUnreadCount(req, res) {
//     try {
//       const userId = req.user.id;

//       const unreadCount = await MessageReadStatus.count({
//         where: {
//           user_id: userId,
//           is_read: false
//         },
//         include: [{
//           model: Message,
//           where: {
//             sender_id: { [Op.ne]: userId },
//             is_deleted: false
//           }
//         }]
//       });

//       res.json({ unread_count: unreadCount });
//     } catch (error) {
//       console.error('Error getting unread count:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Search messages
//   async searchMessages(req, res) {
//     try {
//       const userId = req.user.id;
//       const { query, conversation_id, limit = 20 } = req.query;

//       if (!query) {
//         return res.status(400).json({ error: 'Search query is required' });
//       }

//       const whereClause = {
//         content: { [Op.like]: `%${query}%` },
//         is_deleted: false
//       };

//       if (conversation_id) {
//         whereClause.conversation_id = conversation_id;
//       }

//       const messages = await Message.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: Conversation,
//             include: [{
//               model: ConversationParticipant,
//               where: {
//                 user_id: userId,
//                 is_active: true
//               },
//               required: true
//             }]
//           },
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           }
//         ],
//         limit: parseInt(limit),
//         order: [['created_at', 'DESC']]
//       });

//       res.json(messages);
//     } catch (error) {
//       console.error('Error searching messages:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// }

// module.exports = new ChatController();
















// const { 
//   Conversation, 
//   ConversationParticipant, 
//   Message, 
//   MessageAttachment, 
//   MessageReadStatus,
//   MessageReaction,
//   User 
// } = require('../models');
// const { Op } = require('sequelize');
// const path = require('path');
// const fs = require('fs');

// class ChatController {
//   // ============ CONVERSATION ENDPOINTS ============

//   // Get all conversations for the logged-in user
//   async getMyConversations(req, res) {
//     try {
//       const userId = req.user.id;
//       const { type, search, limit = 50, offset = 0 } = req.query;

//       const whereClause = {};
//       if (type) whereClause.type = type;
//       if (search) {
//         whereClause[Op.or] = [
//           { name: { [Op.like]: `%${search}%` } },
//           { description: { [Op.like]: `%${search}%` } }
//         ];
//       }

//       const conversations = await Conversation.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: ConversationParticipant,
//             where: { user_id: userId, is_active: true },
//             required: true
//           },
//           {
//             model: User,
//             as: 'participants',
//             attributes: ['id', 'username', 'email'],
//             through: { attributes: ['role', 'is_muted'] }
//           },
//           {
//             model: Message,
//             limit: 1,
//             order: [['created_at', 'DESC']],
//             include: [
//               {
//                 model: User,
//                 as: 'sender',
//                 attributes: ['id', 'username']
//               },
//               {
//                 model: MessageAttachment,
//                 attributes: ['id', 'file_name', 'mime_type', 'file_type']
//               }
//             ]
//           }
//         ],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         order: [['last_message_at', 'DESC']]
//       });

//       // Get unread counts
//       for (let conv of conversations) {
//         const unreadCount = await Message.count({
//           where: {
//             conversation_id: conv.id,
//             sender_id: { [Op.ne]: userId }
//           },
//           include: [{
//             model: MessageReadStatus,
//             where: {
//               user_id: userId,
//               is_read: false
//             },
//             required: false
//           }]
//         });
//         conv.dataValues.unread_count = unreadCount;
//       }

//       res.json(conversations);
//     } catch (error) {
//       console.error('Error fetching conversations:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Create a new conversation (direct or group)
//   async createConversation(req, res) {
//     try {
//       const userId = req.user.id;
//       const { name, type = 'direct', participant_ids, description } = req.body;

//       // Validation
//       if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
//         return res.status(400).json({ error: 'Participant IDs are required' });
//       }

//       // For direct chat, ensure only 2 participants
//       if (type === 'direct' && participant_ids.length !== 1) {
//         return res.status(400).json({ error: 'Direct chat requires exactly one other participant' });
//       }

//       // Check if direct conversation already exists
//       if (type === 'direct') {
//         const existingConv = await Conversation.findOne({
//           where: { type: 'direct' },
//           include: [{
//             model: ConversationParticipant,
//             where: {
//               user_id: { [Op.in]: [userId, participant_ids[0]] },
//               is_active: true
//             }
//           }]
//         });

//         if (existingConv) {
//           const participantCount = await ConversationParticipant.count({
//             where: { 
//               conversation_id: existingConv.id,
//               user_id: { [Op.in]: [userId, participant_ids[0]] }
//             }
//           });

//           if (participantCount === 2) {
//             return res.status(200).json(existingConv);
//           }
//         }
//       }

//       // Create conversation
//       const conversation = await Conversation.create({
//         name: type === 'group' ? name : null,
//         type,
//         description,
//         created_by: userId
//       });

//       // Add creator as participant (admin for groups)
//       await ConversationParticipant.create({
//         conversation_id: conversation.id,
//         user_id: userId,
//         role: type === 'group' ? 'admin' : 'member'
//       });

//       // Add other participants
//       for (let participantId of participant_ids) {
//         await ConversationParticipant.create({
//           conversation_id: conversation.id,
//           user_id: participantId,
//           role: 'member'
//         });
//       }

//       // Fetch complete conversation with participants
//       const completeConversation = await Conversation.findByPk(conversation.id, {
//         include: [{
//           model: User,
//           as: 'participants',
//           attributes: ['id', 'username', 'email']
//         }]
//       });

//       res.status(201).json(completeConversation);
//     } catch (error) {
//       console.error('Error creating conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get single conversation details
//   async getConversation(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const conversation = await Conversation.findByPk(id, {
//         include: [{
//           model: User,
//           as: 'participants',
//           attributes: ['id', 'username', 'email', 'role'],
//           through: { attributes: ['role', 'joined_at', 'is_muted'] }
//         }]
//       });

//       res.json(conversation);
//     } catch (error) {
//       console.error('Error fetching conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Update conversation (group name, description, etc.)
//   async updateConversation(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { name, description } = req.body;

//       // Check if user is admin
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           role: 'admin',
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'Only group admins can update conversation details' });
//       }

//       const conversation = await Conversation.findByPk(id);
//       if (!conversation) {
//         return res.status(404).json({ error: 'Conversation not found' });
//       }

//       await conversation.update({ name, description });

//       res.json(conversation);
//     } catch (error) {
//       console.error('Error updating conversation:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Add participants to group
//   async addParticipants(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { participant_ids, user_ids } = req.body; // Support both parameter names

//       const userIdsToAdd = participant_ids || user_ids;

//       if (!userIdsToAdd || !Array.isArray(userIdsToAdd)) {
//         return res.status(400).json({ error: 'User IDs are required' });
//       }

//       // Check if user is admin
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           role: 'admin',
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'Only group admins can add participants' });
//       }

//       const conversation = await Conversation.findByPk(id);
//       if (conversation.type !== 'group') {
//         return res.status(400).json({ error: 'Cannot add participants to direct chat' });
//       }

//       // Add participants
//       const added = [];
//       for (let participantId of userIdsToAdd) {
//         const existing = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: id,
//             user_id: participantId
//           }
//         });

//         if (!existing) {
//           await ConversationParticipant.create({
//             conversation_id: id,
//             user_id: participantId,
//             role: 'member'
//           });
//           added.push(participantId);
//         } else if (!existing.is_active) {
//           await existing.update({ is_active: true });
//           added.push(participantId);
//         }
//       }

//       res.json({ message: 'Participants added successfully', added });
//     } catch (error) {
//       console.error('Error adding participants:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Remove participant from group
//   async removeParticipant(req, res) {
//     try {
//       const { id, participantId } = req.params;
//       const userId = req.user.id;

//       // Check if user is admin or removing themselves
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant' });
//       }

//       if (participant.role !== 'admin' && userId !== participantId) {
//         return res.status(403).json({ error: 'Only admins can remove other participants' });
//       }

//       // Soft delete participant
//       await ConversationParticipant.update(
//         { is_active: false },
//         {
//           where: {
//             conversation_id: id,
//             user_id: participantId
//           }
//         }
//       );

//       res.json({ message: 'Participant removed successfully' });
//     } catch (error) {
//       console.error('Error removing participant:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // ============ MESSAGE ENDPOINTS ============

//   // Get messages for a conversation
//   async getMessages(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { limit = 50, offset = 0, before_date } = req.query;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const whereClause = {
//         conversation_id: id,
//         is_deleted: false
//       };

//       if (before_date) {
//         whereClause.created_at = { [Op.lt]: before_date };
//       }

//       const messages = await Message.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           },
//           {
//             model: MessageAttachment,
//             where: { is_active: true },
//             required: false,
//             attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
//           },
//           {
//             model: MessageReadStatus,
//             where: { user_id: userId },
//             required: false
//           },
//           {
//             model: MessageReaction,
//             include: [{
//               model: User,
//               attributes: ['id', 'username']
//             }]
//           },
//           {
//             model: Message,
//             as: 'parentMessage',
//             include: [{
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             }]
//           }
//         ],
//         limit: parseInt(limit),
//         offset: parseInt(offset),
//         order: [['created_at', 'DESC']]
//       });

//       // Mark messages as read (optional - you might want to have a separate endpoint for this)
//       const messageIds = messages.map(m => m.id);
//       if (messageIds.length > 0) {
//         await MessageReadStatus.update(
//           { is_read: true, read_at: new Date() },
//           {
//             where: {
//               message_id: { [Op.in]: messageIds },
//               user_id: userId,
//               is_read: false
//             }
//           }
//         );
//       }

//       res.json(messages.reverse()); // Return in chronological order
//     } catch (error) {
//       console.error('Error fetching messages:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Send a message
//   async sendMessage(req, res) {
//     try {
//       const { id: conversation_id } = req.params;
//       const userId = req.user.id;
//       const { content, parent_message_id } = req.body;
//       const files = req.files;

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       // Determine message type
//       let message_type = 'text';
//       if (files && files.length > 0) {
//         const file = files[0];
//         if (file.mimetype.startsWith('image/')) {
//           message_type = 'image';
//         } else {
//           message_type = 'document';
//         }
//       }

//       // Create message
//       const message = await Message.create({
//         conversation_id,
//         sender_id: userId,
//         content: content || '', // Allow empty content if there are files
//         message_type,
//         parent_message_id
//       });

//       // Handle file attachments
//       if (files && files.length > 0) {
//         for (let file of files) {
//           await MessageAttachment.create({
//             message_id: message.id,
//             file_name: file.originalname,
//             file_path: file.path,
//             file_type: path.extname(file.originalname),
//             file_size: file.size,
//             mime_type: file.mimetype
//           });
//         }
//       }

//       // Update conversation last_message_at
//       await Conversation.update(
//         { last_message_at: new Date() },
//         { where: { id: conversation_id } }
//       );

//       // Create read status for all participants
//       const participants = await ConversationParticipant.findAll({
//         where: {
//           conversation_id,
//           is_active: true
//         }
//       });

//       for (let p of participants) {
//         await MessageReadStatus.create({
//           message_id: message.id,
//           user_id: p.user_id,
//           is_read: p.user_id === userId,
//           read_at: p.user_id === userId ? new Date() : null
//         });
//       }

//       // Fetch complete message with associations
//       const completeMessage = await Message.findByPk(message.id, {
//         include: [
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           },
//           {
//             model: MessageAttachment,
//             attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
//           },
//           {
//             model: MessageReaction,
//             include: [{
//               model: User,
//               attributes: ['id', 'username']
//             }]
//           }
//         ]
//       });

//       res.status(201).json(completeMessage);
//     } catch (error) {
//       console.error('Error sending message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Forward message to another conversation
//   async forwardMessage(req, res) {
//     try {
//       const { messageId } = req.params; // Fixed parameter name
//       const userId = req.user.id;
//       const { conversation_ids, additional_content } = req.body;

//       if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
//         return res.status(400).json({ error: 'Conversation IDs are required' });
//       }

//       // Get original message
//       const originalMessage = await Message.findByPk(messageId, {
//         include: [
//           {
//             model: MessageAttachment,
//             attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
//           },
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           }
//         ]
//       });

//       if (!originalMessage) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       const forwardedMessages = [];

//       for (let conversationId of conversation_ids) {
//         // Check if user is participant in target conversation
//         const participant = await ConversationParticipant.findOne({
//           where: {
//             conversation_id: conversationId,
//             user_id: userId,
//             is_active: true
//           }
//         });

//         if (!participant) {
//           continue; // Skip conversations user is not part of
//         }

//         // Create forwarded message
//         const forwardContent = additional_content 
//           ? `${additional_content}\n\n[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`
//           : `[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`;

//         const newMessage = await Message.create({
//           conversation_id: conversationId,
//           sender_id: userId,
//           content: forwardContent,
//           message_type: originalMessage.message_type
//         });

//         // Copy attachments if any
//         if (originalMessage.MessageAttachments && originalMessage.MessageAttachments.length > 0) {
//           for (let attachment of originalMessage.MessageAttachments) {
//             await MessageAttachment.create({
//               message_id: newMessage.id,
//               file_name: attachment.file_name,
//               file_path: attachment.file_path,
//               file_type: attachment.file_type,
//               file_size: attachment.file_size,
//               mime_type: attachment.mime_type
//             });
//           }
//         }

//         // Update conversation last_message_at
//         await Conversation.update(
//           { last_message_at: new Date() },
//           { where: { id: conversationId } }
//         );

//         // Create read status for all participants
//         const participants = await ConversationParticipant.findAll({
//           where: {
//             conversation_id: conversationId,
//             is_active: true
//           }
//         });

//         for (let p of participants) {
//           await MessageReadStatus.create({
//             message_id: newMessage.id,
//             user_id: p.user_id,
//             is_read: p.user_id === userId,
//             read_at: p.user_id === userId ? new Date() : null
//           });
//         }

//         // Fetch complete message
//         const completeMessage = await Message.findByPk(newMessage.id, {
//           include: [
//             {
//               model: User,
//               as: 'sender',
//               attributes: ['id', 'username']
//             },
//             {
//               model: MessageAttachment,
//               attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
//             }
//           ]
//         });

//         forwardedMessages.push(completeMessage);
//       }

//       res.json({ 
//         message: 'Message forwarded successfully', 
//         forwarded_to: forwardedMessages.length,
//         messages: forwardedMessages 
//       });
//     } catch (error) {
//       console.error('Error forwarding message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Add reaction to message
//   async addReaction(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { reaction } = req.body;

//       if (!reaction) {
//         return res.status(400).json({ error: 'Reaction is required' });
//       }

//       // Get message to verify it exists and get conversation_id
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Check if user is participant in the conversation
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: message.conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       // Check if user already has this reaction
//       const existingReaction = await MessageReaction.findOne({
//         where: {
//           message_id: messageId,
//           user_id: userId,
//           reaction
//         }
//       });

//       if (existingReaction) {
//         return res.status(200).json({ message: 'Reaction already exists', reaction: existingReaction });
//       }

//       // Create reaction
//       const newReaction = await MessageReaction.create({
//         message_id: messageId,
//         user_id: userId,
//         reaction
//       });

//       // Fetch complete reaction with user info
//       const completeReaction = await MessageReaction.findByPk(newReaction.id, {
//         include: [{
//           model: User,
//           attributes: ['id', 'username']
//         }]
//       });

//       res.status(201).json(completeReaction);
//     } catch (error) {
//       console.error('Error adding reaction:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Remove reaction from message
//   async removeReaction(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { reaction } = req.body;

//       // Get message to verify it exists
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Delete reaction
//       const deleted = await MessageReaction.destroy({
//         where: {
//           message_id: messageId,
//           user_id: userId,
//           reaction
//         }
//       });

//       if (!deleted) {
//         return res.status(404).json({ error: 'Reaction not found' });
//       }

//       res.json({ message: 'Reaction removed successfully' });
//     } catch (error) {
//       console.error('Error removing reaction:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get reactions for a message
//   async getMessageReactions(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;

//       // Get message
//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       // Check if user is participant
//       const participant = await ConversationParticipant.findOne({
//         where: {
//           conversation_id: message.conversation_id,
//           user_id: userId,
//           is_active: true
//         }
//       });

//       if (!participant) {
//         return res.status(403).json({ error: 'You are not a participant in this conversation' });
//       }

//       const reactions = await MessageReaction.findAll({
//         where: { message_id: messageId },
//         include: [{
//           model: User,
//           attributes: ['id', 'username']
//         }]
//       });

//       // Group reactions by type
//       const groupedReactions = {};
//       reactions.forEach(r => {
//         if (!groupedReactions[r.reaction]) {
//           groupedReactions[r.reaction] = [];
//         }
//         groupedReactions[r.reaction].push(r.User);
//       });

//       res.json({
//         reactions,
//         grouped: groupedReactions,
//         total: reactions.length
//       });
//     } catch (error) {
//       console.error('Error fetching reactions:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Edit a message
//   async editMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;
//       const { content } = req.body;

//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       if (message.sender_id !== userId) {
//         return res.status(403).json({ error: 'You can only edit your own messages' });
//       }

//       await message.update({
//         content,
//         is_edited: true,
//         edited_at: new Date()
//       });

//       res.json(message);
//     } catch (error) {
//       console.error('Error editing message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Delete a message (soft delete)
//   async deleteMessage(req, res) {
//     try {
//       const { messageId } = req.params;
//       const userId = req.user.id;

//       const message = await Message.findByPk(messageId);
//       if (!message) {
//         return res.status(404).json({ error: 'Message not found' });
//       }

//       if (message.sender_id !== userId) {
//         return res.status(403).json({ error: 'You can only delete your own messages' });
//       }

//       await message.update({
//         is_deleted: true,
//         deleted_at: new Date(),
//         content: '[Message deleted]'
//       });

//       res.json({ message: 'Message deleted successfully' });
//     } catch (error) {
//       console.error('Error deleting message:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Mark messages as read
//   async markAsRead(req, res) {
//     try {
//       const { id } = req.params;
//       const userId = req.user.id;
//       const { message_ids } = req.body;

//       await MessageReadStatus.update(
//         { is_read: true, read_at: new Date() },
//         {
//           where: {
//             message_id: { [Op.in]: message_ids },
//             user_id: userId
//           }
//         }
//       );

//       res.json({ message: 'Messages marked as read' });
//     } catch (error) {
//       console.error('Error marking messages as read:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Download attachment
//   async downloadAttachment(req, res) {
//     try {
//       const { attachmentId } = req.params;
//       const userId = req.user.id;

//       const attachment = await MessageAttachment.findByPk(attachmentId, {
//         include: [{
//           model: Message,
//           include: [{
//             model: Conversation,
//             include: [{
//               model: ConversationParticipant,
//               where: {
//                 user_id: userId,
//                 is_active: true
//               }
//             }]
//           }]
//         }]
//       });

//       if (!attachment) {
//         return res.status(404).json({ error: 'Attachment not found' });
//       }

//       const filePath = path.join(__dirname, '..', attachment.file_path);
//       if (!fs.existsSync(filePath)) {
//         return res.status(404).json({ error: 'File not found on server' });
//       }

//       res.download(filePath, attachment.file_name);
//     } catch (error) {
//       console.error('Error downloading attachment:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Get unread message count
//   async getUnreadCount(req, res) {
//     try {
//       const userId = req.user.id;

//       const unreadCount = await MessageReadStatus.count({
//         where: {
//           user_id: userId,
//           is_read: false
//         },
//         include: [{
//           model: Message,
//           where: {
//             sender_id: { [Op.ne]: userId },
//             is_deleted: false
//           }
//         }]
//       });

//       res.json({ unread_count: unreadCount });
//     } catch (error) {
//       console.error('Error getting unread count:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }

//   // Search messages
//   async searchMessages(req, res) {
//     try {
//       const userId = req.user.id;
//       const { query, conversation_id, limit = 20 } = req.query;

//       if (!query) {
//         return res.status(400).json({ error: 'Search query is required' });
//       }

//       const whereClause = {
//         content: { [Op.like]: `%${query}%` },
//         is_deleted: false
//       };

//       if (conversation_id) {
//         whereClause.conversation_id = conversation_id;
//       }

//       const messages = await Message.findAll({
//         where: whereClause,
//         include: [
//           {
//             model: Conversation,
//             include: [{
//               model: ConversationParticipant,
//               where: {
//                 user_id: userId,
//                 is_active: true
//               },
//               required: true
//             }]
//           },
//           {
//             model: User,
//             as: 'sender',
//             attributes: ['id', 'username']
//           }
//         ],
//         limit: parseInt(limit),
//         order: [['created_at', 'DESC']]
//       });

//       res.json(messages);
//     } catch (error) {
//       console.error('Error searching messages:', error);
//       res.status(500).json({ error: error.message });
//     }
//   }
// }

// module.exports = new ChatController();



const { 
  Conversation, 
  ConversationParticipant, 
  Message, 
  MessageAttachment, 
  MessageReadStatus,
  MessageReaction,
  User 
} = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

class ChatController {
  // ============ CONVERSATION ENDPOINTS ============

  // Get all conversations for the logged-in user
  async getMyConversations(req, res) {
    try {
      const userId = req.user.id;
      const { type, search, limit = 50, offset = 0 } = req.query;

      const whereClause = {};
      if (type) whereClause.type = type;
      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const conversations = await Conversation.findAll({
        where: whereClause,
        include: [
          {
            model: ConversationParticipant,
            where: { user_id: userId, is_active: true },
            required: true
          },
          {
            model: User,
            as: 'participants',
            attributes: ['id', 'username', 'email'],
            through: { attributes: ['role', 'is_muted'] }
          },
          {
            model: Message,
            limit: 1,
            order: [['created_at', 'DESC']],
            include: [
              {
                model: User,
                as: 'sender',
                attributes: ['id', 'username']
              },
              {
                model: MessageAttachment,
                attributes: ['id', 'file_name', 'mime_type', 'file_type']
              }
            ]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['last_message_at', 'DESC']]
      });

      // Get unread counts
      for (let conv of conversations) {
        const unreadCount = await Message.count({
          where: {
            conversation_id: conv.id,
            sender_id: { [Op.ne]: userId }
          },
          include: [{
            model: MessageReadStatus,
            where: {
              user_id: userId,
              is_read: false
            },
            required: false
          }]
        });
        conv.dataValues.unread_count = unreadCount;
      }

      res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Create a new conversation (direct or group)
  async createConversation(req, res) {
    try {
      const userId = req.user.id;
      const { name, type = 'direct', participant_ids, description } = req.body;

      // Validation
      if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
        return res.status(400).json({ error: 'Participant IDs are required' });
      }

      // For direct chat, ensure only 2 participants
      if (type === 'direct' && participant_ids.length !== 1) {
        return res.status(400).json({ error: 'Direct chat requires exactly one other participant' });
      }

      // Check if direct conversation already exists
      if (type === 'direct') {
        const existingConv = await Conversation.findOne({
          where: { type: 'direct' },
          include: [{
            model: ConversationParticipant,
            where: {
              user_id: { [Op.in]: [userId, participant_ids[0]] },
              is_active: true
            }
          }]
        });

        if (existingConv) {
          const participantCount = await ConversationParticipant.count({
            where: { 
              conversation_id: existingConv.id,
              user_id: { [Op.in]: [userId, participant_ids[0]] }
            }
          });

          if (participantCount === 2) {
            return res.status(200).json(existingConv);
          }
        }
      }

      // Create conversation
      const conversation = await Conversation.create({
        name: type === 'group' ? name : null,
        type,
        description,
        created_by: userId
      });

      // Add creator as participant (admin for groups)
      await ConversationParticipant.create({
        conversation_id: conversation.id,
        user_id: userId,
        role: type === 'group' ? 'admin' : 'member'
      });

      // Add other participants
      for (let participantId of participant_ids) {
        await ConversationParticipant.create({
          conversation_id: conversation.id,
          user_id: participantId,
          role: 'member'
        });
      }

      // Fetch complete conversation with participants
      const completeConversation = await Conversation.findByPk(conversation.id, {
        include: [{
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'email']
        }]
      });

      res.status(201).json(completeConversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get single conversation details
  async getConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user is participant
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }

      const conversation = await Conversation.findByPk(id, {
        include: [{
          model: User,
          as: 'participants',
          attributes: ['id', 'username', 'email', 'role'],
          through: { attributes: ['role', 'joined_at', 'is_muted'] }
        }]
      });

      res.json(conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Update conversation (group name, description, etc.)
  async updateConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, description } = req.body;

      // Check if user is admin
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: id,
          user_id: userId,
          role: 'admin',
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only group admins can update conversation details' });
      }

      const conversation = await Conversation.findByPk(id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      await conversation.update({ name, description });

      res.json(conversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add participants to group
  async addParticipants(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { participant_ids, user_ids } = req.body; // Support both parameter names

      const userIdsToAdd = participant_ids || user_ids;

      if (!userIdsToAdd || !Array.isArray(userIdsToAdd)) {
        return res.status(400).json({ error: 'User IDs are required' });
      }

      // Check if user is admin
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: id,
          user_id: userId,
          role: 'admin',
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'Only group admins can add participants' });
      }

      const conversation = await Conversation.findByPk(id);
      if (conversation.type !== 'group') {
        return res.status(400).json({ error: 'Cannot add participants to direct chat' });
      }

      // Add participants
      const added = [];
      for (let participantId of userIdsToAdd) {
        const existing = await ConversationParticipant.findOne({
          where: {
            conversation_id: id,
            user_id: participantId
          }
        });

        if (!existing) {
          await ConversationParticipant.create({
            conversation_id: id,
            user_id: participantId,
            role: 'member'
          });
          added.push(participantId);
        } else if (!existing.is_active) {
          await existing.update({ is_active: true });
          added.push(participantId);
        }
      }

      res.json({ message: 'Participants added successfully', added });
    } catch (error) {
      console.error('Error adding participants:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove participant from group
  async removeParticipant(req, res) {
    try {
      const { id, participantId } = req.params;
      const userId = req.user.id;

      // Check if user is admin or removing themselves
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant' });
      }

      if (participant.role !== 'admin' && userId !== participantId) {
        return res.status(403).json({ error: 'Only admins can remove other participants' });
      }

      // Soft delete participant
      await ConversationParticipant.update(
        { is_active: false },
        {
          where: {
            conversation_id: id,
            user_id: participantId
          }
        }
      );

      res.json({ message: 'Participant removed successfully' });
    } catch (error) {
      console.error('Error removing participant:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // ============ MESSAGE ENDPOINTS ============

  // Get messages for a conversation
  async getMessages(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { limit = 50, offset = 0, before_date } = req.query;

      // Check if user is participant
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }

      const whereClause = {
        conversation_id: id,
        is_deleted: false
      };

      if (before_date) {
        whereClause.created_at = { [Op.lt]: before_date };
      }

      const messages = await Message.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          },
          {
            model: MessageAttachment,
            where: { is_active: true },
            required: false,
            attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
          },
          {
            model: MessageReadStatus,
            where: { user_id: userId },
            required: false
          },
          {
            model: MessageReaction,
            include: [{
              model: User,
              attributes: ['id', 'username']
            }]
          },
          {
            model: Message,
            as: 'parentMessage',
            include: [{
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            }]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      // Mark messages as read (optional - you might want to have a separate endpoint for this)
      const messageIds = messages.map(m => m.id);
      if (messageIds.length > 0) {
        await MessageReadStatus.update(
          { is_read: true, read_at: new Date() },
          {
            where: {
              message_id: { [Op.in]: messageIds },
              user_id: userId,
              is_read: false
            }
          }
        );
      }

      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Send a message
  async sendMessage(req, res) {
    try {
      const { id: conversation_id } = req.params;
      const userId = req.user.id;
      const { content, parent_message_id } = req.body;
      const files = req.files;

      // Check if user is participant
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }

      // Determine message type
      let message_type = 'text';
      if (files && files.length > 0) {
        const file = files[0];
        if (file.mimetype.startsWith('image/')) {
          message_type = 'image';
        } else {
          message_type = 'document';
        }
      }

      // Create message
      const message = await Message.create({
        conversation_id,
        sender_id: userId,
        content: content || '', // Allow empty content if there are files
        message_type,
        parent_message_id
      });

      // Handle file attachments
      if (files && files.length > 0) {
        for (let file of files) {
          await MessageAttachment.create({
            message_id: message.id,
            file_name: file.originalname,
            file_path: file.path,
            file_type: path.extname(file.originalname),
            file_size: file.size,
            mime_type: file.mimetype
          });
        }
      }

      // Update conversation last_message_at
      await Conversation.update(
        { last_message_at: new Date() },
        { where: { id: conversation_id } }
      );

      // Create read status for all participants
      const participants = await ConversationParticipant.findAll({
        where: {
          conversation_id,
          is_active: true
        }
      });

      for (let p of participants) {
        await MessageReadStatus.create({
          message_id: message.id,
          user_id: p.user_id,
          is_read: p.user_id === userId,
          read_at: p.user_id === userId ? new Date() : null
        });
      }

      // Fetch complete message with associations
      const completeMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          },
          {
            model: MessageAttachment,
            attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
          },
          {
            model: MessageReaction,
            include: [{
              model: User,
              attributes: ['id', 'username']
            }]
          }
        ]
      });

      res.status(201).json(completeMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Forward message to another conversation
  async forwardMessage(req, res) {
    try {
      const { messageId } = req.params; // Fixed parameter name
      const userId = req.user.id;
      const { conversation_ids, additional_content } = req.body;

      if (!conversation_ids || !Array.isArray(conversation_ids) || conversation_ids.length === 0) {
        return res.status(400).json({ error: 'Conversation IDs are required' });
      }

      // Get original message
      const originalMessage = await Message.findByPk(messageId, {
        include: [
          {
            model: MessageAttachment,
            attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
          },
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          }
        ]
      });

      if (!originalMessage) {
        return res.status(404).json({ error: 'Message not found' });
      }

      const forwardedMessages = [];

      for (let conversationId of conversation_ids) {
        // Check if user is participant in target conversation
        const participant = await ConversationParticipant.findOne({
          where: {
            conversation_id: conversationId,
            user_id: userId,
            is_active: true
          }
        });

        if (!participant) {
          continue; // Skip conversations user is not part of
        }

        // Create forwarded message
        const forwardContent = additional_content 
          ? `${additional_content}\n\n[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`
          : `[Forwarded from ${originalMessage.sender.username}]\n${originalMessage.content}`;

        const newMessage = await Message.create({
          conversation_id: conversationId,
          sender_id: userId,
          content: forwardContent,
          message_type: originalMessage.message_type
        });

        // Copy attachments if any
        if (originalMessage.MessageAttachments && originalMessage.MessageAttachments.length > 0) {
          for (let attachment of originalMessage.MessageAttachments) {
            await MessageAttachment.create({
              message_id: newMessage.id,
              file_name: attachment.file_name,
              file_path: attachment.file_path,
              file_type: attachment.file_type,
              file_size: attachment.file_size,
              mime_type: attachment.mime_type
            });
          }
        }

        // Update conversation last_message_at
        await Conversation.update(
          { last_message_at: new Date() },
          { where: { id: conversationId } }
        );

        // Create read status for all participants
        const participants = await ConversationParticipant.findAll({
          where: {
            conversation_id: conversationId,
            is_active: true
          }
        });

        for (let p of participants) {
          await MessageReadStatus.create({
            message_id: newMessage.id,
            user_id: p.user_id,
            is_read: p.user_id === userId,
            read_at: p.user_id === userId ? new Date() : null
          });
        }

        // Fetch complete message
        const completeMessage = await Message.findByPk(newMessage.id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'username']
            },
            {
              model: MessageAttachment,
              attributes: ['id', 'file_name', 'file_path', 'file_type', 'file_size', 'mime_type']
            }
          ]
        });

        forwardedMessages.push(completeMessage);
      }

      res.json({ 
        message: 'Message forwarded successfully', 
        forwarded_to: forwardedMessages.length,
        messages: forwardedMessages 
      });
    } catch (error) {
      console.error('Error forwarding message:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Add reaction to message
  async addReaction(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const { reaction } = req.body;

      if (!reaction) {
        return res.status(400).json({ error: 'Reaction is required' });
      }

      // Get message to verify it exists and get conversation_id
      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is participant in the conversation
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: message.conversation_id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }

      // Check if user already has this reaction
      const existingReaction = await MessageReaction.findOne({
        where: {
          message_id: messageId,
          user_id: userId,
          reaction
        }
      });

      if (existingReaction) {
        return res.status(200).json({ message: 'Reaction already exists', reaction: existingReaction });
      }

      // Create reaction
      const newReaction = await MessageReaction.create({
        message_id: messageId,
        user_id: userId,
        reaction
      });

      // Fetch complete reaction with user info
      const completeReaction = await MessageReaction.findByPk(newReaction.id, {
        include: [{
          model: User,
          attributes: ['id', 'username']
        }]
      });

      res.status(201).json(completeReaction);
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Remove reaction from message
  async removeReaction(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const { reaction } = req.body;

      // Get message to verify it exists
      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Delete reaction
      const deleted = await MessageReaction.destroy({
        where: {
          message_id: messageId,
          user_id: userId,
          reaction
        }
      });

      if (!deleted) {
        return res.status(404).json({ error: 'Reaction not found' });
      }

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Error removing reaction:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get reactions for a message
  async getMessageReactions(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      // Get message
      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // Check if user is participant
      const participant = await ConversationParticipant.findOne({
        where: {
          conversation_id: message.conversation_id,
          user_id: userId,
          is_active: true
        }
      });

      if (!participant) {
        return res.status(403).json({ error: 'You are not a participant in this conversation' });
      }

      const reactions = await MessageReaction.findAll({
        where: { message_id: messageId },
        include: [{
          model: User,
          attributes: ['id', 'username']
        }]
      });

      // Group reactions by type
      const groupedReactions = {};
      reactions.forEach(r => {
        if (!groupedReactions[r.reaction]) {
          groupedReactions[r.reaction] = [];
        }
        groupedReactions[r.reaction].push(r.User);
      });

      res.json({
        reactions,
        grouped: groupedReactions,
        total: reactions.length
      });
    } catch (error) {
      console.error('Error fetching reactions:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Edit a message
  async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (message.sender_id !== userId) {
        return res.status(403).json({ error: 'You can only edit your own messages' });
      }

      await message.update({
        content,
        is_edited: true,
        edited_at: new Date()
      });

      res.json(message);
    } catch (error) {
      console.error('Error editing message:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Delete a message (soft delete)
  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const message = await Message.findByPk(messageId);
      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (message.sender_id !== userId) {
        return res.status(403).json({ error: 'You can only delete your own messages' });
      }

      await message.update({
        is_deleted: true,
        deleted_at: new Date(),
        content: '[Message deleted]'
      });

      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Mark messages as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { message_ids } = req.body;

      await MessageReadStatus.update(
        { is_read: true, read_at: new Date() },
        {
          where: {
            message_id: { [Op.in]: message_ids },
            user_id: userId
          }
        }
      );

      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Download attachment
  async downloadAttachment(req, res) {
    try {
      const { attachmentId } = req.params;
      let userId;

      // Try to get user from either middleware (Authorization header) or query token
      if (req.user) {
        userId = req.user.id;
      } else if (req.query.token) {
        // Decode token from query parameter
        const jwt = require('jsonwebtoken');
        try {
          const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
          userId = decoded.id;
        } catch (error) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      } else {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const attachment = await MessageAttachment.findByPk(attachmentId, {
        include: [{
          model: Message,
          include: [{
            model: Conversation,
            include: [{
              model: ConversationParticipant,
              where: {
                user_id: userId,
                is_active: true
              }
            }]
          }]
        }]
      });

      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      const filePath = path.join(__dirname, '..', attachment.file_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on server' });
      }

      // Set appropriate headers for file type
      res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${attachment.file_name}"`);
      
      // Send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Error downloading attachment:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Get unread message count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;

      const unreadCount = await MessageReadStatus.count({
        where: {
          user_id: userId,
          is_read: false
        },
        include: [{
          model: Message,
          where: {
            sender_id: { [Op.ne]: userId },
            is_deleted: false
          }
        }]
      });

      res.json({ unread_count: unreadCount });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // Search messages
  async searchMessages(req, res) {
    try {
      const userId = req.user.id;
      const { query, conversation_id, limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const whereClause = {
        content: { [Op.like]: `%${query}%` },
        is_deleted: false
      };

      if (conversation_id) {
        whereClause.conversation_id = conversation_id;
      }

      const messages = await Message.findAll({
        where: whereClause,
        include: [
          {
            model: Conversation,
            include: [{
              model: ConversationParticipant,
              where: {
                user_id: userId,
                is_active: true
              },
              required: true
            }]
          },
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username']
          }
        ],
        limit: parseInt(limit),
        order: [['created_at', 'DESC']]
      });

      res.json(messages);
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ChatController();
