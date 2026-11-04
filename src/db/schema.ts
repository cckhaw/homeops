import { pgTable, uuid, text, timestamp, boolean, date, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  passportToken: text('passport_token').unique(),
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
    makeModel: text('make_model'),
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

/** Hashed one-time tokens for e-mail magic-link sign-in. */
export const loginTokens = pgTable('login_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
