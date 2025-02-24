import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPage() {
    const [currentStation, setCurrentStation] = useState(null);
    const [avgRating, setAvgRating] = useState(0);
    const [mode, setMode] = useState('creation');
    const [settings, setSettings] = useState({ round_number: 0, mode: 'creation' });

    // Получить текущую станцию при монтировании компонента
    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => {
                setCurrentStation(response.data);
            })
            .catch((error) => {
                console.error('There was an error fetching the current station!', error);
            });
    }, []);

    // Получить средний рейтинг для текущей станции
    const fetchAverageRating = () => {
        if (currentStation && currentStation.id) {
            axios.get(`http://localhost:5000/api/rating/${currentStation.id}`)
                .then((response) => {
                    setAvgRating(response.data.avg_rating);
                })
                .catch((error) => {
                    console.error('Error fetching average rating', error);
                });
        }
    };

    useEffect(() => {
        const ratingInterval = setInterval(fetchAverageRating, 5000);

        return () => {
            clearInterval(ratingInterval);
        };
    }, [currentStation]);

    // Перейти к следующей станции
    const handleNextStation = () => {
        if (currentStation) {
            axios.get('http://localhost:5000/api/next-station')
                .then((response) => {
                    setCurrentStation(response.data);
                    fetchAverageRating();
                })
                .catch((error) => {
                    console.error('Error next station', error);
                });
        }
    };

    // Загрузка настроек из базы данных
    useEffect(() => {
        fetch('http://localhost:5000/api/settings')
            .then(response => response.json())
            .then(data => setSettings(data));
    }, []);

    // Обработчик изменения номера раунда
    const handleRoundChange = async (e) => {
        const newRound = e.target.value;
        await fetch('http://localhost:5000/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ round_number: newRound, mode: settings.mode })
        });
        setSettings(prevState => ({ ...prevState, round_number: newRound }));

        // После изменения раунда, получить новую станцию
        axios.get(`http://localhost:5000/api/current-station?round_number=${newRound}`)
            .then((response) => {
                setCurrentStation(response.data);
                fetchAverageRating(); // Обновляем рейтинг для новой станции
            })
            .catch((error) => {
                console.error('Error fetching station for new round:', error);
            });
    };

    // Обработчик смены режима игры
    const handleGameMode = (newMode) => {
        setMode(newMode);

        axios.post('http://localhost:5000/api/game-mode', { game_mode: newMode })
            .then((response) => {
                console.log('Game mode updated:', response.data);
            })
            .catch((error) => {
                console.error('Error changing game mode:', error);
            });
    };

    return (
        <div className="container">
            <h2>Админ панель</h2>
            <div className="mode-switcher">
                <button className={mode === 'evaluation' ? 'active' : ''} onClick={() => handleGameMode('evaluation')}>
                    Оценивание
                </button>
                <button className={mode === 'creation' ? 'active' : ''} onClick={() => handleGameMode('creation')}>
                    Создание станции
                </button>
            </div>
            <label>
                Выберите раунд:
                <select value={settings.round_number} onChange={handleRoundChange}>
                    <option value={0}>Раунд 0</option>
                    <option value={1}>Раунд 1</option>
                    <option value={2}>Раунд 2</option>
                </select>
            </label>
            {currentStation ? (
                <div className="block">
                    <img src={`http://localhost:5000/${currentStation.image}`} className="station-image" alt={currentStation.name}></img>
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>
                    <h4>Средний рейтинг: {avgRating}</h4>
                    <button onClick={handleNextStation} className="submit-btn">Следующая станция</button>
                </div>
            ) : (
                <p>Станция не найдена.</p>
            )}
        </div>
    );
}

export default AdminPage;
