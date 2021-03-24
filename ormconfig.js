module.exports = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  logging: 'all',
  synchronize: true,
  entities: [__dirname + '/entity/*'],
  migrations: ['src/migrations/**/*.ts'],
  cli: {
    migrationsDir: "src/migrations",
  },
}
