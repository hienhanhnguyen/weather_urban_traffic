const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('report_schedule', {
			schedule_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			// Unique: one schedule per account, which is what the settings
			// panel offers. A second one would need its own UI to manage.
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				unique: true,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			// Deleting the route deletes the schedule: a report over nothing
			// has no meaning, and silently switching routes would be worse.
			route_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'saved_route', key: 'route_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			// `range` is a reserved word in SQL, hence the prefix.
			time_range: {
				type: DataTypes.ENUM('24h', '7d'),
				allowNull: false,
				defaultValue: '24h',
			},
			frequency: {
				type: DataTypes.ENUM('weekly', 'monthly'),
				allowNull: false,
			},
			// 0 = Sunday, matching Date#getDay. Only used when weekly.
			weekday: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			// Capped at 28 by validation so every month actually has the day.
			day_of_month: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			// Local wall-clock hour, resolved against the user's timezone
			// preference when the next run is computed.
			hour: {
				type: DataTypes.SMALLINT,
				allowNull: false,
				defaultValue: 7,
			},
			// Stored rather than derived so the worker's due query stays a
			// plain indexed comparison.
			next_run_at: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			last_sent_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
			updated_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('report_schedule', ['next_run_at'], {
			name: 'report_schedule_next_run_at_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('report_schedule');
	},
};
