//  Arquivo que vai popular o BD com dados ficticios para uso de teste
// Como ele é um arquivo que vai ser executado várias vezes, é legal limpar o BD no começo

import { client, db } from ".";
import { goals, goalsCompletions } from "./schema";
import dayjs from "dayjs";

async function seed() {
  await db.delete(goalsCompletions);
  await db.delete(goals);

  const result = await db
    .insert(goals)
    .values([
      {
        title: "Acordar cedo",
        desiredWeeklyFrequency: 5,
      },
      {
        title: "Fazer exercício",
        desiredWeeklyFrequency: 3,
      },
      {
        title: "Tomar banho",
        desiredWeeklyFrequency: 1,
      },
    ])
    //ao colocar o returning faz com que o insert retorne os dados que foi inseridos
    .returning();

  //  referencia do primeiro dia da semana
  const startOfWeek = dayjs().startOf("week");

  //Criar algumas metas completions
  await db.insert(goalsCompletions).values([
    {
      goalId: result[0].id,
      createdAt: startOfWeek.toDate(), // Completou no domingo
    },
    {
      goalId: result[1].id,
      createdAt: startOfWeek.add(1, "day").toDate(), // completou na segunda
    },
  ]);
}

// Aqui vai executar a função anonima ideoendente se deu certo ou não para encerrar a conecxão
seed().finally(() => {
  client.end();
});
