import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPage() {
    const [currentStation, setCurrentStation] = useState(null);
    const [avgRating, setAvgRating] = useState(0);
    const [settings, setSettings] = useState({ round_number: 0, mode: 'creation' });

    // Получить текущую станцию при монтировании компонента
    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => {
                setCurrentStation(response.data);
            })
            .catch((error) => {
                console.error('Ошибка при загрузке текущей станции', error);
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
                    console.error('Ошибка при загрузке среднего рейтинга', error);
                });
        }
    };

    useEffect(() => {
        const ratingInterval = setInterval(fetchAverageRating, 5000);
        return () => clearInterval(ratingInterval);
    }, [currentStation]);

    // Перейти к следующей станции
    const handleNextStation = () => {
        axios.get('http://localhost:5000/api/next-station')
            .then((response) => {
                setCurrentStation(response.data);
                fetchAverageRating();
            })
            .catch((error) => {
                console.error('Ошибка при переходе к следующей станции', error);
            });
    };

    // Загрузка настроек из базы данных
    useEffect(() => {
        axios.get('http://localhost:5000/api/settings')
            .then(response => {
                setSettings(response.data);
            })
            .catch(error => {
                console.error('Ошибка при загрузке настроек', error);
            });
    }, []);

    // Обработчик изменения номера раунда
    const handleRoundChange = async (e) => {
        const newRound = e.target.value;
        const updatedSettings = { ...settings, round_number: newRound };

        await axios.post('http://localhost:5000/api/settings', updatedSettings)
            .catch(error => {
                console.error('Ошибка при обновлении номера раунда', error);
            });

        setSettings(updatedSettings);

        // После изменения раунда, получить новую станцию
        axios.get(`http://localhost:5000/api/current-station?round_number=${newRound}`)
            .then((response) => {
                setCurrentStation(response.data);
                fetchAverageRating();
            })
            .catch((error) => {
                console.error('Ошибка при загрузке станции для нового раунда', error);
            });
    };

    // Обработчик смены режима игры
    const handleGameMode = (newMode) => {
        const updatedSettings = { ...settings, mode: newMode };

        axios.post('http://localhost:5000/api/settings', updatedSettings)
            .then(() => {
                setSettings(updatedSettings);
            })
            .catch((error) => {
                console.error('Ошибка при смене режима игры', error);
            });
    };

    return (
        <div className="container">
            <h2>Админ панель</h2>
            <div className="mode-switcher">
                <button className={settings.mode === 'evaluation' ? 'active' : ''} onClick={() => handleGameMode('evaluation')}>
                    Оценивание
                </button>
                <div className="round-input">
                    <input
                        type="number"
                        value={settings.round_number}
                        onChange={handleRoundChange}
                        min="0"
                        style={{ textAlign: 'center' }}
                    />
                </div>
                <button className={settings.mode === 'creation' ? 'active' : ''} onClick={() => handleGameMode('creation')}>
                    Создание станции
                </button>
            </div>

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
