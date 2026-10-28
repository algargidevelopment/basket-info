import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import SummaryStandings from '../components/summaryStandings/SummaryStandings'
import './HomePage.css'

const SEASON = '2026-27'
const localPhotos = import.meta.glob<string>('../../../assets/players/*.{avif,jpg,jpeg,png,webp}', { eager: true, import: 'default', query: '?url' })

type Team = { id: string; name: string; short_name: string | null; logo_url?: string | null; location?: string | null }
type Game = {
  id: string; round: string | null; game_date: string; home_team_id: string; away_team_id: string;
  venue: string | null; status: 'scheduled' | 'live' | 'finished'; home_score: number | null; away_score: number | null;
  home_q1_score: number | null; away_q1_score: number | null; home_q2_score: number | null; away_q2_score: number | null;
  home_q3_score: number | null; away_q3_score: number | null; home_q4_score: number | null; away_q4_score: number | null;
}
type Player = { id: string; name: string; photo_url: string | null; shirt_number: number | null; position: string | null }
type PlayerLine = { game_id: string; player_id: string; points: number; rebounds: number | null; offensive_rebounds: number; defensive_rebounds: number; assists: number }
type StandingsRow = { team: Team; position: number; played: number; wins: number; losses: number; pointsFor: number; pointsAgainst: number }
type PublishedStanding = { team_id: string; position: number; played: number; wins: number; losses: number; points_for: number; points_against: number }

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('es-ES', options).format(new Date(value))
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function slug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function photoFor(player: Player) {
  const key = Object.keys(localPhotos).find((path) => path.split('/').pop()?.replace(/\.[^.]+$/, '') === slug(player.name))
  return (key ? localPhotos[key] : null) ?? player.photo_url
}

function recordFor(teamId: string, games: Game[]) {
  return games.filter((game) => game.status === 'finished' && game.home_score !== null && game.away_score !== null && (game.home_team_id === teamId || game.away_team_id === teamId))
    .map((game) => {
      const home = game.home_team_id === teamId
      return { game, scored: home ? game.home_score! : game.away_score!, conceded: home ? game.away_score! : game.home_score! }
    }).sort((a, b) => a.game.game_date.localeCompare(b.game.game_date))
}

function outcome(scored: number, conceded: number) { return scored > conceded ? 'W' : 'L' }

function TeamMark({ team, valencia = false }: { team: Team | undefined; valencia?: boolean }) {
  const logo = team?.logo_url
  return <span className={`home-mark${valencia ? ' home-mark--valencia' : ''}`}>{logo ? <img src={logo} alt="" /> : initials(team?.name ?? '??')}</span>
}

export default function HomePage() {
  const { competition } = useCompetition()
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [publishedStandings, setPublishedStandings] = useState<PublishedStanding[]>([])
  const [competitionTeamIds, setCompetitionTeamIds] = useState<string[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [playerLines, setPlayerLines] = useState<PlayerLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!supabase) { setError('Configura Supabase para cargar los datos de inicio.'); setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      const [competitionResult, teamResult, playerResult] = await Promise.all([
        supabase!.from('competitions').select('id').eq('name', competition).maybeSingle(),
        supabase!.from('teams').select('id,name,short_name,logo_url'),
        supabase!.from('players').select('id,name,photo_url,shirt_number,position'),
      ])
      if (competitionResult.error || !competitionResult.data || teamResult.error || playerResult.error) {
        if (!cancelled) { setError(competitionResult.error?.message ?? teamResult.error?.message ?? playerResult.error?.message ?? `No se encontró ${competition}.`); setLoading(false) }
        return
      }
      const { data: gameRows, error: gamesError } = await supabase!
        .from('games')
        .select('id,round,game_date,home_team_id,away_team_id,venue,status,home_score,away_score,home_q1_score,away_q1_score,home_q2_score,away_q2_score,home_q3_score,away_q3_score,home_q4_score,away_q4_score')
        .eq('competition_id', competitionResult.data.id).eq('season', SEASON).order('game_date', { ascending: true })
      const { data: standingRows, error: standingsError } = await supabase!
        .from('competition_standings').select('team_id,position,played,wins,losses,points_for,points_against')
        .eq('competition_id', competitionResult.data.id).eq('season', SEASON).order('position')
      const { data: competitionTeamRows } = await supabase!
        .from('competition_teams').select('team_id').eq('competition_id', competitionResult.data.id)
      if (gamesError) { if (!cancelled) { setError(gamesError.message); setLoading(false) }; return }
      if (standingsError) { if (!cancelled) { setError(standingsError.message); setLoading(false) }; return }
      const allGames = (gameRows ?? []) as Game[]
      const participantIds = new Set<string>((competitionTeamRows ?? []).map((row) => row.team_id as string))
      if (participantIds.size === 0) for (const game of allGames) { participantIds.add(game.home_team_id); participantIds.add(game.away_team_id) }
      const finishedIds = allGames.filter((game) => game.status === 'finished').map((game) => game.id)
      let lines: PlayerLine[] = []
      if (finishedIds.length) {
        const [playerStatsResult] = await Promise.all([
          supabase!.from('game_player_stats').select('game_id,player_id,points,rebounds,offensive_rebounds,defensive_rebounds,assists').in('game_id', finishedIds),
        ])
        if (playerStatsResult.error) { if (!cancelled) { setError(playerStatsResult.error.message); setLoading(false) }; return }
        lines = (playerStatsResult.data ?? []) as PlayerLine[]
      }
      if (!cancelled) {
        setTeams((teamResult.data ?? []) as Team[]); setGames(allGames); setCompetitionTeamIds([...participantIds]); setPublishedStandings((standingRows ?? []) as PublishedStanding[]); setPlayers((playerResult.data ?? []) as Player[]); setPlayerLines(lines); setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [competition])

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])
  const valencia = teams.find((team) => team.name.toLowerCase() === 'valencia basket')
  const played = useMemo(() => games.filter((game) => game.status === 'finished' && game.home_score !== null && game.away_score !== null), [games])
  const lastMatch = valencia ? played.filter((game) => game.home_team_id === valencia.id || game.away_team_id === valencia.id).at(-1) ?? null : null
  const nextMatch = valencia ? games.find((game) => game.status === 'live' && (game.home_team_id === valencia.id || game.away_team_id === valencia.id))
    ?? games.find((game) => game.status === 'scheduled' && new Date(game.game_date).getTime() >= Date.now() && (game.home_team_id === valencia.id || game.away_team_id === valencia.id)) ?? null : null

  const standings = useMemo(() => {
    const rows = new Map<string, StandingsRow>()
    teams.filter((team) => competitionTeamIds.includes(team.id)).forEach((team) => rows.set(team.id, { team, position: 0, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 }))
    played.forEach((game) => {
      const home = rows.get(game.home_team_id); const away = rows.get(game.away_team_id)
      if (!home || !away || game.home_score === null || game.away_score === null) return
      home.played++; away.played++; home.pointsFor += game.home_score; home.pointsAgainst += game.away_score
      away.pointsFor += game.away_score; away.pointsAgainst += game.home_score
      if (game.home_score > game.away_score) { home.wins++; away.losses++ } else { away.wins++; home.losses++ }
    })
    const computed = [...rows.values()].sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor || a.team.name.localeCompare(b.team.name))
    if (!publishedStandings.length) return computed.map((row, index) => ({ ...row, position: index + 1 }))
    const official = new Map(publishedStandings.map((row) => [row.team_id, row]))
    const ordered = computed.map((row) => {
      const published = official.get(row.team.id)
      return published ? { ...row, wins: published.wins, losses: published.losses, played: published.played, pointsFor: published.points_for, pointsAgainst: published.points_against } : row
    }).sort((a, b) => (official.get(a.team.id)?.position ?? Number.MAX_SAFE_INTEGER) - (official.get(b.team.id)?.position ?? Number.MAX_SAFE_INTEGER) || a.team.name.localeCompare(b.team.name))
    return ordered.map((row, index) => ({ ...row, position: official.get(row.team.id)?.position ?? index + 1 }))
  }, [teams, played, publishedStandings, competitionTeamIds])

  const recentValencia = useMemo(() => valencia ? recordFor(valencia.id, games).reverse() : [], [valencia, games])
  const teamRecord = useMemo(() => {
    const row = standings.find((item) => item.team.id === valencia?.id)
    const sequence = recentValencia
    let streak = 0
    if (sequence.length) { const first = outcome(sequence[0].scored, sequence[0].conceded); for (const item of sequence) { if (outcome(item.scored, item.conceded) !== first) break; streak++ } }
    const ppg = row?.played ? row.pointsFor / row.played : 0
    const oppg = row?.played ? row.pointsAgainst / row.played : 0
    return { row, streak: sequence.length ? `${firstSign(sequence)}${streak}${outcome(sequence[0].scored, sequence[0].conceded) === 'W' ? 'V' : 'D'}` : '—', ppg, oppg }
  }, [standings, recentValencia, valencia])
  const nearby = useMemo(() => {
    const index = standings.findIndex((row) => row.team.id === valencia?.id)
    if (index < 0) return standings.slice(0, 4)
    const start = Math.max(0, Math.min(index - 1, standings.length - 4))
    return standings.slice(start, start + 4)
  }, [standings, valencia])

  const leaders = useMemo(() => {
    const totals = new Map<string, { games: number; points: number; rebounds: number; assists: number }>()
    playerLines.forEach((line) => {
      const total = totals.get(line.player_id) ?? { games: 0, points: 0, rebounds: 0, assists: 0 }
      total.games++; total.points += line.points ?? 0; total.rebounds += line.rebounds ?? (line.offensive_rebounds ?? 0) + (line.defensive_rebounds ?? 0); total.assists += line.assists ?? 0
      totals.set(line.player_id, total)
    })
    const keys: Array<'points' | 'rebounds' | 'assists'> = ['points', 'rebounds', 'assists']
    const labels = ['Máximo anotador', 'Líder rebotes', 'Mejor asistente']
    return keys.map((key, index) => {
      const found = [...totals.entries()].filter(([id]) => players.some((player) => player.id === id)).sort((a, b) => b[1][key] / b[1].games - a[1][key] / a[1].games)[0]
      const player = found ? players.find((candidate) => candidate.id === found[0]) : undefined
      return { label: labels[index], player, value: found ? found[1][key] / found[1].games : null, stat: ['PTS / PARTIDO', 'REB / PARTIDO', 'AST / PARTIDO'][index], total: found?.[1] }
    })
  }, [playerLines, players])

  const isLastHome = Boolean(lastMatch && lastMatch.home_team_id === valencia?.id)
  const lastOpponentId = lastMatch ? (isLastHome ? lastMatch.away_team_id : lastMatch.home_team_id) : ''
  const nextIsHome = Boolean(nextMatch && nextMatch.home_team_id === valencia?.id)
  const homeTeam = nextMatch ? teamsById.get(nextMatch.home_team_id) : undefined
  const awayTeam = nextMatch ? teamsById.get(nextMatch.away_team_id) : undefined
  const timeLeft = nextMatch ? Math.max(0, new Date(nextMatch.game_date).getTime() - now) : 0
  const countdown = {
    days: Math.floor(timeLeft / 86_400_000),
    hours: Math.floor(timeLeft % 86_400_000 / 3_600_000),
    minutes: Math.floor(timeLeft % 3_600_000 / 60_000),
    seconds: Math.floor(timeLeft % 60_000 / 1_000),
  }

  function addToCalendar(game: Game) {
    const home = teamsById.get(game.home_team_id)?.name ?? 'Local'; const away = teamsById.get(game.away_team_id)?.name ?? 'Visitante'
    const start = new Date(game.game_date); const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
    const content = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Basket Info//Valencia Basket//ES\nBEGIN:VEVENT\nUID:${game.id}@basket-info\nDTSTAMP:${stamp(new Date())}\nDTSTART:${stamp(start)}\nDTEND:${stamp(end)}\nSUMMARY:${escape(`${home} - ${away}`)}\nLOCATION:${escape(game.venue ?? '')}\nEND:VEVENT\nEND:VCALENDAR`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }))
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'partido-valencia-basket.ics'; anchor.click(); URL.revokeObjectURL(url)
  }

  if (loading) return <div className="home-page"><div className="home-loading">Cargando la temporada…</div></div>

  return (
    <div className="home-page">
      {error && <p className="home-error" role="status">{error}</p>}
      <section className="home-hero" aria-label="Próximo partido">
        <div className="home-hero__top"><div className="home-hero__pills"><span className="home-pill home-pill--orange">{nextMatch ? 'Próximo encuentro' : 'Temporada 2026 / 27'}</span><span className="home-pill">{competition} · {nextMatch?.round ?? 'Calendario'}</span></div><span className="home-hero__broadcast">{competition === 'EuroLeague' ? 'EuroLeague' : 'Liga Endesa'} <b>·</b> Valencia Basket</span></div>
        {nextMatch ? <>
          <div className="home-hero__match">
            <div className="home-hero__team"><TeamMark team={homeTeam} valencia={homeTeam?.id === valencia?.id} /><span className="home-hero__venue-label">Local</span><h1>{homeTeam?.name ?? 'Equipo local'}</h1><p>{homeTeam?.id === valencia?.id ? `${teamRecord.row?.wins ?? 0}V - ${teamRecord.row?.losses ?? 0}D` : `${standings.find((row) => row.team.id === homeTeam?.id)?.wins ?? 0}V - ${standings.find((row) => row.team.id === homeTeam?.id)?.losses ?? 0}D`}</p>{homeTeam?.id === valencia?.id && recentValencia.length > 0 && <div className="home-form"><span>Racha:</span>{recentValencia.slice(0, 5).reverse().map((row, i) => <i className={outcome(row.scored, row.conceded) === 'W' ? 'is-win' : 'is-loss'} key={`${row.game.id}-${i}`}>{outcome(row.scored, row.conceded) === 'W' ? 'V' : 'D'}</i>)}</div>}</div>
            <div className="home-hero__schedule"><span>VS</span><time>{new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(nextMatch.game_date))}</time><small>{dateLabel(nextMatch.game_date, { weekday: 'short', day: '2-digit', month: 'short' })}</small></div>
            <div className="home-hero__team home-hero__team--right"><TeamMark team={awayTeam} valencia={awayTeam?.id === valencia?.id} /><span className="home-hero__venue-label">Visitante</span><h2>{awayTeam?.name ?? 'Equipo visitante'}</h2><p>{awayTeam?.id === valencia?.id ? `${teamRecord.row?.wins ?? 0}V - ${teamRecord.row?.losses ?? 0}D` : `${standings.find((row) => row.team.id === awayTeam?.id)?.wins ?? 0}V - ${standings.find((row) => row.team.id === awayTeam?.id)?.losses ?? 0}D`}</p>{awayTeam?.id === valencia?.id && recentValencia.length > 0 && <div className="home-form"><span>Racha:</span>{recentValencia.slice(0, 5).reverse().map((row, i) => <i className={outcome(row.scored, row.conceded) === 'W' ? 'is-win' : 'is-loss'} key={`${row.game.id}-${i}`}>{outcome(row.scored, row.conceded) === 'W' ? 'V' : 'D'}</i>)}</div>}</div>
            <div className="home-hero__countdown"><span>{nextMatch.status === 'live' ? 'Partido en juego' : 'Cuenta atrás del partido'}</span><div><span className="home-countdown-unit"><b>{String(countdown.days).padStart(2, '0')}</b><small>días</small></span><span className="home-countdown-unit"><b>{String(countdown.hours).padStart(2, '0')}</b><small>horas</small></span><span className="home-countdown-unit"><b>{String(countdown.minutes).padStart(2, '0')}</b><small>min</small></span><span className="home-countdown-unit"><b>{String(countdown.seconds).padStart(2, '0')}</b><small>seg</small></span></div><p>⌖ {nextMatch.venue ?? (nextIsHome ? homeTeam?.location : awayTeam?.location) ?? 'Estadio pendiente'}</p></div>
          </div>
          <footer className="home-hero__footer"><span>⌖ {nextMatch.venue ?? (nextIsHome ? homeTeam?.location : awayTeam?.location) ?? 'Estadio pendiente'}</span><div><button type="button" onClick={() => addToCalendar(nextMatch)}>＋ Añadir a calendario</button><Link to="/partidos">Ver partidos <b>→</b></Link></div></footer>
        </> : <div className="home-no-match"><strong>No hay próximos partidos cargados</strong><span>Cuando añadas el siguiente encuentro de {competition}, aparecerá aquí.</span><Link to="/partidos">Ver partidos</Link></div>}
      </section>

      <section className="home-overview">
        <article className="home-card home-last-match">
          <header><span className="home-section-tag">Último partido · {competition}</span><span>{lastMatch ? dateLabel(lastMatch.game_date, { day: '2-digit', month: 'short' }) : 'Sin partidos'}</span></header>
          {lastMatch ? <>
            <div className="home-last-match__score"><div><TeamMark team={teamsById.get(valencia?.id ?? '')} valencia /><b>{valencia?.name ?? 'Valencia Basket'}</b><small>{isLastHome ? 'Local · ' : 'Visitante · '}{lastMatch.venue ?? 'Estadio sin dato'}</small></div><strong>{isLastHome ? lastMatch.home_score : lastMatch.away_score}</strong><span>:</span><strong>{isLastHome ? lastMatch.away_score : lastMatch.home_score}</strong><div><TeamMark team={teamsById.get(lastOpponentId)} /><b>{teamsById.get(lastOpponentId)?.name ?? 'Rival'}</b><small>{isLastHome ? 'Visitante' : 'Local'}</small></div></div>
            <div className="home-quarter-table"><span>Cuarto</span>{[1, 2, 3, 4].map((q) => <span key={q}>Q{q}</span>)}<b>Final</b><span>{valencia?.short_name ?? 'VAL'}</span>{[1, 2, 3, 4].map((q) => <span key={q}>{lastMatch[`home_q${q}_score` as keyof Game] === null ? '—' : (isLastHome ? lastMatch[`home_q${q}_score` as keyof Game] : lastMatch[`away_q${q}_score` as keyof Game])}</span>)}<b>{isLastHome ? lastMatch.home_score : lastMatch.away_score}</b><span>{teamsById.get(lastOpponentId)?.short_name ?? initials(teamsById.get(lastOpponentId)?.name ?? 'Rival')}</span>{[1, 2, 3, 4].map((q) => <span key={q}>{lastMatch[`home_q${q}_score` as keyof Game] === null ? '—' : (isLastHome ? lastMatch[`away_q${q}_score` as keyof Game] : lastMatch[`home_q${q}_score` as keyof Game])}</span>)}<b>{isLastHome ? lastMatch.away_score : lastMatch.home_score}</b></div>
            <div className="home-last-match__player"><span>★ Máximo anotador</span><b>{(() => { const mvp = playerLines.filter((line) => line.game_id === lastMatch.id && line.points > 0).sort((a, b) => b.points - a.points)[0]; return players.find((player) => player.id === mvp?.player_id)?.name ?? 'Estadísticas individuales pendientes' })()}</b><span>Estadísticas del partido</span></div>
          </> : <div className="home-empty">Aún no hay resultados de {competition}.</div>}
          <Link className="home-card-link" to="/partidos">Ver estadísticas completas <span>↗</span></Link>
        </article>

        <article className="home-card home-summary">
          <header><span className="home-section-tag">Liga {competition} · 2026/27</span><span className="home-orange-label">Temporada</span></header>
          <div className="home-metrics"><div><small>Puesto</small><b className="home-orange-value">{teamRecord.row ? `${teamRecord.row.position}º` : '—'}</b><span>Clasificación</span></div><div><small>Balance</small><b>{teamRecord.row ? `${teamRecord.row.wins} - ${teamRecord.row.losses}` : '0 - 0'}</b><span>Victorias - derrotas</span></div><div><small>Racha</small><b className="home-orange-value">{teamRecord.streak}</b><span>Consecutiva</span></div><div><small>Diferencial</small><b>{teamRecord.row ? signed(teamRecord.row.pointsFor - teamRecord.row.pointsAgainst) : '+0'}</b><span>Puntos netos</span></div></div>
          <div className="home-team-averages"><div><span>Anotación media</span><b>{teamRecord.row?.played ? `${teamRecord.ppg.toFixed(1)} PPP` : '—'}</b><div><i style={{ width: `${Math.min(100, teamRecord.ppg / 120 * 100)}%` }} /></div></div><div><span>Puntos encajados</span><b>{teamRecord.row?.played ? `${teamRecord.oppg.toFixed(1)} PPP` : '—'}</b><div><i className="home-gray-fill" style={{ width: `${Math.min(100, teamRecord.oppg / 120 * 100)}%` }} /></div></div></div>
          <SummaryStandings teams={nearby.map((row) => ({ id: row.team.id, position: row.position, name: row.team.name, wins: row.wins, losses: row.losses, current: row.team.id === valencia?.id }))} />
          <Link className="home-card-link" to="/clasificacion">Ver clasificación completa <span>▤</span></Link>
        </article>
      </section>

      <section className="home-leaders-section"><header className="home-section-heading"><div><span>Rendimiento individual</span><h2>Líderes de la temporada</h2></div><Link to="/plantilla">Toda la plantilla <b>→</b></Link></header><div className="home-leaders">{leaders.map((leader) => <article className="home-leader-card" key={leader.label}><header><span>{leader.label}</span><small>{leader.stat}</small></header><div className="home-leader-card__player">{leader.player && photoFor(leader.player) ? <img src={photoFor(leader.player)!} alt="" /> : <span className="home-player-initials">{leader.player ? initials(leader.player.name) : 'VB'}</span>}<div><b>{leader.player?.name ?? 'Sin estadísticas'}</b><small>{leader.player?.position ?? 'Valencia Basket'}</small></div><strong>{leader.value === null ? '—' : leader.value.toFixed(1)}</strong></div><div className="home-leader-card__detail"><span>{leader.stat}</span><b>{leader.total ? `${leader.total.games} partidos` : 'Aún sin datos'}</b></div><Link to="/plantilla">Ficha del jugador <span>↗</span></Link></article>)}</div></section>

      <section className="home-season-banner"><div><span>Temporada 2026 / 27</span><h2>Calendario oficial</h2><p>Sigue todos los encuentros de Valencia Basket en {competition}, resultados y próximos retos.</p></div><Link to="/partidos">Ver calendario <b>→</b></Link><div className="home-season-banner__mark" aria-hidden="true">VB</div></section>
    </div>
  )
}

function firstSign(recent: Array<{ scored: number; conceded: number }>) { return outcome(recent[0].scored, recent[0].conceded) === 'W' ? '+' : '-' }
function signed(value: number) { return value > 0 ? `+${value}` : `${value}` }
