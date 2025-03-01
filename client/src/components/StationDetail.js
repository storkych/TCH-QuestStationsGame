import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Хелпер для отображения звездочек рейтинга.
function renderStars(rating) {
    const stars = Math.round(rating); // Округляем до ближайшего целого
    return '⭐'.repeat(stars) + '☆'.repeat(5 - stars); // Пять звёзд с заполнением
}

function StationDetail() {
    const { stationId } = useParams(); // Получаем stationId из параметров маршрута
    console.log('stationId:', stationId); // Логируем значение stationId
    const [station, setStation] = useState(null);

    useEffect(() => {
        if (!stationId) return; // Если нет stationId, ничего не делать

        // Загрузка данных о выбранной станции
        axios.get(`https://tch-shv.ru/api/stations/${stationId}`)
            .then((response) => {
                console.log('Station data:', response.data); // Для отладки
                setStation(response.data);
            })
            .catch((error) => {
                console.error('Ошибка при загрузке данных о станции!', error);
            });
    }, [stationId]);

    if (!station) return <div>Загрузка...</div>;

    return (
        <div className="container">
            <h2>{station.name}</h2>
            <img src={`https://tch-shv.ru/${station.image}`} alt={station.name} className="station-image"/>
            <p className="station-description">{station.description}</p>
            <div className="station-info">
                <p><strong>Этап:</strong> {station.stage}</p>
                <p><strong>Рейтинг:</strong> {renderStars(station.rating)} ({station.rating || 0})</p>
            </div>
            <button onClick={() => window.history.back()} className="close-btn">Закрыть</button>
        </div>
    );
}

export default StationDetail;
