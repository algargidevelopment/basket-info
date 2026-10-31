import './Header.css'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router'
import { useCompetition } from '../../lib/useCompetition'
import { supabase } from '../../lib/supabase'

const SEASON = '2026-27'
type HeaderGame = { game_date: string; home_team_id: string; away_team_id: string }
type HeaderTeam = { id: string; name: string; short_name: string | null }

function formatHeaderGame(game: HeaderGame, teams: Map<string, HeaderTeam>) {
  const home = teams.get(game.home_team_id)
  const away = teams.get(game.away_team_id)
  const date = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(game.game_date)).replace(/\.$/, '')
  return `${home?.short_name || home?.name || 'Valencia Basket'} vs. ${away?.short_name || away?.name || 'Rival'} · ${date}`
}

export default function Header() {
  const { competition, setCompetition } = useCompetition()
  const [nextGame, setNextGame] = useState('Cargando próximo partido…')
  const [hidden, setHidden] = useState(false)
  const previousScrollY = useRef(0)

  useEffect(() => {
    let cancelled = false
    async function loadNextGame() {
      if (!supabase) { setNextGame('Calendario no disponible'); return }
      setNextGame('Cargando próximo partido…')
      const { data: comp } = await supabase.from('competitions').select('id').eq('name', competition).maybeSingle()
      if (!comp) { if (!cancelled) setNextGame(`Sin calendario de ${competition}`); return }
      const [gameResult, teamResult] = await Promise.all([
        supabase.from('games').select('game_date,home_team_id,away_team_id').eq('competition_id', comp.id).eq('season', SEASON).eq('status', 'scheduled').gte('game_date', new Date().toISOString()).order('game_date', { ascending: true }).limit(30),
        supabase.from('teams').select('id,name,short_name'),
      ])
      if (cancelled) return
      if (gameResult.error || teamResult.error) { setNextGame('No se pudo cargar el calendario'); return }
      const teams = new Map(((teamResult.data ?? []) as HeaderTeam[]).map((team) => [team.id, team]))
      const valencia = [...teams.values()].find((team) => team.name.toLowerCase() === 'valencia basket')
      const game = ((gameResult.data ?? []) as HeaderGame[]).find((item) => item.home_team_id === valencia?.id || item.away_team_id === valencia?.id)
      setNextGame(game ? formatHeaderGame(game, teams) : `Sin próximos partidos de ${competition}`)
    }
    void loadNextGame()
    return () => { cancelled = true }
  }, [competition])

  useEffect(() => {
    previousScrollY.current = window.scrollY
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const difference = currentScrollY - previousScrollY.current

      if (currentScrollY < 80) {
        setHidden(false)
      } else if (difference > 6) {
        setHidden(true)
      } else if (difference < -6) {
        setHidden(false)
      }

      if (Math.abs(difference) > 6) previousScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`site-header${hidden ? ' site-header--hidden' : ''}`}>
      <NavLink className="site-header__brand" to="/" aria-label="Taronja Basket, inicio">
        <span className="site-header__brand-mark" aria-hidden="true">TB</span>
        <span className="site-header__brand-name">Taronja<span>Basket</span></span>
      </NavLink>

      <div className="site-header__next-game" aria-label="Próximo partido">
        <span className="site-header__next-game-label">PRÓXIMO PARTIDO</span>
        <span className="site-header__next-game-info">{nextGame}</span>
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
