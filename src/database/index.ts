import { Model } from 'objection';
import Knex from 'knex';
import { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } from '@config';

export const dbConnection = async () => {
  const dbConfig = {
    client: 'pg',
    connection: {
      charset: 'utf8',
      timezone: 'UTC',
      user: DB_USER,
      password: DB_PASSWORD,
      host: DB_HOST,
      port: DB_PORT,
      database: DB_DATABASE,
    },
    pool: {
      min: 2,
      max: 10,
    },
  };

  await Model.knex(Knex(dbConfig));
};
