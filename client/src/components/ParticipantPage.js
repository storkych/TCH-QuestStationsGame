import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ParticipantPage() {
    // Хук состояния для хранения текущей станции.
    const [currentStation, setCurrentStation] = useState(null);
    // Хук состояния для хранения выбранной оценки (1-5).
    const [rating, setRating] = useState(0);
    // Хук состояния для хранения списка участников.
    const [participants, setParticipants] = useState([]);
    // Хук состояния для хранения выбранного участника.
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    // Хук состояния для индикатора загрузки.
    const [loading, setLoading] = useState(true);
    // Хук состояния для хранения ошибок.
    const [error, setError] = useState(null);
    // Хук состояния для режима работы (создание или оценка).
    const [mode, setMode] = useState('creation'); // Режимы: оценивание / создание.

    // Состояния для создания станции.
    // Хук состояния для имени станции.
    const [stationName, setStationName] = useState('');
    // Хук состояния для изображения станции.
    const [stationImage, setStationImage] = useState(null);
    // Хук состояния для описания станции.
    const [stationDescription, setStationDescription] = useState('');
    // Хук состояния для этапа станции.
    const [stationStage, setStationStage] = useState('');

    useEffect(() => {
        // Получение текущей станции и участников при монтировании компонента.
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => setCurrentStation(response.data))
            .catch((error) => setError('Error fetching current station'));
        
        axios.get('http://localhost:5000/api/participants')
            .then((response) => setParticipants(response.data))
            .catch((error) => setError('Error fetching participants'))
            .finally(() => setLoading(false));

        // Получение gamemode из /api/settings
        axios.get('http://localhost:5000/api/settings')
            .then((response) => {
                if (response.data && response.data.mode) {
                    setMode(response.data.mode);
                }
            })
            .catch(() => setError('Ошибка при загрузке настроек'));

        // Подключение к WebSocket для получения обновлений.
        const socket = new WebSocket('ws://localhost:5000');

        socket.onmessage = (event) => {
            console.log('Received message:', event.data);
            // Обработка сообщений от сервера.
            const data = JSON.parse(event.data);
            if (data.type === 'station_changed') {
                // Обновляем текущую станцию.
                setCurrentStation(data.data);
            } else if (data.type === 'gamemode_changed') {
                // Обновляем режим в зависимости от данных.
                setMode(data.data);
            }
        };
        socket.onopen = () => {
            console.log('WebSocket connection opened');
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };
        // Очистка при размонтировании компонента.
        return () => socket.close();
    }, []);

    // Обработчик для отправки оценки станции.
    const handleRating = () => {
        if (currentStation && selectedParticipant && rating >= 1 && rating <= 5) {
            axios.post('http://localhost:5000/api/rating', {
                participant_id: selectedParticipant,
                station_id: currentStation.id,
                rating: rating,
            })
                .then(() => console.log('Rating submitted'))
                .catch((error) => console.error('Error submitting rating', error));
        } else {
            // Установка ошибки, если данные недействительны.
            setError('Invalid data for rating submission');
        }
    };

    // Функция отправки новой станции.
    const handleStationCreation = (e) => {
        e.preventDefault();
        // Проверка, что все поля заполнены.
        if (stationName && stationDescription && stationStage) {
            const formData = new FormData();
            formData.append('name', stationName);
            formData.append('image', stationImage);
            formData.append('description', stationDescription);
            formData.append('stage', stationStage);

            axios.post('http://localhost:5000/api/stations', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
                .then(() => {
                    alert('Станция успешно создана!');
                    // Сброс значений полей после успешного создания станции.
                    setStationName('');
                    setStationImage(null);
                    setStationDescription('');
                    setStationStage('');
                })
                .catch((error) => {
                    console.error('Error creating station', error);
                    // Установка ошибки при создании станции.
                    setError('Ошибка при создании станции');
                });
        } else {
            // Установка ошибки, если не все поля заполнены.
            setError('Заполните все поля!');
        }
    };

    // Обработчик для изменения оценки.
    const handleRatingChange = (e) => {
        const value = e.target.value;
        // Проверка на допустимые значения (1-5).
        if (/^[1-5]$/.test(value) || value === "") {
            setRating(value);
            // Сброс ошибки, если данные корректные.
            setError(null);
        }
    };

    // Рендеринг режима создания станции.
    const renderCreationMode = () => (
        <div className="block">
            <h2>Создание станции</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleStationCreation} className="creation-form">
                <div className="form-group">
                    <label>Название станции:</label>
                    <input
                        type="text"
                        value={stationName}
                        onChange={(e) => setStationName(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Загрузите картинку:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setStationImage(e.target.files[0])}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Описание станции:</label>
                    <textarea
                        value={stationDescription}
                        onChange={(e) => setStationDescription(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Этап:</label>
                    <input
                        type="text"
                        value={stationStage}
                        onChange={(e) => setStationStage(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" className="submit-btn">Создать станцию</button>
            </form>
        </div>
    );

    // Рендеринг режима оценивания станции.
    const renderEvaluationMode = () => (
        <div className="block">
            <h2>Оценивание станции</h2>
            {loading && <p>Загрузка...</p>}
            {error && <p className="error">{error}</p>}
            {currentStation ? (
                <div>
                    <img src={`http://localhost:5000/${currentStation.image}`} className="station-image" alt="Станция" />
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>

                    <div className="form-group">
                        <label>Выберите участника:</label>
                        <select onChange={(e) => setSelectedParticipant(e.target.value)} value={selectedParticipant || ""}>
                            <option value="">Выберите своё имя</option>
                            {participants.map((participant) => (
                                <option key={participant.id} value={participant.id}>
                                    {participant.name}
                                </option>
                            ))}
                        </select>

                    </div>

                    <div className="form-group">
                        <label>Оцените станцию (1-5):</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={rating}
                            onChange={handleRatingChange} // Изменяем функцию на проверку.
                        />
                    </div>

                    <button onClick={handleRating} className="submit-btn">
                        Отправить оценку
                    </button>
                </div>
            ) : (
                <p>Станция недоступна.</p>
            )}
        </div>
    );

    // Главный рендер, выбирает режим в зависимости от состояния.
    return (
        <div className="container">
            {mode === 'evaluation' ? renderEvaluationMode() : renderCreationMode()}
        </div>
    );
}

export default ParticipantPage;
