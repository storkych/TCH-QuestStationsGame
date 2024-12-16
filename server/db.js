const { Client } = require('pg');

// Настройка подключения к базе данных.
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'quest_stations',
    password: '1317',
    port: 5432,
});

client.connect();

const createStationsTable = async () => {
    try {
        // Создание таблицы, если её нет.
        await client.query(`
      CREATE TABLE IF NOT EXISTS stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        description TEXT
      );
    `);
    } catch (err) {
        console.error('Error creating table', err);
    }
};

// Функция для добавления станций.
const addExampleStations = async () => {
    const stations = [
        { name: 'Station 1', description: 'Description for Station 1' },
        { name: 'Station 2', description: 'Description for Station 2' },
        { name: 'Station 3', description: 'Description for Station 3' },
    ];

    try {
        for (let station of stations) {
            await client.query('INSERT INTO stations(name, description) VALUES($1, $2)', [station.name, station.description]);
        }
        console.log('Example stations added!');
    } catch (err) {
        console.error('Error adding stations', err);
    }
};

// Функция для получения списка всех станций.
const getStations = async () => {
    try {
        const res = await client.query('SELECT * FROM stations');
        return res.rows;
    } catch (err) {
        console.error('Error fetching stations', err);
    }
};

// Вызываем функцию для создания таблицы и добавления данных
createStationsTable().then(() => addExampleStations());
