import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const goals = pgTable("goals", {
  // quando eu inserir algum registro nessa tabela goals el vai preencher um Id automaticamente executando a função createId
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text("title").notNull(),
  desiredWeeklyFrequency: integer("desired-weekly-frequency").notNull(),
  // Está dizendo que vai guardar os dados com a timezone.
  // ao usar o .defaultNow() ao criar um dados ele vai preencher automaticamente com a data atual.
  createdAt: timestamp("created-at", { withTimezone: true }).notNull().defaultNow(),
});

export const goalsCompletions = pgTable("goal_completions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  // estou referenciando da coluna goals o id dela na goalsId dessa tabela
  goalId: text("goal_id")
    .references(() => goals.id)
    .notNull(),
  createdAt: timestamp("created-at", { withTimezone: true }).notNull().defaultNow(),
});
