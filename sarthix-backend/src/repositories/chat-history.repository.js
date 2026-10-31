import { getPool, query } from '../config/database.js';
import { HttpError } from '../utils/http-error.js';

const MAX_STORED_MESSAGES = 100;
const MAX_HISTORY_MESSAGES = 6;

export async function beginChatTurn({
  firebaseUid,
  phoneNumber,
  conversationId,
  message,
  profileContext,
}) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      'SELECT id FROM public.users WHERE firebase_uid = $1 AND phone_number = $2 FOR UPDATE',
      [firebaseUid, phoneNumber],
    );
    if (!user.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const userId = user.rows[0].id;
    let session;
    if (conversationId == null) {
      session = await client.query(
        `INSERT INTO public.chat_sessions (user_id, title, profile_context)
         VALUES ($1, $2, $3::jsonb)
         RETURNING id`,
        [userId, message.slice(0, 255), JSON.stringify(profileContext)],
      );
    } else {
      session = await client.query(
        `SELECT id FROM public.chat_sessions
         WHERE id = $1 AND user_id = $2
         FOR UPDATE`,
        [conversationId, userId],
      );
      if (!session.rows.length) {
        throw new HttpError(404, 'Chat conversation not found');
      }
      await client.query(
        `UPDATE public.chat_sessions
         SET profile_context = $1::jsonb, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(profileContext), conversationId],
      );
    }

    const sessionId = session.rows[0].id;
    const previousMessages = await client.query(
      `SELECT role, LEFT(message_text, 1000) AS content
       FROM public.chat_messages
       WHERE session_id = $1
       ORDER BY id DESC
       LIMIT $2`,
      [sessionId, MAX_HISTORY_MESSAGES],
    );
    await client.query(
      `INSERT INTO public.chat_messages (session_id, role, message_text, metadata)
       VALUES ($1, 'user', $2, $3::jsonb)`,
      [sessionId, message, JSON.stringify({ profileContext })],
    );
    await client.query(
      'UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = $1',
      [sessionId],
    );
    await client.query('COMMIT');

    return {
      conversationId: sessionId,
      history: previousMessages.rows.reverse(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveAssistantChatMessage(conversationId, response) {
  const result = await query(
    `INSERT INTO public.chat_messages (session_id, role, message_text, metadata)
     SELECT id, 'assistant', $2, $3::jsonb
     FROM public.chat_sessions
     WHERE id = $1
     RETURNING id`,
    [conversationId, response.answer, JSON.stringify({ response })],
  );
  if (!result.rows.length) throw new HttpError(404, 'Chat conversation not found');
  await query(
    'UPDATE public.chat_sessions SET updated_at = NOW() WHERE id = $1',
    [conversationId],
  );
}

export async function getLatestChatConversation(firebaseUid, phoneNumber) {
  const sessionResult = await query(
    `SELECT s.id, s.title, s.profile_context AS "profileContext"
     FROM public.users u
     JOIN public.chat_sessions s ON s.user_id = u.id
     WHERE u.firebase_uid = $1 AND u.phone_number = $2
     ORDER BY s.updated_at DESC, s.id DESC
     LIMIT 1`,
    [firebaseUid, phoneNumber],
  );
  if (!sessionResult.rows.length) {
    const account = await query(
      'SELECT id FROM public.users WHERE firebase_uid = $1 AND phone_number = $2',
      [firebaseUid, phoneNumber],
    );
    return account.rows.length ? { conversationId: null, profileContext: {}, messages: [] } : null;
  }

  const session = sessionResult.rows[0];
  return getChatConversation(firebaseUid, phoneNumber, session.id);
}

export async function listChatConversations(firebaseUid, phoneNumber) {
  const result = await query(
    `SELECT s.id AS "conversationId", s.title,
            s.created_at AS "createdAt", s.updated_at AS "updatedAt",
            COUNT(m.id)::INTEGER AS "messageCount"
     FROM public.users u
     JOIN public.chat_sessions s ON s.user_id = u.id
     LEFT JOIN public.chat_messages m ON m.session_id = s.id
     WHERE u.firebase_uid = $1 AND u.phone_number = $2
     GROUP BY s.id
     ORDER BY s.updated_at DESC, s.id DESC
     LIMIT 50`,
    [firebaseUid, phoneNumber],
  );
  return result.rows;
}

export async function getChatConversation(firebaseUid, phoneNumber, conversationId) {
  const sessionResult = await query(
    `SELECT s.id, s.title, s.profile_context AS "profileContext"
     FROM public.users u
     JOIN public.chat_sessions s ON s.user_id = u.id
     WHERE u.firebase_uid = $1 AND u.phone_number = $2 AND s.id = $3`,
    [firebaseUid, phoneNumber, conversationId],
  );
  if (!sessionResult.rows.length) {
    throw new HttpError(404, 'Chat conversation not found');
  }
  const session = sessionResult.rows[0];
  const messagesResult = await query(
    `SELECT role, message_text AS content, metadata, created_at AS "createdAt"
     FROM (
       SELECT id, role, message_text, metadata, created_at
       FROM public.chat_messages
       WHERE session_id = $1
       ORDER BY id DESC
       LIMIT $2
     ) recent
     ORDER BY id ASC`,
    [session.id, MAX_STORED_MESSAGES],
  );
  return {
    conversationId: session.id,
    title: session.title,
    profileContext: session.profileContext ?? {},
    messages: messagesResult.rows.map((message) => ({
      role: message.role,
      content: message.content,
      response: message.role === 'assistant' ? message.metadata?.response ?? null : null,
      createdAt: message.createdAt,
    })),
  };
}

export async function deleteChatConversation(firebaseUid, phoneNumber, conversationId) {
  const result = await query(
    `DELETE FROM public.chat_sessions s
     USING public.users u
     WHERE s.user_id = u.id
       AND u.firebase_uid = $1
       AND u.phone_number = $2
       AND s.id = $3
     RETURNING s.id`,
    [firebaseUid, phoneNumber, conversationId],
  );
  return result.rows.length > 0;
}

export function validateConversationId(value) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new HttpError(400, 'conversationId must be a positive integer');
  }
  return value;
}
