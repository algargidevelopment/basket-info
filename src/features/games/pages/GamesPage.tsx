import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import './GamesPage.css'

const SEASON = '2026-27'
type Status = 'scheduled' | 'live' | 'finished'
type Team = { id: string; name: string; short_name: string | null; logo_url: string | null }
type Game = {
  id: string; round: string | null; game_date: string; home_team_id: string; away_team_id: string; venue: string | null
  status: Status; home_score: number | null; away_score: number | null
  home_q1_score: number | null; away_q1_score: number | null; home_q2_score: number | null; away_q2_score: number | null
  home_q3_score: number | null; away_q3_score: number | null; home_q4_score: number | null; away_q4_score: number | null
}
type Player = { id: string; name: string }
type PlayerStat = { game_id: string; player_id: string; points: number; rebounds: number | null; offensive_rebounds: number | null; defensive_rebounds: number | null; assists: number | null }
type Filter = 'all' | 'upcoming' | 'finished'

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function dateParts(value: string) {
  const date = new Date(value)
  return {
    day: new Intl.DateTimeFormat('es-ES', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
    full: new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    time: new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date),
  }
}
function gameStatus(status: Status) { return status === 'finished' ? 'Finalizado' : status === 'live' ? 'En juego' : 'Próximo' }
function addToCalendar(game: Game, home: string, away: string, competition: string) {
  const start = new Date(game.game_date)
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({ action: 'TEMPLATE', text: `${home} - ${away}`, dates: `${stamp(start)}/${stamp(new Date(start.getTime() + 2 * 60 * 60 * 1000))}`, location: game.venue ?? '', details: `${competition}${game.round ? ` · ${game.round}` : ''}` })
  window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank', 'noopener,noreferrer')
}

export default function GamesPage() {
  const { competition } = useCompetition()
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const nextGameRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!supabase) { setError('Configura Supabase para consultar los partidos.'); setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      const { data: comp, error: compError } = await supabase!.from('competitions').select('id').eq('name', competition).maybeSingle()
      if (compError || !comp) { if (!cancelled) { setError(compError?.message ?? `No se encontró ${competition}.`); setLoading(false) }; return }
      const [gameResult, teamResult] = await Promise.all([
        supabase!.from('games').select('id,round,game_date,home_team_id,away_team_id,venue,status,home_score,away_score,home_q1_score,away_q1_score,home_q2_score,away_q2_score,home_q3_score,away_q3_score,home_q4_score,away_q4_score').eq('competition_id', comp.id).eq('season', SEASON).order('game_date', { ascending: true }),
        supabase!.from('teams').select('id,name,short_name,logo_url'),
      ])
      if (gameResult.error || teamResult.error) { if (!cancelled) { setError(gameResult.error?.message ?? teamResult.error?.message ?? 'No se pudieron cargar los partidos.'); setLoading(false) }; return }
      const allGames = (gameResult.data ?? []) as Game[]
      const finishedIds = allGames.filter((game) => game.status === 'finished').map((game) => game.id)
      let statRows: PlayerStat[] = []
      let playerRows: Player[] = []
      if (finishedIds.length) {
        const [statResult, playerResult] = await Promise.all([
          supabase!.from('game_player_stats').select('game_id,player_id,points,rebounds,offensive_rebounds,defensive_rebounds,assists').in('game_id', finishedIds),
          supabase!.from('players').select('id,name'),
        ])
        if (statResult.error || playerResult.error) { if (!cancelled) { setError(statResult.error?.message ?? playerResult.error?.message ?? 'No se pudieron cargar las estadísticas.'); setLoading(false) }; return }
        statRows = (statResult.data ?? []) as PlayerStat[]
        playerRows = (playerResult.data ?? []) as Player[]
      }
      if (!cancelled) { setGames(allGames); setTeams((teamResult.data ?? []) as Team[]); setStats(statRows); setPlayers(playerRows); setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [competition])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const valencia = teams.find((team) => team.name.toLowerCase() === 'valencia basket')
  const valenciaGames = useMemo(() => valencia ? games.filter((game) => game.home_team_id === valencia.id || game.away_team_id === valencia.id) : [], [games, valencia])
  const nextGame = valenciaGames.find((game) => game.status === 'live') ?? valenciaGames.find((game) => game.status === 'scheduled' && new Date(game.game_date).getTime() >= Date.now())
  const filteredGames = valenciaGames
    .filter((game) => filter === 'all' || (filter === 'finished' ? game.status === 'finished' : game.status !== 'finished'))
    .sort((a, b) => filter !== 'finished' ? Number(b.id === nextGame?.id) - Number(a.id === nextGame?.id) : 0)
  function scrollToNextGame() {
    setFilter('all')
    window.setTimeout(() => nextGameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }
  const summary = useMemo(() => {
    const finished = valenciaGames.filter((game) => game.status === 'finished' && game.home_score !== null && game.away_score !== null)
    const wins = finished.filter((game) => game.home_team_id === valencia?.id ? game.home_score! > game.away_score! : game.away_score! > game.home_score!).length
    const pointsFor = finished.reduce((sum, game) => sum + (game.home_team_id === valencia?.id ? game.home_score! : game.away_score!), 0)
    const pointsAgainst = finished.reduce((sum, game) => sum + (game.home_team_id === valencia?.id ? game.away_score! : game.home_score!), 0)
    return { played: finished.length, wins, losses: finished.length - wins, upcoming: valenciaGames.filter((game) => game.status !== 'finished').length, pointsFor, pointsAgainst }
  }, [valenciaGames, valencia])
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player.name])), [players])
  const statsByGame = useMemo(() => {
    const result = new Map<string, PlayerStat[]>()
    for (const row of stats) result.set(row.game_id, [...(result.get(row.game_id) ?? []), row])
    return result
  }, [stats])

  return <section className="games-page">
    <header className="games-hero">
      <div className="games-hero__copy"><span className="games-eyebrow">TEMPORADA {SEASON.replace('-', ' / ')} · {competition}</span><h1>Partidos del Valencia</h1><p>Calendario, resultados y estadísticas de cada encuentro de Valencia Basket.</p>{nextGame && <button className="games-hero__next" type="button" onClick={scrollToNextGame}>Ver próximo partido <span>↓</span></button>}</div>
      <div className="games-hero__badge"><span>VB</span><small>Valencia<br />Basket</small></div>
    </header>

    {!loading && !error && <div className="games-summary">
      <article><span>Partidos jugados</span><strong>{summary.played}</strong><small>{summary.wins} victorias · {summary.losses} derrotas</small></article>
      <article><span>Próximos</span><strong>{summary.upcoming}</strong><small>Encuentros pendientes</small></article>
      <article><span>Puntos anotados</span><strong>{summary.pointsFor}</strong><small>{summary.played ? `${(summary.pointsFor / summary.played).toFixed(1)} por partido` : 'Sin resultados'}</small></article>
      <article><span>Puntos recibidos</span><strong>{summary.pointsAgainst}</strong><small>{summary.played ? `${(summary.pointsAgainst / summary.played).toFixed(1)} por partido` : 'Sin resultados'}</small></article>
    </div>}

    <section className="games-list" aria-label="Calendario de Valencia Basket">
      <div className="games-list__heading"><div><span className="games-eyebrow">CALENDARIO Y RESULTADOS</span><h2>Todos los encuentros</h2></div>
        <div className="games-filters" aria-label="Filtrar partidos">
          {([['all', 'Todos'], ['upcoming', 'Próximos'], ['finished', 'Finalizados']] as const).map(([value, label]) => <button type="button" key={value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
        </div>
      </div>
      {loading ? <div className="games-state">Cargando calendario…</div> : error ? <div className="games-state games-state--error" role="alert">{error}</div> : !valencia ? <div className="games-state">No se encontró Valencia Basket en los equipos de {competition}.</div> : !filteredGames.length ? <div className="games-state">No hay partidos {filter === 'finished' ? 'finalizados' : filter === 'upcoming' ? 'próximos' : ''} cargados.</div> : <div className="games-list__items">{filteredGames.map((game) => {
        const home = teamById.get(game.home_team_id); const away = teamById.get(game.away_team_id); const isHome = game.home_team_id === valencia.id
        const date = dateParts(game.game_date); const rows = statsByGame.get(game.id) ?? []
        const leaders = [...rows].sort((a, b) => b.points - a.points).slice(0, 3)
        const quarters = [1, 2, 3, 4].map((quarter) => ({ quarter, home: game[`home_q${quarter}_score` as keyof Game], away: game[`away_q${quarter}_score` as keyof Game] }))
        const isNext = game.id === nextGame?.id
        return <article ref={isNext ? nextGameRef : undefined} className={`game-card${game.status === 'live' ? ' game-card--live' : ''}${isNext ? ' game-card--next' : ''}`} key={game.id}>
          <div className="game-card__date"><strong>{date.day}</strong><span>{date.month}</span><small>{game.round || 'Temporada regular'}</small></div>
          <div className="game-card__main">
            <div className="game-card__meta"><span className={`game-status game-status--${game.status}`}>{gameStatus(game.status)}</span><span>{date.full} · {date.time}</span><span>{isHome ? 'Local' : 'Visitante'}</span></div>
            <div className="game-card__matchup">
              <div className={`game-team${home?.id === valencia.id ? ' game-team--valencia' : ''}`}><span className="game-team__mark">{home?.logo_url ? <img src={home.logo_url} alt="" /> : initials(home?.short_name || home?.name || 'L')}</span><strong>{home?.name ?? 'Equipo local'}</strong><small>Local</small></div>
              <div className="game-score">{game.status === 'scheduled' ? <><strong>VS</strong><span>—</span></> : <><strong>{game.home_score ?? '—'}</strong><span>:</span><strong>{game.away_score ?? '—'}</strong></>}</div>
              <div className={`game-team game-team--away${away?.id === valencia.id ? ' game-team--valencia' : ''}`}><span className="game-team__mark">{away?.logo_url ? <img src={away.logo_url} alt="" /> : initials(away?.short_name || away?.name || 'V')}</span><strong>{away?.name ?? 'Equipo visitante'}</strong><small>Visitante</small></div>
            </div>
            <div className="game-card__details"><span>⌖ {game.venue || 'Sede pendiente'}</span><span>{competition}{game.round ? ` · ${game.round}` : ''}</span></div>
            {game.status === 'finished' && quarters.some((part) => part.home !== null || part.away !== null) && <div className="game-periods" aria-label="Puntos por cuarto"><b>Parcial</b>{quarters.map((part) => <span key={part.quarter}>Q{part.quarter}<strong>{part.home ?? '—'}–{part.away ?? '—'}</strong></span>)}<span>Final<strong>{game.home_score ?? '—'}–{game.away_score ?? '—'}</strong></span></div>}
            {leaders.length > 0 && <div className="game-card__leaders"><b>Destacados</b>{leaders.map((row) => <span key={row.player_id}><strong>{playerById.get(row.player_id) ?? 'Jugador'}</strong><small>{row.points} PTS · {row.rebounds ?? 0} REB · {row.assists ?? 0} AST</small></span>)}</div>}
          </div>
          {game.status === 'scheduled' && <button className="game-card__calendar" type="button" onClick={() => addToCalendar(game, home?.name ?? 'Local', away?.name ?? 'Visitante', competition)} aria-label={`Añadir ${home?.name} contra ${away?.name} al calendario`}>＋<span>Añadir<br />al calendario</span></button>}
        </article>
      })}</div>}
    </section>
  </section>
}
