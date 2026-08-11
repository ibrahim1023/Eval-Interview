import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const interviews = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentName: text("agent_name").notNull(),
    agentDescription: text("agent_description").notNull(),
    expertRole: text("expert_role").notNull(),
    knowledgeSource: jsonb("knowledge_source").notNull(),
    status: text("status", { enum: ["active", "review", "complete"] })
      .notNull()
      .default("active"),
    crawlStatus: text("crawl_status", { enum: ["pending", "ready", "failed"] })
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    turnIndex: integer("turn_index").notNull(),
    speaker: text("speaker", { enum: ["expert", "interviewer"] }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("messages_interview_turn_idx").on(table.interviewId, table.turnIndex),
    index("messages_interview_idx").on(table.interviewId),
  ],
);

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    condition: text("condition").notNull(),
    expectedBehavior: text("expected_behavior").notNull(),
    exceptions: text("exceptions").array().notNull().default([]),
    status: text("status", { enum: ["provisional", "confirmed", "conflict", "unresolved"] })
      .notNull()
      .default("provisional"),
    interviewSources: text("interview_sources").array().notNull().default([]),
    contextSources: text("context_sources").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rules_interview_status_idx").on(table.interviewId, table.status),
    index("rules_interview_idx").on(table.interviewId),
  ],
);

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").references(() => rules.id, { onDelete: "set null" }),
    source: text("source").notNull(),
    content: text("content").notNull(),
    relationship: text("relationship", {
      enum: ["supported", "conflict", "partial", "new_area"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("evidence_interview_idx").on(table.interviewId)],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["normal", "contrastive", "boundary", "adversarial"] }).notNull(),
    input: jsonb("input").notNull(),
    expectedBehavior: text("expected_behavior").notNull(),
    ruleIds: uuid("rule_ids").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("scenarios_interview_idx").on(table.interviewId)],
);

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviews.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull().default(""),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_chunks_interview_url_idx").on(table.interviewId, table.url),
    index("source_chunks_interview_idx").on(table.interviewId),
    index("source_chunks_fts_idx").using(
      "gin",
      sql`to_tsvector('english', ${table.title} || ' ' || ${table.content})`,
    ),
  ],
);
