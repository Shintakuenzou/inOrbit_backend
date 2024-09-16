import { and, count, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { goals, goalsCompletions } from "../db/schema";
import dayjs from "dayjs";

interface CreateGoalsCompletionRequest {
  goalId: string;
}

export async function createGoalsCompletion({ goalId }: CreateGoalsCompletionRequest) {
  const firstDayWeek = dayjs().startOf("week").toDate();
  const lastDayToWek = dayjs().endOf("week").toDate();

  const goalsCompletionCounts = db.$with("goals_completion_counts").as(
    // Selecionando da tebela de goalsCompletions onde a criação da minha meta seja maior ou igual ao primeiro dia da semana e
    // menor ou igual ao ultimo dia da semana.
    // no Final eu agrupo eles pelo ID da nossa meta fazendo o calcúlo de quantas vezes aquela meta foi concluída.
    db
      .select({
        goalId: goalsCompletions.goalId,
        completionCout: count(goalsCompletions.id).as("completionCout"),
      })
      .from(goalsCompletions)
      .where(
        and(
          gte(goalsCompletions.createdAt, firstDayWeek),
          lte(goalsCompletions.createdAt, lastDayToWek),
          eq(goalsCompletions.goalId, goalId)
        )
      )
      .groupBy(goalsCompletions.goalId)
  );

  const result = await db
    .with(goalsCompletionCounts)
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,

      //  COALESCE() -> CASO NÃO EXISTE RETORNA UM VALOR DEFAULT
      // Basicamente estou fazendo -> no meu campo completionCount estou pegando a coluna goalsCompletionCounts.completionCout e caso
      // ela não exista retorna 0 e pego o resultado retornado e passo para a classe Number no JS convertendo o resultado string em number
      completionCount: sql`
        COALESCE(${goalsCompletionCounts.completionCout}, 0) 
      `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goals.id))
    .where(eq(goals.id, goalId))
    .limit(1);

  const { completionCount, desiredWeeklyFrequency } = result[0];
  if (completionCount >= desiredWeeklyFrequency) {
    throw new Error("Goal already completed this week");
  }

  const insertResult = await db.insert(goalsCompletions).values({ goalId }).returning();
  const goalCompletion = insertResult[0];

  return {
    goalCompletion,
  };
}
