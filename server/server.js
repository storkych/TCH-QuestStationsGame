const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'quest_stations',
    password: '1317',
    port: 5432,
});

// Переменная для хранения ID текущей станции (начнем с первой)
let currentStationId = 1; // Начнем с первой станции, можно изменить на любую



// Получить все станции
app.get('/api/stations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stations');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving stations');
    }
});

// Получить текущую станцию
app.get('/api/current-station', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stations WHERE id = $1', [currentStationId]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send('No stations found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving current station');
    }
});

// Получить следующую станцию
app.get('/api/next-station', async (req, res) => {
    const { currentStationId } = req.query;  // Извлекаем текущий ID станции из запроса

    try {
        const result = await pool.query('SELECT * FROM stations WHERE id = $1', [parseInt(currentStationId) + 1]);

        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            // Если следующей станции нет, можно вернуть первую станцию
            const firstStationResult = await pool.query('SELECT * FROM stations LIMIT 1');
            res.json(firstStationResult.rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving next station');
    }
});


// Оценить станцию и обновить средний рейтинг
app.post('/api/rating', async (req, res) => {
    const { participant_id, station_id, rating } = req.body;

    try {
        // Добавляем новый рейтинг в таблицу ratings
        await pool.query(
            'INSERT INTO ratings (participant_id, station_id, rating) VALUES ($1, $2, $3)',
            [participant_id, station_id, rating]
        );

        // Пересчитываем средний рейтинг станции
        const avgResult = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM ratings WHERE station_id = $1',
            [station_id]
        );
        const avgRating = parseFloat(avgResult.rows[0].avg_rating).toFixed(2);

        // Обновляем колонку rating в таблице stations
        await pool.query(
            'UPDATE stations SET rating = $1 WHERE id = $2',
            [avgRating, station_id]
        );

        res.send('Rating added and station average updated');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error adding rating or updating average');
    }
});



// Получить всех участников
app.get('/api/participants', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM participants');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving participants');
    }
});


// Получить средний рейтинг станции
app.get('/api/rating/:stationId', async (req, res) => {
    const { stationId } = req.params;
    try {
        const result = await pool.query('SELECT AVG(rating) as avg_rating FROM ratings WHERE station_id = $1', [stationId]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving rating');
    }
});




// Запуск сервера
const port = 5000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
