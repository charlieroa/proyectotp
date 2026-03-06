// src/controllers/whatsappConversationController.js
const prisma = require('../config/prisma');
const wahaService = require('../services/wahaService');
const { getIO } = require('../socket');
const { clearHandoff } = require('../services/handoffCache');

// GET /whatsapp-conversations/tenant/:tenantId — list conversations
// ?status=all|handoff (default: all)
async function listConversations(req, res) {
  try {
    const tenantId = req.params.tenantId;
    const statusFilter = req.query.status || 'all';
    const where = { tenant_id: tenantId };
    if (statusFilter === 'handoff') where.status = 'handoff';

    const conversations = await prisma.whatsapp_conversations.findMany({
      where,
      orderBy: { updated_at: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    const result = conversations.map(c => ({
      id: c.id,
      chat_id: c.chat_id,
      client_name: c.client_name,
      client_phone: c.client_phone,
      status: c.status,
      blocked: c.blocked || false,
      assigned_to: c.assigned_to,
      updated_at: c.updated_at,
      last_message: c.messages[0] || null,
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ [WA-CONV] Error listando conversaciones:', err.message);
    res.status(500).json({ error: 'Error al listar conversaciones' });
  }
}

// GET /whatsapp-conversations/:id/messages
async function getMessages(req, res) {
  try {
    const messages = await prisma.whatsapp_messages.findMany({
      where: { conversation_id: req.params.id },
      orderBy: { created_at: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    console.error('❌ [WA-CONV] Error obteniendo mensajes:', err.message);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
}

// POST /whatsapp-conversations/:id/reply
async function reply(req, res) {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensaje requerido' });
    }

    const conv = await prisma.whatsapp_conversations.findUnique({
      where: { id: req.params.id },
    });
    if (!conv || conv.status !== 'handoff') {
      return res.status(404).json({ error: 'Conversación no encontrada o no está en handoff' });
    }

    // Send via WhatsApp
    await wahaService.sendMessage(conv.tenant_id, conv.chat_id, message.trim());

    // Save message in DB
    const agentName = req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : 'Agente';
    const saved = await prisma.whatsapp_messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: 'agent',
        sender_name: agentName,
        content: message.trim(),
        message_type: 'text',
      },
    });

    // Update conversation timestamp
    await prisma.whatsapp_conversations.update({
      where: { id: conv.id },
      data: { updated_at: new Date(), assigned_to: req.user?.id || null },
    });

    // Emit via socket
    const io = getIO();
    io.to(`tenant:${conv.tenant_id}`).emit('whatsapp:new-message', {
      conversationId: conv.id,
      message: {
        sender_type: 'agent',
        sender_name: agentName,
        content: message.trim(),
        created_at: saved.created_at,
      },
    });

    res.json({ ok: true, message: saved });
  } catch (err) {
    console.error('❌ [WA-CONV] Error enviando respuesta:', err.message);
    res.status(500).json({ error: 'Error al enviar respuesta' });
  }
}

// POST /whatsapp-conversations/:id/close
async function closeConversation(req, res) {
  try {
    const conv = await prisma.whatsapp_conversations.findUnique({
      where: { id: req.params.id },
    });
    if (!conv) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    // Update status back to bot
    await prisma.whatsapp_conversations.update({
      where: { id: conv.id },
      data: { status: 'bot', updated_at: new Date() },
    });

    // Save system message
    await prisma.whatsapp_messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: 'system',
        sender_name: 'Sistema',
        content: 'Conversación finalizada por el agente',
        message_type: 'text',
      },
    });

    // Clear handoff cache
    clearHandoff(conv.tenant_id, conv.chat_id);

    // Send closure message to client
    await wahaService.sendMessage(conv.tenant_id, conv.chat_id,
      '✅ ¡Listo! La atención con el asesor ha finalizado. Estoy aquí para seguir ayudándote. 😊'
    );

    // Emit via socket
    const io = getIO();
    io.to(`tenant:${conv.tenant_id}`).emit('whatsapp:handoff-closed', {
      conversationId: conv.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ [WA-CONV] Error cerrando conversación:', err.message);
    res.status(500).json({ error: 'Error al cerrar conversación' });
  }
}

// GET /whatsapp-conversations/active-count
async function getActiveCount(req, res) {
  try {
    const tenantId = req.user?.tenant_id;
    if (!tenantId) return res.json({ count: 0 });

    const count = await prisma.whatsapp_conversations.count({
      where: { tenant_id: tenantId, status: 'handoff' },
    });
    res.json({ count });
  } catch (err) {
    console.error('❌ [WA-CONV] Error contando activos:', err.message);
    res.status(500).json({ error: 'Error al contar conversaciones activas' });
  }
}

// POST /whatsapp-conversations/:id/take — agent takes over a bot conversation
async function takeConversation(req, res) {
  try {
    const conv = await prisma.whatsapp_conversations.findUnique({
      where: { id: req.params.id },
    });
    if (!conv) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }
    if (conv.status === 'handoff') {
      return res.json({ ok: true, message: 'Ya está en modo handoff' });
    }

    // Update status to handoff
    await prisma.whatsapp_conversations.update({
      where: { id: conv.id },
      data: { status: 'handoff', assigned_to: req.user?.id || null, updated_at: new Date() },
    });

    // Set handoff in cache
    const { setHandoff } = require('../services/handoffCache');
    setHandoff(conv.tenant_id, conv.chat_id);

    // Save system message
    const agentName = req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : 'Agente';
    await prisma.whatsapp_messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: 'system',
        sender_name: 'Sistema',
        content: `${agentName} se ha unido a la conversación`,
        message_type: 'text',
      },
    });

    // Notify client via WhatsApp
    await wahaService.sendMessage(conv.tenant_id, conv.chat_id,
      '👋 Un asesor se ha unido a la conversación. ¡Te atenderá personalmente!'
    );

    // Emit socket event
    const io = getIO();
    io.to(`tenant:${conv.tenant_id}`).emit('whatsapp:new-handoff', {
      conversationId: conv.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ [WA-CONV] Error tomando conversación:', err.message);
    res.status(500).json({ error: 'Error al tomar conversación' });
  }
}

// POST /whatsapp-conversations/:id/block
async function blockConversation(req, res) {
  try {
    const conv = await prisma.whatsapp_conversations.findUnique({
      where: { id: req.params.id },
    });
    if (!conv) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    await prisma.whatsapp_conversations.update({
      where: { id: conv.id },
      data: { blocked: true, status: 'bot', updated_at: new Date() },
    });

    // Clear handoff cache
    clearHandoff(conv.tenant_id, conv.chat_id);

    // Save system message
    await prisma.whatsapp_messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: 'system',
        sender_name: 'Sistema',
        content: 'Cliente bloqueado — el bot no responderá a este contacto',
        message_type: 'text',
      },
    });

    const io = getIO();
    io.to(`tenant:${conv.tenant_id}`).emit('whatsapp:conversation-blocked', {
      conversationId: conv.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ [WA-CONV] Error bloqueando conversación:', err.message);
    res.status(500).json({ error: 'Error al bloquear conversación' });
  }
}

// POST /whatsapp-conversations/:id/unblock
async function unblockConversation(req, res) {
  try {
    const conv = await prisma.whatsapp_conversations.findUnique({
      where: { id: req.params.id },
    });
    if (!conv) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    await prisma.whatsapp_conversations.update({
      where: { id: conv.id },
      data: { blocked: false, updated_at: new Date() },
    });

    // Save system message
    await prisma.whatsapp_messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: 'system',
        sender_name: 'Sistema',
        content: 'Cliente desbloqueado — el bot volverá a responder',
        message_type: 'text',
      },
    });

    const io = getIO();
    io.to(`tenant:${conv.tenant_id}`).emit('whatsapp:conversation-unblocked', {
      conversationId: conv.id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('❌ [WA-CONV] Error desbloqueando conversación:', err.message);
    res.status(500).json({ error: 'Error al desbloquear conversación' });
  }
}

module.exports = { listConversations, getMessages, reply, closeConversation, getActiveCount, takeConversation, blockConversation, unblockConversation };
