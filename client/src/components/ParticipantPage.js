import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ParticipantPage() {
    const [currentStation, setCurrentStation] = useState(null);
    const [rating, setRating] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('evaluation'); // Режимы: оценивание / создание

    // Состояния для создания станции
    const [stationName, setStationName] = useState('');
    const [stationImage, setStationImage] = useState(null);
    const [stationDescription, setStationDescription] = useState('');
    const [stationStage, setStationStage] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => setCurrentStation(response.data))
            .catch((error) => setError('Error fetching current station'));

        axios.get('http://localhost:5000/api/participants')
            .then((response) => setParticipants(response.data))
            .catch((error) => setError('Error fetching participants'))
            .finally(() => setLoading(false));

        // Подключение к WebSocket
        const socket = new WebSocket('ws://localhost:5000');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setCurrentStation(data); // Обновляем текущую станцию
        };

        // Очистка при размонтировании
        return () => socket.close();
    }, []);

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
            setError('Invalid data for rating submission');
        }
    };

    // Функция отправки новой станции
    const handleStationCreation = (e) => {
        e.preventDefault();
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
                    setStationName('');
                    setStationImage(null);
                    setStationDescription('');
                    setStationStage('');
                })
                .catch((error) => {
                    console.error('Error creating station', error);
                    setError('Ошибка при создании станции');
                });
        } else {
            setError('Заполните все поля!');
        }
    };

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

    const renderEvaluationMode = () => (
        <div className="block">
            <h2>Оценивание станции</h2>
            {loading && <p>Загрузка...</p>}
            {error && <p className="error">{error}</p>}
            {currentStation ? (
                <div>
                    <img src={`http://localhost:5000/${currentStation.image}`} className="station-image"></img>
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>

                    <div className="form-group">
                        <label>Выберите участника:</label>
                        <select onChange={(e) => setSelectedParticipant(e.target.value)} value={selectedParticipant}>
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
                            onChange={(e) => setRating(e.target.value)}
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

    return (
        <div className="container">
            <div className="mode-switcher">
                <button className={mode === 'evaluation' ? 'active' : ''} onClick={() => setMode('evaluation')}>
                    Оценивание
                </button>
                <button className={mode === 'creation' ? 'active' : ''} onClick={() => setMode('creation')}>
                    Создание станции
                </button>
            </div>
            {mode === 'evaluation' ? renderEvaluationMode() : renderCreationMode()}
        </div>
    );
}

export default ParticipantPage;
