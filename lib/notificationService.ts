import { prisma } from './prisma';

export interface UserNotificationRecord {
  id: string;
  userId: string;
  userEmail: string | null;
  sourceType: string;
  sourceName: string | null;
  sourceKey: string | null;
  type: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

function parseRow(row: Record<string, unknown>): UserNotificationRecord {
  return {
    id: String(row.id),
    userId: String(row.userId ?? row.user_id ?? ''),
    userEmail: (row.userEmail ?? row.user_email ?? null) as string | null,
    sourceType: String(row.sourceType ?? row.source_type ?? 'admin'),
    sourceName: (row.sourceName ?? row.source_name ?? null) as string | null,
    sourceKey: (row.sourceKey ?? row.source_key ?? null) as string | null,
    type: String(row.type ?? 'info'),
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    category: String(row.category ?? 'general'),
    priority: String(row.priority ?? 'normal'),
    metadata: (row.metadata as Record<string, unknown>) || {},
    isRead: Boolean(row.isRead ?? row.is_read ?? false),
    readAt: (row.readAt ?? row.read_at ?? null) as string | null,
    createdAt: String(row.createdAt ?? row.created_at ?? ''),
  };
}

export async function createUserNotification(input: {
  userId: string;
  userEmail?: string | null;
  sourceType?: string;
  sourceName?: string | null;
  sourceKey?: string | null;
  type: string;
  title: string;
  message: string;
  category: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    INSERT INTO user_notifications (
      user_id,
      user_email,
      source_type,
      source_name,
      source_key,
      type,
      title,
      message,
      category,
      priority,
      metadata
    )
    VALUES (
      ${input.userId},
      ${input.userEmail ?? null},
      ${input.sourceType ?? 'admin'},
      ${input.sourceName ?? null},
      ${input.sourceKey ?? null},
      ${input.type},
      ${input.title},
      ${input.message},
      ${input.category},
      ${input.priority ?? 'normal'},
      ${JSON.stringify(input.metadata ?? {})}::jsonb
    )
    ON CONFLICT (source_key) DO UPDATE
      SET title = EXCLUDED.title,
          message = EXCLUDED.message,
          category = EXCLUDED.category,
          priority = EXCLUDED.priority,
          metadata = EXCLUDED.metadata,
          user_email = EXCLUDED.user_email,
          source_type = EXCLUDED.source_type,
          source_name = EXCLUDED.source_name,
          is_read = FALSE,
          read_at = NULL,
          created_at = NOW()
    RETURNING
      id::text AS "id",
      user_id AS "userId",
      user_email AS "userEmail",
      source_type AS "sourceType",
      source_name AS "sourceName",
      source_key AS "sourceKey",
      type,
      title,
      message,
      category,
      priority,
      metadata,
      is_read AS "isRead",
      read_at AS "readAt",
      created_at AS "createdAt"
  `;

  return parseRow(rows[0]);
}

export async function listUserNotifications(userId: string, limit = 20) {
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    SELECT
      id::text AS "id",
      user_id AS "userId",
      user_email AS "userEmail",
      source_type AS "sourceType",
      source_name AS "sourceName",
      source_key AS "sourceKey",
      type,
      title,
      message,
      category,
      priority,
      metadata,
      is_read AS "isRead",
      read_at AS "readAt",
      created_at AS "createdAt"
    FROM user_notifications
    WHERE user_id = ${userId}
    ORDER BY is_read ASC, created_at DESC
    LIMIT ${limit}
  `;

  return rows.map(parseRow);
}

export async function countUnreadUserNotifications(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
    SELECT COUNT(*)::bigint AS count
    FROM user_notifications
    WHERE user_id = ${userId} AND is_read = FALSE
  `;

  return Number(rows[0]?.count ?? 0);
}

export async function markUserNotificationsRead(userId: string, ids?: string[]) {
  if (ids && ids.length > 0) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
      UPDATE user_notifications
      SET is_read = TRUE,
          read_at = NOW()
      WHERE user_id = ${userId}
        AND id::text = ANY(${ids}::text[])
      RETURNING id::text AS "id"
    `;

    return rows.length;
  }

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>`
    UPDATE user_notifications
    SET is_read = TRUE,
        read_at = NOW()
    WHERE user_id = ${userId} AND is_read = FALSE
    RETURNING id::text AS "id"
  `;

  return rows.length;
}
