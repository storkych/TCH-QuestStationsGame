import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
// Импорт SVG.
import logo from './assets/svg/logo.svg';
// Импорт BrowserRouter, Routes и Route.
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Подключение страниц администратора и участника.
import AdminPage from './components/AdminPage';
import ParticipantPage from './components/ParticipantPage';
import StationDetail from './components/StationDetail';

// Компонент для отображения таблицы станций с многоуровневой сортировкой.
function StationsTable({ stations }) {
    const [sortConfig, setSortConfig] = useState([]);

    // Применение сортировки.
    const sortedStations = React.useMemo(() => {
        if (sortConfig.length === 0) return stations;

        return [...stations].sort((a, b) => {
            for (const { key, direction } of sortConfig) {
                if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
                if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [stations, sortConfig]);

    // Обновление состояния сортировки.
    const toggleSort = (key) => {
        setSortConfig((prevSortConfig) => {
            const existing = prevSortConfig.find((item) => item.key === key);
            if (existing) {
                // Если направление ascending, при нажатии переключение на descending.
                if (existing.direction === 'ascending') {
                    return prevSortConfig.map((item) =>
                        item.key === key ? { ...item, direction: 'descending' } : item
                    );
                }
                // Удаление из сортировки, если направление descending.
                return prevSortConfig.filter((item) => item.key !== key);
            }
            // Добавление нового ключа с ascending.
            return [...prevSortConfig, { key, direction: 'ascending' }];
        });
    };

    // Сброс сортировки.
    const clearSort = () => {
        setSortConfig([]);
    };

    // Хелпер для отображения звездочек рейтинга.
    const renderStars = (rating) => {
        // Округление до ближайшего целого.
        const stars = Math.round(rating);
        // Пять звёзд с заполнением в зависимости от значения.
        return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
    };

    // Тогглы для сортировки.
    return (
        <div className="stations-table-container">
            <h2>Список всех станций</h2>
            <button onClick={clearSort} className="clear-sort-button">
                Сбросить сортировку
            </button>
            <table className="stations-table">
                <thead>
                <tr>
                    <th onClick={() => toggleSort('id')}>
                        ID {getSortDirection(sortConfig, 'id')}
                    </th>
                    <th onClick={() => toggleSort('name')}>
                        Название {getSortDirection(sortConfig, 'name')}
                    </th>
                    <th onClick={() => toggleSort('description')}>
                        Описание {getSortDirection(sortConfig, 'description')}
                    </th>
                    <th onClick={() => toggleSort('stage')}>
                        Этап {getSortDirection(sortConfig, 'stage')}
                    </th>
                    <th onClick={() => toggleSort('rating')}>
                        Оценка {getSortDirection(sortConfig, 'rating')}
                    </th>
                    <th onClick={() => toggleSort('round_number')}>
                        Раунд {getSortDirection(sortConfig, 'round_number')}
                    </th>
                </tr>
                </thead>
                <tbody>
                {sortedStations.length > 0 ? (
                    sortedStations.map((station) => (
                        <tr key={station.id} onClick={() => window.location.href = `/station/${station.id}`}>
                            <td>{station.id}</td>
                            <td>{station.name}</td>
                            <td>{station.description}</td>
                            <td>{station.stage}</td>
                            <td>{renderStars(station.rating)} ({station.rating || 0})</td>
                            <td>{station.round_number}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5">No stations available.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}

// Хелпер для получения направления сортировки.
function getSortDirection(sortConfig, key) {
    const sortItem = sortConfig.find((item) => item.key === key);
    if (!sortItem) return '';
    return sortItem.direction === 'ascending' ? '↑' : '↓';
}

function App() {
    const [stations, setStations] = useState([]);

    useEffect(() => {
        // Загрузка списка станций с сервера.
        axios.get('https://tch-shv.ru/api/stations')
            .then((response) => {
                setStations(response.data);
            })
            .catch((error) => {
                console.error('There was an error fetching the stations!', error);
            });
    }, []);

    return (
        <Router> {/* Оборачиваем весь компонент в Router */}
            <div className="app-container">
                <div className="header-container">
                    <img src={logo} alt='Logo' className="app-logo" />
                </div>
                <Routes> {/* Обновляем с Switch на Routes */}
                    <Route path="/" element={<StationsTable stations={stations} />} /> {/* Главная страница с таблицей станций */}
                    <Route path="/admin" element={<AdminPage stations={stations} />} /> {/* Страница для админа */}
                    <Route path="/participant" element={<ParticipantPage stations={stations} />} /> {/* Страница для участника */}
                    <Route path="/station/:stationId" element={<StationDetail />} /> {/* Маршрут для подробностей */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;
