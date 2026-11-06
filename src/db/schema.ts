import { pgTable, uuid, text, timestamp, boolean, date, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';

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
  warrantyLeadDays: integer('warranty_lead_days').default(30).notNull(), // 0 = no warranty reminders
  locale: text('locale'), // date/number format, e.g. 'en-MY'; null = detect from the browser
  suspendedAt: timestamp('suspended_at'),
  lastLoginAt: timestamp('last_login_at'),
  welcomeSeenAt: timestamp('welcome_seen_at'),
  checklistDismissedAt: timestamp('checklist_dismissed_at'),
  calendarToken: text('calendar_token').unique(), // secret path for the personal .ics feed
  // WhatsApp reminders: opt-in, number confirmed with a one-time code sent to it
  notifyWhatsapp: boolean('notify_whatsapp').default(false).notNull(),
  whatsappNumber: text('whatsapp_number'), // international digits, no '+'
  whatsappVerifiedAt: timestamp('whatsapp_verified_at'),
  whatsappCodeHash: text('whatsapp_code_hash'),
  whatsappCodeExpires: timestamp('whatsapp_code_expires'),
  whatsappCodeAttempts: integer('whatsapp_code_attempts').default(0).notNull(),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  passportToken: text('passport_token').unique(),
  passportPasswordHash: text('passport_password_hash'),
  currency: text('currency'), // ISO 4217, e.g. 'MYR'; null = derived from the owner's locale
  climate: text('climate').default('temperate').notNull(), // 'temperate' | 'tropical' → seasonal task templates
  icon: text('icon').default('house').notNull(), // one of HOME_ICONS
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
    purchaseCents: integer('purchase_cents'), // what it cost to buy/install, for the yearly spend report
    receiptUrl: text('receipt_url'),
    manualUrl: text('manual_url'),
    photoUrl: text('photo_url'),
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
    assignedTo: uuid('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),
    completedBy: uuid('completed_by').references(() => profiles.id, { onDelete: 'set null' }),
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
    contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'set null' }),
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

/** Brand directory managed by admins: each brand has a website domain and/or an uploaded logo. */
export const brands = pgTable('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  nameKey: text('name_key').notNull().unique(), // lower-cased alphanumerics, for case/punctuation-insensitive uniqueness
  domain: text('domain'), // logo is fetched from this site when no logoUrl is set
  logoUrl: text('logo_url'), // uploaded or linked logo image (takes priority over domain)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** One warranty e-mail per asset and kind ('lead' = entered the reminder window, 'final' = within 7 days). */
export const assetReminders = pgTable(
  'asset_reminders',
  {
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
    kind: text('kind').notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
  },
  (t) => ({ pk: uniqueIndex('asset_reminders_pk').on(t.userId, t.assetId, t.kind) }),
);

/** Who did what in the admin portal (and key account events). Actor is kept as text if the account is later deleted. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email'),
    action: text('action').notNull(),
    summary: text('summary').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byTime: index('audit_log_time_idx').on(t.createdAt) }),
);

/** Fixed-window request counters for abuse protection. `key` is a salted hash — no IP address or e-mail is stored. */
export const rateLimits = pgTable(
  'rate_limits',
  {
    key: text('key').notNull(),
    windowStart: timestamp('window_start').notNull(),
    count: integer('count').default(0).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.key, t.windowStart] }) }),
);

/** Our own error tracking (no third party): one row per distinct error, with an occurrence counter. */
export const errorLog = pgTable(
  'error_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fingerprint: text('fingerprint').notNull().unique(),
    source: text('source').notNull(), // 'server' | 'client'
    route: text('route'), // route pattern such as /dashboard/assets/[id] — never a real URL
    message: text('message').notNull(), // sanitised: no e-mail addresses, tokens or ids
    stack: text('stack'),
    count: integer('count').default(1).notNull(),
    firstSeenAt: timestamp('first_seen_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    notifiedAt: timestamp('notified_at'),
    resolvedAt: timestamp('resolved_at'),
  },
  (t) => ({ bySeen: index('error_log_seen_idx').on(t.lastSeenAt) }),
);

export type Profile = typeof profiles.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;

/** An address book of tradespeople. A contractor can cover several homes — see `contractorHomes`. */
export const contractors = pgTable('contractors', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  trade: text('trade').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Which homes a contractor covers (and therefore which members can see them). */
export const contractorHomes = pgTable(
  'contractor_homes',
  {
    contractorId: uuid('contractor_id').references(() => contractors.id, { onDelete: 'cascade' }).notNull(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.contractorId, t.householdId] }), byHome: index('contractor_homes_home_idx').on(t.householdId) }),
);

/** Document vault: insurance, mortgage, deeds, inspection reports… stored privately, optionally with an expiry date. */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    category: text('category').notNull(),
    fileUrl: text('file_url'),
    expiresOn: date('expires_on'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byHousehold: index('documents_household_idx').on(t.householdId) }),
);

/** One expiry e-mail per document and kind ('lead' = entered the reminder window, 'final' = within 7 days). */
export const documentReminders = pgTable(
  'document_reminders',
  {
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
    kind: text('kind').notNull(),
    sentAt: timestamp('sent_at').defaultNow().notNull(),
  },
  (t) => ({ pk: uniqueIndex('document_reminders_pk').on(t.userId, t.documentId, t.kind) }),
);

/** One bill per utility per month. `period` is always the first day of the month. */
export const utilityBills = pgTable(
  'utility_bills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    householdId: uuid('household_id').references(() => households.id, { onDelete: 'cascade' }).notNull(),
    kind: text('kind').notNull(), // electricity | water | gas | internet | other
    period: date('period').notNull(),
    amountCents: integer('amount_cents').notNull(),
    usage: integer('usage'), // whole units (kWh, m³, …) — optional
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ one: uniqueIndex('utility_bills_one').on(t.householdId, t.kind, t.period) }),
);

/** Web Push subscriptions: one per browser/device the user turned notifications on for. */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    label: text('label'), // e.g. "Chrome on Android" — shown so people can tell devices apart
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ byUser: index('push_subscriptions_user_idx').on(t.userId) }),
);

/** Blog posts written in the admin portal. Visible to readers once status='published' and publish_at has passed. */
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull(),
    body: text('body').notNull(), // Markdown (see lib/markdown-core.ts)
    category: text('category').notNull(),
    tags: text('tags').default('').notNull(), // comma-separated, lower-case
    authorName: text('author_name').default('HomeOps Team').notNull(),
    status: text('status').default('draft').notNull(), // 'draft' | 'published'
    publishAt: timestamp('publish_at'), // when it goes live (future = scheduled)
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({ live: index('blog_posts_live_idx').on(t.status, t.publishAt) }),
);
