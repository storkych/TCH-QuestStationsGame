import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import logo from './assets/svg/logo.svg';  // Импортируем SVG
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Импортируем BrowserRouter, Routes и Route
import AdminPage from './components/AdminPage'; // Подключаем страницу админа
import ParticipantPage from './components/ParticipantPage'; // Подключаем страницу участника

// Компонент для отображения таблицы станций с многоуровневой сортировкой
function StationsTable({ stations }) {
    const [sortConfig, setSortConfig] = useState([]);

    // Применение сортировки
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

    // Обновление состояния сортировки
    const toggleSort = (key) => {
        setSortConfig((prevSortConfig) => {
            const existing = prevSortConfig.find((item) => item.key === key);
            if (existing) {
                // Если направление ascending, переключаем на descending
                if (existing.direction === 'ascending') {
                    return prevSortConfig.map((item) =>
                        item.key === key ? { ...item, direction: 'descending' } : item
                    );
                }
                // Удаляем из сортировки, если направление descending
                return prevSortConfig.filter((item) => item.key !== key);
            }
            // Добавляем новый ключ с ascending
            return [...prevSortConfig, { key, direction: 'ascending' }];
        });
    };

    // Сброс сортировки
    const clearSort = () => {
        setSortConfig([]);
    };

    // Хелпер для отображения звездочек рейтинга
    const renderStars = (rating) => {
        const stars = Math.round(rating); // Округляем до ближайшего целого
        return '⭐'.repeat(stars) + '☆'.repeat(5 - stars); // Пять звёзд с заполнением
    };

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
                </tr>
                </thead>
                <tbody>
                {sortedStations.length > 0 ? (
                    sortedStations.map((station) => (
                        <tr key={station.id}>
                            <td>{station.id}</td>
                            <td>{station.name}</td>
                            <td>{station.description}</td>
                            <td>{station.stage}</td>
                            <td>{renderStars(station.rating)} ({station.rating || 0})</td>
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

// Хелпер для получения направления сортировки
function getSortDirection(sortConfig, key) {
    const sortItem = sortConfig.find((item) => item.key === key);
    if (!sortItem) return '';
    return sortItem.direction === 'ascending' ? '↑' : '↓';
}

function App() {
    const [stations, setStations] = useState([]);

    useEffect(() => {
        // Загружаем список станций с сервера
        axios.get('http://localhost:5000/api/stations')
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
                    <h1 className="app-title">ТЧ - Работает</h1>
                </div>
                <Routes> {/* Обновляем с Switch на Routes */}
                    <Route path="/" element={<StationsTable stations={stations} />} /> {/* Главная страница с таблицей станций */}
                    <Route path="/admin" element={<AdminPage stations={stations} />} /> {/* Страница для админа */}
                    <Route path="/participant" element={<ParticipantPage stations={stations} />} /> {/* Страница для участника */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;
