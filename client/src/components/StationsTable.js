// Обновленный компонент StationsTable с колонкой для номера раунда.
function StationsTable({ stations }) {
    const renderStars = (rating) => {
        const stars = Math.round(rating); // Округляем до ближайшего целого
        return '⭐'.repeat(stars) + '☆'.repeat(5 - stars); // Пять звёзд с заполнением
    };

    return (
        <div className="stations-table-container">
            <h2>Список всех станций</h2>
            <table className="stations-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Этап</th>
                    <th>Рейтинг</th>
                    <th>Раунд</th> {/* Новая колонка для номера раунда */}
                </tr>
                </thead>
                <tbody>
                {stations.length > 0 ? (
                    stations.map((station) => (
                        <tr key={station.id}>
                            <td>{station.id}</td>
                            <td>{station.name}</td>
                            <td>{station.description}</td>
                            <td>{station.stage}</td>
                            <td>{renderStars(station.rating)} ({station.rating || 0})</td>
                            <td>{station.round_number}</td> {/* Отображаем номер раунда */}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="6">Станции не найдены.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}
