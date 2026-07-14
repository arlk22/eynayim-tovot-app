import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './HazardMap.css';

const HADAR_CENTER = [32.811, 34.996];

const CATEGORY_COLORS = {
  'ניקיון ותברואה': '#795548',
  'הולכי רגל ונגישות': '#3a5db0',
  'בטיחות ותשתיות': '#d05a3c',
  'חזות המרחב': '#8a5cb5',
  'תאורה וביטחון אישי': '#c99618',
  'סביבה וצמחייה': '#1f9e8a',
  'שימוש ציבורי במרחב': '#c74e8f',
};
const DEFAULT_COLOR = '#888888';

function colorFor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

export default function HazardMap({ locations, onLocationClick }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (!locations?.length) return null;

  const categories = [...new Set(locations.map((l) => l.category).filter(Boolean))];
  const visibleLocations = selectedCategory
    ? locations.filter((l) => l.category === selectedCategory)
    : locations;

  function toggleCategory(category) {
    setSelectedCategory((current) => (current === category ? null : category));
  }

  return (
    <div className={`hazard-map${expanded ? ' hazard-map--expanded' : ''}`}>
      <button type="button" className="hazard-map__expand-btn" onClick={() => setExpanded((e) => !e)}>
        {expanded ? '↙ הקטן מפה' : '↗ הגדל מפה'}
      </button>
      <div className="hazard-map__container-wrap" style={{ height: expanded ? '70vh' : '320px' }}>
      <MapContainer
        center={HADAR_CENTER}
        zoom={15}
        scrollWheelZoom={false}
        className="hazard-map__container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {visibleLocations.map((loc, i) => (
          <CircleMarker
            key={i}
            center={[loc.lat, loc.lng]}
            radius={7}
            pathOptions={{
              color: colorFor(loc.category),
              fillColor: colorFor(loc.category),
              fillOpacity: loc.closed ? 0.25 : 0.85,
              opacity: loc.closed ? 0.4 : 0.9,
            }}
          >
            <Popup>
              <div className="hazard-map__popup">
                <strong>{loc.category}</strong>
                {loc.subcategory && loc.subcategory !== loc.category ? ` — ${loc.subcategory}` : ''}
                <br />
                {loc.label}
                {loc.closed && <div className="hazard-map__popup-closed">טופל וסגור</div>}
                {onLocationClick && loc.id && (
                  <button
                    type="button"
                    className="hazard-map__popup-btn"
                    onClick={() => onLocationClick(loc.id)}
                  >
                    פתח דיווח
                  </button>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      </div>
      <div className="hazard-map__legend">
        <button
          type="button"
          className={`hazard-map__legend-item hazard-map__legend-item--all${!selectedCategory ? ' hazard-map__legend-item--active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          הכל
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`hazard-map__legend-item${selectedCategory === c ? ' hazard-map__legend-item--active' : ''}`}
            onClick={() => toggleCategory(c)}
          >
            <span className="hazard-map__legend-dot" style={{ background: colorFor(c) }} />
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
