import './Header.css'
import { NavLink } from 'react-router'
import { useCompetition } from '../../lib/useCompetition'

export default function Header() {
  const { competition, setCompetition } = useCompetition()

  return (
    <header className="site-header">
      <NavLink className="site-header__brand" to="/" aria-label="Taronja Basket, inicio">
        <span className="site-header__brand-mark" aria-hidden="true">TB</span>
        <span className="site-header__brand-name">Taronja<span>Basket</span></span>
      </NavLink>

      <div className="site-header__next-game" aria-label="Próximo partido">
        <span className="site-header__next-game-label">PRÓXIMO PARTIDO</span>
        <span className="site-header__next-game-info">Valencia vs. Baskonia · Vie, 17:00</span>
      </div>

      <nav className="primary-nav" aria-label="Navegación principal">

        <NavLink to="/" end className={({ isActive }) =>`primary-nav__link ${isActive ? 'primary-nav__link--active' : ''}`}>Inicio</NavLink>

        <NavLink to="/partidos" className={({ isActive }) =>`primary-nav__link ${isActive ? 'primary-nav__link--active' : ''}`}>Partidos</NavLink>

        <NavLink to="/plantilla" className={({ isActive }) =>`primary-nav__link ${isActive ? 'primary-nav__link--active' : ''}`}>Plantilla</NavLink>

        <NavLink to="/clasificacion" className={({ isActive }) =>`primary-nav__link ${isActive ? 'primary-nav__link--active' : ''}`}>Clasificación</NavLink>

        <NavLink to="/estadisticas" className={({ isActive }) =>`primary-nav__link ${isActive ? 'primary-nav__link--active' : ''}`}>Estadísticas</NavLink>

      </nav>

      <div className="competition-switch" role="group" aria-label="Seleccionar competición">
        <button
          className={`competition-switch__option ${competition === 'ACB' ? 'competition-switch__option--active' : ''}`}
          type="button"
          aria-pressed={competition === 'ACB'}
          onClick={() => setCompetition('ACB')}
        >
          ACB
        </button>
        <button
          className={`competition-switch__option ${competition === 'EuroLeague' ? 'competition-switch__option--active' : ''}`}
          type="button"
          aria-pressed={competition === 'EuroLeague'}
          onClick={() => setCompetition('EuroLeague')}
        >
          EUROLIGA
        </button>
      </div>
    </header>
  )
}
