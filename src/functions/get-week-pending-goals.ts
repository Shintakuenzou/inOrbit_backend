import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { db } from "../db";
import { goals, goalsCompletions } from "../db/schema";
import { and, count, eq, gte, lte, sql } from "drizzle-orm";

dayjs.extend(weekOfYear);

export async function getWeekPendingGoals() {
  /**
   * Aqui vai ter o uso de Common Yable Exoression:
   * Basicamente vamos escrever querys auxiliares par serem usadas em uma query maior, ou seja,
   * vamos repartir uma query maior e complexa em uma query mais simples dividindo elas em query mais simples
   * sendo executado ao mesmo tempo em uma única instrução no BD
   */

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
          lte(goalsCompletions.createdAt, lastDayToWek)
        )
      )
      .groupBy(goalsCompletions.goalId)
  );

  // query principal onde vai unir as duas query acima
  /**
   * leftjoin -> caso não exista ele retorna mesmo assim algum valor
   * innerjoin -> caso o usuário não tenha nenhuma meta concluída ele não retornaria nem a meta em si
   */
  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalsCompletionCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,

      //  COALESCE() -> CASO NÃO EXISTE RETORNA UM VALOR DEFAULT
      // Basicamente estou fazendo -> no meu campo completionCount estou pegando a coluna goalsCompletionCounts.completionCout e caso
      // ela não exista retorna 0 e pego o resultado retornado e passo para a classe Number no JS convertendo o resultado string em number
      completionCount: sql`
        COALESCE(${goalsCompletionCounts.completionCout}, 0) 
      `.mapWith(Number),
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(goalsCompletionCounts, eq(goalsCompletionCounts.goalId, goalsCreatedUpToWeek.id));
  // .toSQL(); -> ao habilitar vamos ver o retorno  em sql

  return {
    pendingGoals,
  };
}
