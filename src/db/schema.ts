import { pgTable, uuid, text, timestamp, boolean, date, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  // --- password auth, 2FA and notification preferences ---
  passwordHash: text('password_hash'),
  emailVerifiedAt: timestamp('email_verified_at'),
  totpSecret: text('totp_secret'), // AES-256-GCM encrypted
  totpEnabled: boolean('totp_enabled').default(false).notNull(),
  totpLastStep: integer('totp_last_step'), // replay protection
  recoveryCodes: text('recovery_codes'), // JSON array of hashed one-time codes
  failedAttempts: integer('failed_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  sessionVersion: integer('session_version').default(0).notNull(),
  notifyReminders: boolean('notify_reminders').default(false).notNull(),
  reminderLeadDays: integer('reminder_lead_days').default(3).notNull(),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  passportToken: text('passport_token').unique(),
  passportPasswordHash: text('passport_password_hash'),
  passportFailed: integer('passport_failed').default(0).notNull(),
  passportLockedUntil: timestamp('passport_locked_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const householdMembers = pgTable(
  'household_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    role: text('role').default('member'), // owner, admin, member
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    uniqueMember: uniqueIndex('household_members_unique').on(t.householdId, t.userId),
    byUser: index('household_members_user_idx').on(t.userId),
  }),
);

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    makeModel: text('make_model'), // legacy combined field, superseded by make + model
    make: text('make'),
    model: text('model'),
    serialNumber: text('serial_number'),
    installDate: date('install_date'),
    warrantyExpiry: date('warranty_expiry'),
    receiptUrl: text('receipt_url'),
    manualUrl: text('manual_url'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byHousehold: index('assets_household_idx').on(t.householdId) }),
);

export const maintenanceTasks = pgTable(
  'maintenance_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    frequency: text('frequency').notNull(), // monthly, quarterly, biannually, yearly
    dueDate: date('due_date').notNull(),
    status: text('status').default('pending'), // pending, completed
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byHousehold: index('tasks_household_idx').on(t.householdId, t.status) }),
);

// --- Additions required by the feature set (not in the base spec) ---

/** Invite links for joining a household. */
export const householdInvites = pgTable('household_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Service history entries for an asset (repairs, inspections, replacements). */
export const serviceRecords = pgTable(
  'service_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
    serviceDate: date('service_date').notNull(),
    description: text('description').notNull(),
    provider: text('provider'),
    costCents: integer('cost_cents'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byAsset: index('service_records_asset_idx').on(t.assetId) }),
);

/** Hashed one-time tokens for e-mail registration and password reset links. */
export const loginTokens = pgTable('login_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  purpose: text('purpose').default('reset').notNull(), // 'register' | 'reset'
  payload: text('payload'), // e.g. display name for 'register'
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Which reminder e-mails have been sent for which task, so digests don't repeat daily. */
export const taskReminders = pgTable(
  'task_reminders',
  {
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    taskId: uuid('task_id').references(() => maintenanceTasks.id, { onDelete: 'cascade' }).notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
  },
  (t) => ({ pk: uniqueIndex('task_reminders_pk').on(t.userId, t.taskId) }),
);

export type Profile = typeof profiles.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
