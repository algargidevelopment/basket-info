import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import { teamLogoFor, teamLogoNeedsDarkInk } from '../../teams/teamLogos'
import './TeamStatsPage.css'

const SEASON = '2026-27'
type Game = { id: string; round: string | null; game_date: string; home_team_id: string; away_team_id: string; home_score: number | null; away_score: number | null; status: string }
type TeamGameStats = { game_id: string; two_points_made: number; two_points_attempted: number; three_points_made: number; three_points_attempted: number; free_throws_made: number; free_throws_attempted: number; offensive_rebounds: number; defensive_rebounds: number; assists: number; steals: number; blocks: number; turnovers: number; fouls: number }
type PlayerGameStats = { game_id: string; points: number; two_points_made: number; two_points_attempted: number; three_points_made: number; three_points_attempted: number; free_throws_made: number; free_throws_attempted: number; offensive_rebounds: number; defensive_rebounds: number; rebounds: number | null; assists: number; steals: number; blocks: number; turnovers: number; fouls: number }
type Team = { id: string; name: string; short_name: string | null; logo_url: string | null }
type Box = Omit<TeamGameStats, 'game_id'> & { points: number; pointsAgainst: number; rebounds: number | null; playerRows: number; hasStats: boolean; game: Game }
type Metric = keyof Omit<TeamGameStats, 'game_id'>
const statFields: Metric[] = ['two_points_made', 'two_points_attempted', 'three_points_made', 'three_points_attempted', 'free_throws_made', 'free_throws_attempted', 'offensive_rebounds', 'defensive_rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls']

const fmt = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })
function average(value: number, games: number) { return games ? fmt.format(value / games) : '—' }
function percentage(made: number, attempted: number) { return attempted ? Math.round(made / attempted * 100) : null }
function dateLabel(date: string) { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(date)).replace('.', '') }
function blankBox(game: Game): Box { return { game, points: 0, pointsAgainst: 0, rebounds: null, playerRows: 0, hasStats: false, two_points_made: 0, two_points_attempted: 0, three_points_made: 0, three_points_attempted: 0, free_throws_made: 0, free_throws_attempted: 0, offensive_rebounds: 0, defensive_rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0 } }

export default function TeamStatsPage() {
  const { competition } = useCompetition()
  const [team, setTeam] = useState<Team | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setError('Configura Supabase para consultar las estadísticas.'); setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      const [competitionResult, teamResult] = await Promise.all([
        supabase!.from('competitions').select('id').eq('name', competition).maybeSingle(),
        supabase!.from('teams').select('id,name,short_name,logo_url').ilike('name', 'Valencia Basket').maybeSingle(),
      ])
      const comp = competitionResult.data
      const valencia = teamResult.data as Team | null
      if (competitionResult.error || teamResult.error || !comp || !valencia) {
        if (!cancelled) { setError(competitionResult.error?.message ?? teamResult.error?.message ?? 'No se encontró la competición o el equipo.'); setLoading(false) }
        return
      }
      const { data: gameRows, error: gamesError } = await supabase!.from('games')
        .select('id,round,game_date,home_team_id,away_team_id,home_score,away_score,status')
        .eq('competition_id', comp.id).eq('season', SEASON).eq('status', 'finished')
        .or(`home_team_id.eq.${valencia.id},away_team_id.eq.${valencia.id}`).order('game_date', { ascending: true })
      if (gamesError) { if (!cancelled) { setError(gamesError.message); setLoading(false) }; return }
      const games = (gameRows ?? []) as Game[]
      const ids = games.map((game) => game.id)
      let teamStats: TeamGameStats[] = []; let playerStats: PlayerGameStats[] = []
      if (ids.length) {
        const [teamStatsResult, playerStatsResult] = await Promise.all([
          supabase!.from('game_team_stats').select(`game_id,${statFields.join(',')}`).in('game_id', ids),
          supabase!.from('game_player_stats').select(`game_id,${['points', ...statFields, 'rebounds'].join(',')}`).in('game_id', ids),
        ])
        if (teamStatsResult.error || playerStatsResult.error) { if (!cancelled) { setError(teamStatsResult.error?.message ?? playerStatsResult.error?.message ?? 'No se pudieron cargar las estadísticas.'); setLoading(false) }; return }
        teamStats = (teamStatsResult.data ?? []) as TeamGameStats[]
        playerStats = (playerStatsResult.data ?? []) as PlayerGameStats[]
      }
      const teamStatsByGame = new Map(teamStats.map((row) => [row.game_id, row]))
      const playersByGame = new Map<string, PlayerGameStats[]>()
      for (const row of playerStats) playersByGame.set(row.game_id, [...(playersByGame.get(row.game_id) ?? []), row])
      const nextBoxes = games.flatMap((game) => {
        if (game.home_score === null || game.away_score === null) return []
        const box = blankBox(game)
        const home = game.home_team_id === valencia.id
        box.points = home ? game.home_score : game.away_score
        box.pointsAgainst = home ? game.away_score : game.home_score
        const official = teamStatsByGame.get(game.id)
        const players = playersByGame.get(game.id) ?? []
        box.playerRows = players.length
        box.hasStats = Boolean(official || players.length)
        for (const field of statFields) {
          const collectiveValue = official?.[field] ?? 0
          const playerValue = players.reduce((sum, row) => sum + (row[field] ?? 0), 0)
          box[field] = collectiveValue || playerValue
        }
        if (official) box.rebounds = box.offensive_rebounds + box.defensive_rebounds
        else if (players.length) box.rebounds = players.reduce((sum, row) => sum + (row.rebounds ?? row.offensive_rebounds + row.defensive_rebounds), 0)
        return [box]
      })
      if (!cancelled) { setTeam(valencia); setBoxes(nextBoxes); setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [competition])

  const summary = useMemo(() => {
    const played = boxes.length
    const productionGames = boxes.filter((box) => box.hasStats).length
    const wins = boxes.filter((box) => box.points > box.pointsAgainst).length
    const totals = Object.fromEntries(statFields.map((field) => [field, boxes.reduce((sum, box) => sum + box[field], 0)])) as Record<Metric, number>
    const points = boxes.reduce((sum, box) => sum + box.points, 0)
    const conceded = boxes.reduce((sum, box) => sum + box.pointsAgainst, 0)
    const shootingAvailable = totals.two_points_attempted + totals.three_points_attempted + totals.free_throws_attempted > 0
    return { played, productionGames, wins, losses: played - wins, totals, points, conceded, shootingAvailable, ppg: played ? points / played : 0, oppPpg: played ? conceded / played : 0 }
  }, [boxes])
  const recent = [...boxes].reverse().slice(0, 5).reverse()
  const maxRecent = Math.max(1, ...recent.map((box) => box.points), ...recent.map((box) => box.pointsAgainst))
  const shootingRows = [
    { label: 'Tiros de campo', made: summary.totals.two_points_made + summary.totals.three_points_made, attempted: summary.totals.two_points_attempted + summary.totals.three_points_attempted },
    { label: 'Tiros de 2', made: summary.totals.two_points_made, attempted: summary.totals.two_points_attempted },
    { label: 'Triples', made: summary.totals.three_points_made, attempted: summary.totals.three_points_attempted },
    { label: 'Tiros libres', made: summary.totals.free_throws_made, attempted: summary.totals.free_throws_attempted },
  ]
  const logo = team ? teamLogoFor(team.name, competition) ?? team.logo_url : null
  const missingGames = boxes.filter((box) => !box.playerRows && !box.offensive_rebounds && !box.defensive_rebounds && !box.assists && !box.steals && !box.blocks && !box.turnovers && !box.fouls).length
  const reboundGames = boxes.filter((box) => box.rebounds !== null).length
  const totalRebounds = boxes.reduce((sum, box) => sum + (box.rebounds ?? 0), 0)
  const stat = (value: number, available: boolean, sampleSize = summary.productionGames) => available ? fmt.format(value / Math.max(1, sampleSize)) : '—'

  return <section className="team-stats-page">
    <header className="team-stats-hero">
      <div className="team-stats-hero__copy"><span className="team-stats-eyebrow">CENTRO DE RENDIMIENTO · {SEASON.replace('-', '/')}</span><h1>Estadísticas del equipo</h1><p>Una visión clara de los resultados y el rendimiento de Valencia Basket en {competition}.</p></div>
      <div className="team-stats-identity">{team && <span className="team-stats-identity__logo">{logo ? <img className={teamLogoNeedsDarkInk(team.name, competition) ? 'team-logo--dark-ink' : undefined} src={logo} alt="" /> : 'VB'}</span>}<span><b>{team?.short_name || 'Valencia Basket'}</b><small>{competition} · Fase regular</small></span><i /></div>
      <div className="team-stats-hero__watermark" aria-hidden="true">VB</div>
    </header>

    {loading ? <div className="team-stats-state">Preparando las estadísticas del equipo…</div> : error ? <div className="team-stats-state team-stats-state--error" role="alert">{error}</div> : !summary.played ? <div className="team-stats-state">Todavía no hay partidos finalizados de Valencia Basket en {competition} para esta temporada.</div> : <>
      <section className="team-stats-overview" aria-label="Resumen de temporada">
        <article className="team-stats-record"><span className="team-stats-label">BALANCE</span><strong>{summary.wins}<i>–</i>{summary.losses}</strong><small>Victorias y derrotas · {summary.played} partidos</small><div className="team-stats-record__bar"><i style={{ width: `${summary.wins / summary.played * 100}%` }} /></div></article>
        <article><span className="team-stats-label">PUNTOS A FAVOR</span><strong>{average(summary.points, summary.played)}</strong><small>por partido</small><b className="team-stats-icon">↑</b></article>
        <article><span className="team-stats-label">PUNTOS EN CONTRA</span><strong>{average(summary.conceded, summary.played)}</strong><small>por partido</small><b className="team-stats-icon team-stats-icon--muted">↓</b></article>
        <article><span className="team-stats-label">DIFERENCIAL</span><strong className={summary.ppg >= summary.oppPpg ? 'is-positive' : 'is-negative'}>{summary.ppg - summary.oppPpg > 0 ? '+' : ''}{fmt.format(summary.ppg - summary.oppPpg)}</strong><small>puntos por partido</small><b className="team-stats-icon">±</b></article>
      </section>

      <div className="team-stats-main-grid">
        <section className="team-stats-card team-stats-shooting"><div className="team-stats-card__heading"><div><span className="team-stats-eyebrow">EFICACIA</span><h2>Porcentajes de tiro</h2></div><span className="team-stats-card__tag">TEMPORADA</span></div>
          {summary.shootingAvailable ? <div className="team-stats-shooting__rows">{shootingRows.map((row) => { const pct = percentage(row.made, row.attempted); return <div className="team-stats-shooting__row" key={row.label}><span>{row.label}</span><div className="team-stats-track"><i style={{ width: `${pct ?? 0}%` }} /></div><b>{pct === null ? '—' : `${pct}%`}</b><small>{row.made}/{row.attempted}</small></div> })}</div> : <div className="team-stats-note">Los datos de tiros todavía no están disponibles para esta competición.</div>}
        </section>
        <section className="team-stats-card team-stats-form"><div className="team-stats-card__heading"><div><span className="team-stats-eyebrow">ÚLTIMOS ENCUENTROS</span><h2>Rendimiento reciente</h2></div><span className="team-stats-form__legend"><i /> A favor <i /> En contra</span></div>
          {recent.length ? <div className="team-stats-chart">{recent.map((box) => { const home = box.game.home_team_id === team?.id; const won = box.points > box.pointsAgainst; return <div className="team-stats-chart__game" key={box.game.id} title={`${home ? 'Local' : 'Visitante'} · ${box.points}–${box.pointsAgainst}`}><div className="team-stats-chart__bars"><i className={won ? 'is-win' : 'is-loss'} style={{ height: `${Math.max(4, box.points / maxRecent * 100)}%` }} /><i className="is-against" style={{ height: `${Math.max(4, box.pointsAgainst / maxRecent * 100)}%` }} /></div><b>{box.points}–{box.pointsAgainst}</b><small>{box.game.round || dateLabel(box.game.game_date)}</small></div> })}</div> : null}
        </section>
      </div>

      <section className="team-stats-card team-stats-detail"><div className="team-stats-card__heading"><div><span className="team-stats-eyebrow">PRODUCCIÓN</span><h2>Promedios por partido</h2></div><span className="team-stats-card__tag">{summary.played} PJ</span></div>
        <div className="team-stats-metrics">
          <article><span>Rebotes totales</span><strong>{stat(totalRebounds, reboundGames > 0, reboundGames)}</strong><small>{stat(summary.totals.offensive_rebounds, summary.totals.offensive_rebounds > 0)} ofensivos <i>·</i> {stat(summary.totals.defensive_rebounds, summary.totals.defensive_rebounds > 0)} defensivos</small></article>
          <article><span>Asistencias</span><strong>{stat(summary.totals.assists, summary.totals.assists > 0)}</strong><small>por partido</small></article>
          <article><span>Robos</span><strong>{stat(summary.totals.steals, summary.totals.steals > 0)}</strong><small>por partido</small></article>
          <article><span>Tapones</span><strong>{stat(summary.totals.blocks, summary.totals.blocks > 0)}</strong><small>por partido</small></article>
          <article><span>Pérdidas</span><strong>{stat(summary.totals.turnovers, summary.totals.turnovers > 0)}</strong><small>por partido</small></article>
          <article><span>Faltas</span><strong>{stat(summary.totals.fouls, summary.totals.fouls > 0)}</strong><small>por partido</small></article>
        </div>
      </section>
      {missingGames > 0 && <p className="team-stats-footnote">Los partidos sin estadísticas individuales o colectivas registradas no se cuentan en los promedios de producción. Los resultados y puntos sí se muestran para todos los partidos finalizados.</p>}
    </>}
  </section>
}
