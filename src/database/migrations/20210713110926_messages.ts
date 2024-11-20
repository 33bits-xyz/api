import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
	return knex.schema.createTable("messages", (table) => {
		table.uuid("id", { primaryKey: true });

		table.timestamp("timestamp").notNullable();
		table.string("text", 500).notNullable();
		table.integer("version").notNullable();

		table.json("proof").notNullable();

		table.string("farcaster_hash");
	});
}

export async function down(knex: Knex): Promise<void> {
	return knex.schema.dropTable("messages");
}
