function StationsTable({ stations }) {
    const renderStars = (rating) => {
        const stars = Math.round(rating); // Округляем до ближайшего целого
        return '⭐'.repeat(stars) + '☆'.repeat(5 - stars); // Пять звёзд с заполнением
    };

    return (
        <div className="stations-table-container">
            <h2>All Stations</h2>
            <table className="stations-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Stage</th>
                    <th>Rating</th>
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
