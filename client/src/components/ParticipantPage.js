import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ParticipantPage() {
    const [currentStation, setCurrentStation] = useState(null);
    const [rating, setRating] = useState(0);
    const [participants, setParticipants] = useState([]);
    const [selectedParticipant, setSelectedParticipant] = useState(null);
    const [loading, setLoading] = useState(true); // Для отслеживания состояния загрузки
    const [error, setError] = useState(null); // Для ошибок

    // Получить текущую станцию
    useEffect(() => {
        axios.get('http://localhost:5000/api/current-station')
            .then((response) => {
                setCurrentStation(response.data);
                console.log('Current station data:', response.data); // Логирование данных
            })
            .catch((error) => {
                setError('Error fetching current station');
                console.error('There was an error fetching the current station!', error);
            });

        // Получить список участников
        axios.get('http://localhost:5000/api/participants')
            .then((response) => {
                setParticipants(response.data);
            })
            .catch((error) => {
                setError('Error fetching participants');
                console.error('Error fetching participants', error);
            })
            .finally(() => setLoading(false)); // Убираем индикатор загрузки
    }, []);

    // Оценить станцию
    const handleRating = () => {
        if (currentStation && selectedParticipant && rating >= 1 && rating <= 5) {
            console.log('Submitting rating:', {
                participant_id: selectedParticipant,
                station_id: currentStation.id,
                rating: rating
            });

            axios.post('http://localhost:5000/api/rating', {
                participant_id: selectedParticipant,
                station_id: currentStation.id,
                rating: rating
            })
                .then(() => {
                    console.log('Rating submitted');
                })
                .catch((error) => {
                    setError('Error submitting rating');
                    console.error('Error submitting rating', error);
                });
        } else {
            setError('Invalid data for rating submission');
        }
    };

    return (
        <div>
            <h2>Participant Page</h2>

            {loading && <p>Loading...</p>}  {/* Индикатор загрузки */}

            {error && <p style={{ color: 'red' }}>{error}</p>}  {/* Ошибки */}

            {currentStation ? (
                <div>
                    <h3>{currentStation.name}</h3>
                    <p>{currentStation.description}</p>
                    <img src={currentStation.photo_url} alt={currentStation.name} />

                    <div>
                        <label>Select Participant:</label>
                        <select onChange={(e) => setSelectedParticipant(e.target.value)} value={selectedParticipant}>
                            <option value="">Select your name</option>
                            {participants.map((participant) => (
                                <option key={participant.id} value={participant.id}>
                                    {participant.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Rate this station (1 to 5):</label>
                        <input
                            type="number"
                            min="1"
                            max="5"
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                        />
                    </div>

                    <button onClick={handleRating}>Submit Rating</button>
                </div>
            ) : (
                <p>No stations available.</p>
            )}
        </div>
    );
}

export default ParticipantPage;