import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { goals, goalsCompletions } from "../db/schema";
import dayjs from "dayjs";

export async function getWeekSummary() {
  const firstDayWeek = dayjs().startOf("week").toDate();
  const lastDayToWek = dayjs().endOf("week").toDate();

  // Usando o $with -> vamos criar as querys auxiliares
  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    // Selecionando no meu DB todas as metas onde a data de criação for menor ou igual a semana tual.
    // Dentro do select() -> podemos passar um {} para dizer quais campos podemos retornar filtrando eles
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayToWek))
  );

  const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
    // Selecionando no meu DB todas as metas onde a data de criação for menor ou igual a semana tual.
    // Dentro do select() -> podemos passar um {} para dizer quais campos podemos retornar filtrando eles
    db
      .select({
        id: goalsCompletions.id,
        title: goals.title,
        completedAt: goalsCompletions.createdAt,
        // DATE(${goalsCompletions.createdAt})`, arranca somente a data dos dados.
        completedAtDate: sql`
        DATE(${goalsCompletions.createdAt})`.as("completedAtDate"),
      })
      .from(goalsCompletions)
      .innerJoin(goals, eq(goals.id, goalsCompletions.goalId))
      .where(
        and(
          gte(goalsCompletions.createdAt, firstDayWeek),
          lte(goalsCompletions.createdAt, lastDayToWek)
        )
      )
      .orderBy(desc(goalsCompletions.createdAt))
  );

  // Vou pegar os dados da query goalsCompletedInWeek e agrupar por data
  const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
    db
      // Selecionando no meu DB todos os dados dos goalsCompletions filtrados pela data da semana.
      // Dentro do select() -> podemos passar um {} para dizer quais campos podemos retornar filtrando eles
      .select({
        completedAtDate: goalsCompletedInWeek.completedAtDate,
        // além disso vai retorna as metas concuídas naquela data, vamos fazer uma agregação em formato JSON
        // agregação em sql é basicamente pegar uma lista e converter em um formato JSON
        // No postgres podemos fazer isso usando uma função JSON_AGG, ele pega um retorno do postgres e converte para um array -> []
        // e dentro dele usamos a função JSON_BUILD_OBJECT() -> ele constroi um objeto -> {}
        completions: sql`
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ${goalsCompletedInWeek.id},
              'title', ${goalsCompletedInWeek.title},
              'completedAt', ${goalsCompletedInWeek.completedAt}
            )
          )
        `.as("completions"),
      })
      .from(goalsCompletedInWeek)
      .groupBy(goalsCompletedInWeek.completedAtDate)
      .orderBy(desc(goalsCompletedInWeek.completedAtDate))
  );

  type GoalsPerDay = Record<
    string,
    {
      id: string;
      title: string;
      completedAt: string;
    }[]
  >;

  const result = await db
    .with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay)
    // ao passar select() vazio esou dizendo que estou selecionando todos os dados de goalsCompletedByWeekDay
    // Aqui vou mostrar quantas metas eu completei no total
    // Quando usamos SELECT dentro de SELECT precisamos passar enre parenteses, pois se não fazer assim ele perde na sintax
    .select({
      completd: sql`(SELECT COUNT(*) FROM ${goalsCompletedInWeek})`.mapWith(Number),
      total: sql`(
        SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) 
        FROM ${goalsCreatedUpToWeek}
      )`.mapWith(Number),

      // Vamos fazer agregação dos dados retornados pela query goalsCompletedByWeekDay
      // JSON_OBJECT_AGG() -> isso cria um objeto
      goalsPerDay: sql<GoalsPerDay>`
        JSON_OBJECT_AGG(
          ${goalsCompletedByWeekDay.completedAtDate}, ${goalsCompletedByWeekDay.completions}
        )
      `,
    })
    .from(goalsCompletedByWeekDay);

  return {
    summary: result[0],
  };
}
