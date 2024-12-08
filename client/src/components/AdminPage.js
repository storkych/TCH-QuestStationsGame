import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPage() {
    const [currentStation, setCurrentStation] = useState(null);
    const [avgRating, setAvgRating] = useState(0);

    // Получить текущую станцию (один раз при монтировании компонента)
    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => {
                setCurrentStation(response.data);
            })
            .catch((error) => {
                console.error('There was an error fetching the current station!', error);
            });
    }, []);  // Зависимости пустые, чтобы запрос выполнялся только один раз

    // Получить средний рейтинг для текущей станции
    const fetchAverageRating = () => {
        if (currentStation && currentStation.id) {
            axios.get(`http://localhost:5000/api/rating/${currentStation.id}`)
                .then((response) => {
                    setAvgRating(response.data.avg_rating);
                    console.log('AAAAAAAAA', response.data.avg_rating);
                })
                .catch((error) => {
                    console.error('Error fetching average rating', error);
                });
        }
    };

    useEffect(() => {
        // Устанавливаем интервал для обновления среднего рейтинга
        const ratingInterval = setInterval(fetchAverageRating, 5000);  // Обновляем рейтинг каждые 5 секунд

        // Очищаем интервал при размонтировании компонента
        return () => {
            clearInterval(ratingInterval);
        };
    }, [currentStation]);  // Этот useEffect сработает, когда currentStation обновится

    // Перейти к следующей станции
    const handleNextStation = () => {
        if (currentStation) {
            axios.get(`http://localhost:5000/api/next-station?currentStationId=${currentStation.id}`)
                .then((response) => {
                    setCurrentStation(response.data);  // Обновляем текущую станцию
                    fetchAverageRating();  // Немедленно обновляем рейтинг при переключении станции
                })
                .catch((error) => {
                    console.error('Error fetching next station', error);
                });
        }
    };

    return (
        <div>
            <h2>Admin Page</h2>
            {currentStation ? (
                <div>
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>
                    <h4>Average Rating: {avgRating}</h4>

                    {/* Кнопка "Следующая станция" */}
                    <button onClick={handleNextStation}>Next Station</button>
                </div>
            ) : (
                <p>No stations available.</p>
            )}
        </div>
    );
}

export default AdminPage;
