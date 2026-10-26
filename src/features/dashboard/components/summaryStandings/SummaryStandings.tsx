import { Link } from 'react-router'
import './SummaryStandings.css'

const nearbyTeams = [
  { position: 1, name: 'Valencia Basket', record: '18 - 3', current: true  },
  { position: 2, name: 'Unicaja Málaga', record: '16 - 5' },
  { position: 3, name: 'Real Madrid', record: '15 - 6'},
  { position: 4, name: 'FC Barcelona', record: '14 - 7' },
]

export default function SummaryStandings() {
  return (
    <section className="card summary-standings" aria-label="Resumen de la clasificación">
      <header className="summary-standings__header">
        <span className="summary-standings__league">Liga Endesa 2024/25</span>
        <span className="summary-standings__playoffs">Zona playoffs</span>
      </header>

      <div className="summary-standings__balance">
        <div className="summary-standings__metric">
          <span className="summary-standings__label">Puesto</span>
          <strong className="summary-standings__value summary-standings__value--orange">1º</strong>
          <span className="summary-standings__detail">Head-to-head</span>
        </div>
        <div className="summary-standings__metric">
          <span className="summary-standings__label">Balance</span>
          <strong className="summary-standings__value">18 - 3</strong>
          <span className="summary-standings__detail summary-standings__detail--orange">71.4% Vic.</span>
        </div>
        <div className="summary-standings__metric">
          <span className="summary-standings__label">Racha</span>
          <strong className="summary-standings__value summary-standings__value--orange">+2V</strong>
          <span className="summary-standings__detail">Consecutivas</span>
        </div>
        <div className="summary-standings__metric">
          <span className="summary-standings__label">Diferencial</span>
          <strong className="summary-standings__value">+97</strong>
          <span className="summary-standings__detail">Puntos netos</span>
        </div>
      </div>

      <div className="summary-standings__stats" aria-label="Estadísticas de equipo">
        <div className="summary-standings__stat">
          <div className="summary-standings__stat-heading">
            <span>Anotación media Taronja</span>
            <strong>85.8 PPP (3º ACB)</strong>
          </div>
          <div className="summary-standings__track" role="img" aria-label="85.8 puntos por partido, tercer puesto ACB">
            <span className="summary-standings__fill summary-standings__fill--orange" />
          </div>
        </div>
        <div className="summary-standings__stat">
          <div className="summary-standings__stat-heading">
            <span>Defensa puntos encajados</span>
            <strong>81.2 PPP (4º ACB)</strong>
          </div>
          <div className="summary-standings__track" role="img" aria-label="81.2 puntos encajados por partido, cuarto puesto ACB">
            <span className="summary-standings__fill summary-standings__fill--slate" />
          </div>
        </div>
      </div>

      <ol className="summary-standings__teams" aria-label="Equipos cercanos en la clasificación" start={2}>
        {nearbyTeams.map((team) => (
          <li className={`summary-standings__team${team.current ? ' summary-standings__team--current' : ''}`} key={team.position}>
            <span className="summary-standings__position">{team.position}.</span>
            <span className="summary-standings__team-name">{team.name}</span>
            <span className="summary-standings__record">{team.record}</span>
          </li>
        ))}
      </ol>

      <Link className="summary-standings__link" to="/clasificacion">
        Ver clasificación completa <span aria-hidden="true">▤</span>
      </Link>
    </section>
  )
}
