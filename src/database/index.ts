import { DB_DATABASE, DB_HOST, DB_PASSWORD, DB_PORT, DB_USER } from "@config";
import Knex from "knex";
import { Model } from "objection";

export const dbConnection = async () => {
	const config = {
		client: "pg",
		connection: {
			charset: "utf8",
			timezone: "UTC",
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

	const db_ca = process.env.DB_CA;

	if (db_ca) {
		// @ts-ignore
		config.connection.ssl = {
			rejectUnauthorized: true,
			ca: db_ca,
		};
	}

	await Model.knex(Knex(config));
};
