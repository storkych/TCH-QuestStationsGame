import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Импортируем BrowserRouter, Routes и Route
import AdminPage from './components/AdminPage'; // Подключаем страницу админа
import ParticipantPage from './components/ParticipantPage'; // Подключаем страницу участника

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
            <div>
                <h1>Quest Stations</h1>
                <Routes> {/* Обновляем с Switch на Routes */}
                    <Route path="/admin" element={<AdminPage stations={stations} />} /> {/* Страница для админа */}
                    <Route path="/participant" element={<ParticipantPage stations={stations} />} /> {/* Страница для участника */}
                </Routes>
            </div>
        </Router>
    );
}

export default App;
