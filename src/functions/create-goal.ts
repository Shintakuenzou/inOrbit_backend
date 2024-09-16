import { db } from "../db";
import { goals } from "../db/schema";

interface CreateGoalRequest {
  title: string;
  desiredWeeklyFrequency: number;
}

export async function createGoal({ title, desiredWeeklyFrequency }: CreateGoalRequest) {
  /**
   * Por padrão nos BD a insersão não retorna os dados isneridos e sim ela retorna o número de registro que foi afetados nessa
   * insersão.
   * E ao passar o returning() ele vai fazer com que ele retorne os dados inseridos e não o número de registro que foi afetado!
   */

  const result = await db
    .insert(goals)
    .values({
      title,
      desiredWeeklyFrequency,
    })
    .returning();

  const goal = result[0];

  return {
    goal,
  };
}
