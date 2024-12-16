const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const WebSocket = require('ws'); // Подключаем WebSocket
const multer = require('multer'); // Для загрузки файлов
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'quest_stations',
    password: '1317',
    port: 5432,
});

// Переменная для хранения ID текущей станции
let currentStationId = 1;

// Создаём WebSocket-сервер
const wss = new WebSocket.Server({ noServer: true });

// Храним подключённые клиенты
const clients = new Set();

// Когда подключается новый клиент
wss.on('connection', (ws) => {
    clients.add(ws);

    // Удаляем клиента при отключении
    ws.on('close', () => {
        clients.delete(ws);
    });
});

// Широковещательная отправка данных всем клиентам
// Функция для трансляции сообщения всем клиентам
function broadcast(type, data) {
    const message = JSON.stringify({
        type: type,  // Тип сообщения
        data: data   // Данные для отправки
    });

    // Отправляем сообщение всем подключенным клиентам
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
// Переключить на следующую станцию
app.get('/api/next-station', async (req, res) => {
    try {
        currentStationId++;
        const result = await pool.query('SELECT * FROM stations WHERE id = $1', [currentStationId]);

        if (result.rows.length === 0) {
            // Если станция не найдена, возвращаемся к первой
            currentStationId = 1;
            const firstStation = await pool.query('SELECT * FROM stations WHERE id = $1', [currentStationId]);
            broadcast('station_changed', firstStation.rows[0]);
            res.json(firstStation.rows[0]);
        } else {
            // Отправляем обновление всем клиентам
            broadcast('station_changed', result.rows[0]);
            res.json(result.rows[0]);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error switching to next station');
    }
});

app.post('/api/game-mode', async (req, res) => {
    const { game_mode } = req.body;
    try {
        broadcast('gamemode_changed', game_mode); // Отправляем сообщение WebSocket
        res.status(200).send('Game mode changed');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error switching game mode');
    }
});


// Настройка хранилища для загруженных файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // папка для сохранения файлов
    },
    filename: (req, file, cb) => {
        // Генерация безопасного имени файла
        const ext = path.extname(file.originalname); // Получаем расширение
        const baseName = path.basename(file.originalname, ext);

        // Удаляем пробелы и приводим к безопасному формату
        const safeName = baseName
            .replace(/[^a-zA-Z0-9]/g, '_') // Заменяем все не буквенно-цифровые символы на "_"
            .toLowerCase();

        const uniqueSuffix = Date.now(); // Уникальный суффикс
        cb(null, `${safeName}-${uniqueSuffix}${ext}`); // имя файла: название-дата.расширение
    },
});

const upload = multer({ storage });

// Маршрут для создания станции
app.post('/api/stations', upload.single('image'), async (req, res) => {
    const { name, description, stage } = req.body;
    const imagePath = req.file ? req.file.path : null;

    // Создание нового объекта станции
    const newStation = { name, description, stage, image: imagePath };

    // Используем вашу таблицу stations для сохранения
    const query = `
        INSERT INTO stations (name, description, stage, image)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, description, stage, image;
    `;
    const values = [newStation.name, newStation.description, newStation.stage, newStation.image];

    try {
        // Выполнение запроса к базе данных
        const result = await pool.query(query, values);

        // Возвращаем успешный ответ с данными о новой станции
        res.status(201).send({
            message: 'Станция создана',
            station: result.rows[0], // возвращаем данные из результата
        });
    } catch (error) {
        console.error('Error saving station to database:', error);
        res.status(500).send({
            message: 'Ошибка при создании станции',
            error: error.message,
        });
    }
});


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
const server = app.listen(5000, () => {
    console.log('Server running on port 5000');
});

// Подключаем WebSocket-сервер к HTTP-серверу
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
