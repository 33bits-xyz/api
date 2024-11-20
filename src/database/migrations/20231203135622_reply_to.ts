import { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('messages', table => {
    table.string('reply_to');
  })
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('messages', table => {
    table.dropColumn('reply_to');
  });
}

