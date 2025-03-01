const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const WebSocket = require('ws'); // Подключаем WebSocket.
const multer = require('multer'); // Для загрузки файлов.
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mysql = require('mysql2');
const pool = mysql.createPool({
    host: 'localhost',
    user: 'storkych',
    database: 'quest_stations',
    password: '13i15S03d',
    port: 3306
});


// Переменная для хранения ID текущей станции.
let currentStationId = 1;

// Создание WebSocket-сервера.
const wss = new WebSocket.Server({ noServer: true });

// Хранение подключенных клиентов.
const clients = new Set();

// Подключение нового клиента.
wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});


// Широковещательная отправка данных всем клиентам.
// Функция для трансляции сообщения всем клиентам.
function broadcast(type, data) {
    const message = JSON.stringify({
        type: type,
        data: data
    });
    console.log(data)
    // Отправка сообщения всем подключенным клиентам.
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
// Метод GET для переключения на следующую станцию.
app.get('/api/next-station', async (req, res) => {
    try {
        // Получаем текущий номер раунда
        const settingsResult = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        const currentRound = settingsResult.rows[0]?.round_number;

        if (currentRound === undefined) {
            return res.status(400).send('Round number not set.');
        }

        // Получаем все станции текущего раунда
        const stationsResult = await pool.query('SELECT * FROM stations WHERE round_number = $1 ORDER BY id', [currentRound]);

        if (stationsResult.rows.length === 0) {
            return res.status(404).send('No stations found for the current round');
        }

        // Ищем индекс текущей станции в списке
        let currentStationIndex = stationsResult.rows.findIndex(station => station.id === currentStationId);

        if (currentStationIndex === -1 || currentStationIndex === stationsResult.rows.length - 1) {
            // Если текущая станция не найдена или она последняя, начинаем с первой.
            currentStationId = stationsResult.rows[0].id;
        } else {
            // Переходим к следующей станции в списке
            currentStationId = stationsResult.rows[currentStationIndex + 1].id;
        }

        // Получаем следующую станцию
        const nextStation = stationsResult.rows.find(station => station.id === currentStationId);

        // Отправляем обновление всем клиентам.
        broadcast('station_changed', nextStation);
        res.json(nextStation);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error switching to next station');
    }
});


// Метод POST для установления режима.
app.post('/api/game-mode', async (req, res) => {
    const { game_mode } = req.body;
    console.log("GAMEMODE")
    try {
        // Обновляем текущие настройки в таблице settings
        await pool.query(
            'UPDATE settings SET mode = $1 WHERE id = (SELECT MAX(id) FROM settings)',
            [game_mode]
        );

        // Отправляем широковещательное сообщение WebSocket.
        broadcast('gamemode_changed', game_mode);

        res.status(200).send('Game mode updated successfully');
    } catch (error) {
        console.error('Error updating game mode:', error);
        res.status(500).send('Error updating game mode');
    }
});



// Настройка хранилища для загруженных файлов.
const storage = multer.diskStorage({
    // Путь для сохранения файлов.
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Генерация безопасного имени файла.
        // Получение расширения.
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext);
        // Удаление пробелов и приведение к безопасному формату.
        const safeName = baseName
            // Замена всех не буквенно-цифровые символов на "_".
            .replace(/[^a-zA-Z0-9]/g, '_') 
            .toLowerCase();
        // Добавление уникального суффикса.
        const uniqueSuffix = Date.now();
        // Формат имени файла: название-дата.расширение.
        cb(null, `${safeName}-${uniqueSuffix}${ext}`);
    },
});

const upload = multer({ storage });

// Метод POST для создания станции.
app.post('/api/stations', upload.single('image'), async (req, res) => {
    const { name, description, stage } = req.body;
    const imagePath = req.file ? req.file.path : null;

    // Получить текущий номер раунда из настроек (например, из базы данных)
    const roundQuery = 'SELECT round_number FROM settings LIMIT 1'; // Запрос для получения текущего номера раунда
    let roundNumber;

    try {
        const roundResult = await pool.query(roundQuery);
        if (roundResult.rows.length > 0) {
            roundNumber = roundResult.rows[0].round_number; // Сохраняем текущий номер раунда
        } else {
            return res.status(400).send({ message: 'Номер раунда не найден в настройках.' });
        }
    } catch (error) {
        console.error('Ошибка при получении настроек:', error);
        return res.status(500).send({
            message: 'Ошибка при получении номера раунда',
            error: error.message,
        });
    }

    // Создание нового объекта станции с добавлением номера раунда
    const newStation = {
        name,
        description,
        stage,
        image: imagePath,
        round_number: roundNumber // Добавляем номер раунда
    };

    // Сохранение станции в таблицу stations
    const query = `
        INSERT INTO stations (name, description, stage, image, round_number)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, stage, image, round_number;
    `;
    const values = [newStation.name, newStation.description, newStation.stage, newStation.image, newStation.round_number];

    try {
        // Выполнение запроса к базе данных
        const result = await pool.query(query, values);

        // Возвращение успешного ответа с данными о новой станции
        res.status(201).send({
            message: 'Станция создана',
            station: result.rows[0],
        });
    } catch (error) {
        console.error('Ошибка при сохранении станции в базе данных:', error);
        res.status(500).send({
            message: 'Ошибка при создании станции',
            error: error.message,
        });
    }
});



app.get('/api/settings', async (req, res) => {
    try {
        const settings = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        res.json(settings.rows[0]);
    } catch (error) {
        console.error('Error retrieving settings:', error);
        res.status(500).send('Error retrieving settings');
    }
});


app.post('/api/settings', async (req, res) => {
    const { round_number, mode } = req.body;

    try {
        // Обновляем текущие настройки в таблице (используем максимальный id)
        await pool.query(
            'UPDATE settings SET round_number = $1, mode = $2 WHERE id = (SELECT MAX(id) FROM settings)',
            [round_number, mode]
        );
        broadcast('gamemode_changed', mode);
        res.status(200).send('Settings updated successfully');
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).send('Error updating settings');
    }
});


// Метод GET для получения текущей станции для текущего раунда.
// Метод GET для получения текущей станции.
app.get('/api/current-station', async (req, res) => {
    try {
        // Получаем настройки с последним номером раунда
        const settingsResult = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        const currentRound = settingsResult.rows[0]?.round_number;

        if (currentRound === undefined) {
            return res.status(400).send('Round number not set.');
        }

        // Запрос к базе для получения станций, которые принадлежат текущему раунду
        const result = await pool.query('SELECT * FROM stations WHERE round_number = $1', [currentRound]);

        if (result.rows.length > 0) {
            // Отправляем первую станцию из текущего раунда.
            res.json(result.rows[0]);
        } else {
            // Заглушка для отсутствующих станций
            const noStations = { message: 'Станции отсутствуют' };
            res.json(noStations);  // Возвращаем объект с заглушкой
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving current station');
    }
});




// Метод GET для получения текущей станции.
app.get('/api/stations', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM stations');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving stations');
    }
});

app.get('/api/round_stations', async (req, res) => {
    try {
        // Получаем настройки с последним номером раунда
        const settingsResult = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');
        const currentRound = settingsResult.rows[0]?.round_number;

        if (currentRound === undefined) {
            return res.status(400).send('Round number not set.');
        }

        // Запрос к базе для получения станций, которые принадлежат текущему раунду
        const result = await pool.query('SELECT * FROM stations WHERE round_number = $1', [currentRound]);

        if (result.rows.length > 0) {
            res.json(result.rows);  // Отправляем только станции текущего раунда
        } else {
            res.status(404).send('No stations found for the current round');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving stations');
    }
});

app.get('/api/stations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM stations WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).send('Station not found');
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving station details');
    }
});


// Метод POST для оценки станции и обновления среднего рейтинга.
app.post('/api/rating', async (req, res) => {
    const { participant_id, station_id, rating } = req.body;

    try {
        // Добавляем новую оценку в таблицу ratings.
        await pool.query(
            'INSERT INTO ratings (participant_id, station_id, rating) VALUES ($1, $2, $3)',
            [participant_id, station_id, rating]
        );

        // Пересчитывание среднего рейтинга станции с учётом новой оценки.
        const avgResult = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM ratings WHERE station_id = $1',
            [station_id]
        );
        const avgRating = parseFloat(avgResult.rows[0].avg_rating).toFixed(2);

        // Обновление столбца rating в таблице stations.
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



// Метод GET для получения списка всех участников.
app.get('/api/participants', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM participants');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving participants');
    }
});


// Метод GET для получения среднего рейтинга станций.
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


// Запуск сервера (порт 5000).
const server = app.listen(5000, () => {
    console.log('Server running on port 5000');
});

// Подключение WebSocket-сервера к HTTP-серверу.
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

