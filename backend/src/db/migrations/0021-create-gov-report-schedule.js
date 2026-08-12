const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('gov_report_schedule', {
			schedule_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				unique: true,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			time_range: {
				type: DataTypes.ENUM('24h', '7d', '30d'),
				allowNull: false,
				defaultValue: '7d',
			},
			topics: {
				type: DataTypes.ARRAY(DataTypes.TEXT),
				allowNull: false,
				defaultValue: ['areas', 'incidents', 'scenarios'],
			},
			frequency: {
				type: DataTypes.ENUM('weekly', 'monthly'),
				allowNull: false,
			},
			weekday: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			day_of_month: {
				type: DataTypes.SMALLINT,
				allowNull: true,
			},
			hour: {
				type: DataTypes.SMALLINT,
				allowNull: false,
				defaultValue: 7,
			},
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

		await queryInterface.addIndex('gov_report_schedule', ['next_run_at'], {
			name: 'gov_report_schedule_next_run_at_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('gov_report_schedule');

		for (const name of [
			'enum_gov_report_schedule_time_range',
			'enum_gov_report_schedule_frequency',
		]) {
			await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${name}";`);
		}
	},
};
