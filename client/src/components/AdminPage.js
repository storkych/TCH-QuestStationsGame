import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPage() {
    // Хук состояния для хранения текущей станции.
    const [currentStation, setCurrentStation] = useState(null);
    // Хук состояния для хранения среднего рейтинга текущей станции.
    const [avgRating, setAvgRating] = useState(0);
    // Хук состояния для режима работы (оценивание или создание).
    const [mode, setMode] = useState('creation'); // Режимы: оценивание / создание.

    // Получить текущую станцию (один раз при монтировании компонента).
    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => {
                setCurrentStation(response.data); // Устанавливаем текущую станцию.
            })
            .catch((error) => {
                console.error('There was an error fetching the current station!', error); // Логирование ошибки.
            });
    }, []); // Зависимости пустые, чтобы запрос выполнялся только один раз.

    // Получить средний рейтинг для текущей станции.
    const fetchAverageRating = () => {
        if (currentStation && currentStation.id) { // Проверка, что текущая станция существует.
            axios.get(`http://localhost:5000/api/rating/${currentStation.id}`)
                .then((response) => {
                    setAvgRating(response.data.avg_rating); // Устанавливаем средний рейтинг.
                })
                .catch((error) => {
                    console.error('Error fetching average rating', error); // Логирование ошибки.
                });
        }
    };

    useEffect(() => {
        // Устанавливаем интервал для обновления среднего рейтинга.
        const ratingInterval = setInterval(fetchAverageRating, 5000); // Обновляем рейтинг каждые 5 секунд.

        // Очищаем интервал при размонтировании компонента.
        return () => {
            clearInterval(ratingInterval); // Остановка интервала.
        };
    }, [currentStation]); // Этот useEffect сработает, когда currentStation обновится.

    // Перейти к следующей станции.
    const handleNextStation = () => {
        if (currentStation) {
            axios.get(`http://localhost:5000/api/next-station`)
                .then((response) => {
                    setCurrentStation(response.data); // Обновляем текущую станцию.
                    fetchAverageRating(); // Немедленно обновляем рейтинг при переключении станции.
                })
                .catch((error) => {
                    console.error('Error next station', error); // Логирование ошибки.
                });
        }
    };

    // Обработчик смены режима игры.
    const handleGameMode = (newMode) => {
        setMode(newMode); // Устанавливаем новый режим.

        axios.post('http://localhost:5000/api/game-mode', { game_mode: newMode })
            .then((response) => {
                console.log('Game mode updated:', response.data); // Логирование успешного обновления режима.
            })
            .catch((error) => {
                console.error('Error changing game mode:', error); // Логирование ошибки.
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

            {currentStation ? (
                <div className="block">
                    <img src={`http://localhost:5000/${currentStation.image}`} className="station-image" alt={currentStation.name}></img>
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>
                    <h4>Средний рейтинг: {avgRating}</h4>

                    {/* Кнопка "Следующая станция" */}
                    <button onClick={handleNextStation} className="submit-btn">Следующая станция</button>
                </div>
            ) : (
                <p>Станция не найдена.</p>
            )}
        </div>
    );
}

export default AdminPage;
