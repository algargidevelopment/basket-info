import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, hasSupabaseConfig } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import './ManagementPage.css'

const SEASON = '2026-27'

type Team = { id: string; name: string; short_name: string | null; location: string | null }
type Player = { id: string; name: string; shirt_number: number | null; active: boolean }
type Standing = { team_id: string; position: number; played: number; wins: number; losses: number; points_for: number; points_against: number }
type Game = {
  id: string
  competition_id: string
  season: string
  round: string | null
  game_date: string
  home_team_id: string
  away_team_id: string
  venue: string | null
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  home_q1_score: number | null
  away_q1_score: number | null
  home_q2_score: number | null
  away_q2_score: number | null
  home_q3_score: number | null
  away_q3_score: number | null
  home_q4_score: number | null
  away_q4_score: number | null
}
type PlayerStats = {
  game_id: string
  player_id: string
  minutes: number | string
  minutes_seconds?: number | null
  plus_minus: number
  points: number
  rebounds: number | null
  offensive_rebounds: number
  defensive_rebounds: number
  two_points_made: number
  two_points_attempted: number
  three_points_made: number
  three_points_attempted: number
  free_throws_made: number
  free_throws_attempted: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  fouls: number
}
type GameDraft = {
  round: string
  game_date: string
  home_team_id: string
  away_team_id: string
  venue: string
  status: Game['status']
  home_score: string
  away_score: string
  home_q1_score: string
  away_q1_score: string
  home_q2_score: string
  away_q2_score: string
  home_q3_score: string
  away_q3_score: string
  home_q4_score: string
  away_q4_score: string
}
type StatsDraft = Omit<PlayerStats, 'game_id' | 'player_id' | 'minutes'> & { minutes: string }

const blankGame: GameDraft = {
  round: '', game_date: '', home_team_id: '', away_team_id: '', venue: '',
  status: 'scheduled', home_score: '', away_score: '',
  home_q1_score: '', away_q1_score: '', home_q2_score: '', away_q2_score: '',
  home_q3_score: '', away_q3_score: '', home_q4_score: '', away_q4_score: '',
}
const blankStats: StatsDraft = {
  minutes: '00:00', minutes_seconds: 0, plus_minus: 0, points: 0, rebounds: null, offensive_rebounds: 0, defensive_rebounds: 0,
  two_points_made: 0, two_points_attempted: 0, three_points_made: 0,
  three_points_attempted: 0, free_throws_made: 0, free_throws_attempted: 0,
  assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0,
}

function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function numeric(value: string) {
  return value.trim() === '' ? null : Number(value)
}

function parseMinutes(value: string) {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function formatMinutes(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0))
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

function playerMinutesSeconds(row: PlayerStats) {
  return row.minutes_seconds ?? Math.round(Number(row.minutes) * 60)
}

function quarterTotal(draft: GameDraft, side: 'home' | 'away') {
  const keys = ([1, 2, 3, 4] as const).map((quarter) => `${side}_q${quarter}_score` as keyof GameDraft)
  const values = keys.map((key) => draft[key])
  return values.some((value) => value.trim() !== '')
    ? values.reduce((sum, value) => sum + (Number(value) || 0), 0)
    : numeric(draft[`${side}_score` as keyof GameDraft] as string)
}

function hasQuarterScore(draft: GameDraft, side: 'home' | 'away') {
  return ([1, 2, 3, 4] as const).some((quarter) => draft[`${side}_q${quarter}_score` as keyof GameDraft].trim() !== '')
}

function pointsFromStats(stats: StatsDraft) {
  const attempts = Number(stats.two_points_attempted) + Number(stats.three_points_attempted) + Number(stats.free_throws_attempted)
  if (attempts === 0 && Number(stats.points) > 0) return Number(stats.points)
  return Number(stats.two_points_made) * 2 + Number(stats.three_points_made) * 3 + Number(stats.free_throws_made)
}

function reboundsFromDraft(stats: StatsDraft) {
  const splitTotal = Number(stats.offensive_rebounds) + Number(stats.defensive_rebounds)
  return splitTotal || Number(stats.rebounds ?? 0)
}

function totalRebounds(stats: PlayerStats) {
  const splitTotal = Number(stats.offensive_rebounds || 0) + Number(stats.defensive_rebounds || 0)
  // Older imports contain total rebounds only; prefer the split whenever present.
  return splitTotal || stats.rebounds || 0
}

export default function ManagementPage() {
  const { competition } = useCompetition()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [competitionTeamIds, setCompetitionTeamIds] = useState<string[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [statsLoading, setStatsLoading] = useState(false)
  const [pane, setPane] = useState<'games' | 'stats' | 'standings'>('games')
  const [standings, setStandings] = useState<Standing[]>([])
  const [gameDraft, setGameDraft] = useState<GameDraft>(blankGame)
  const [editingGameId, setEditingGameId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [statsDraft, setStatsDraft] = useState<StatsDraft>(blankStats)
  const [editingStatsPlayerId, setEditingStatsPlayerId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (cancelled) return
      if (sessionError) setAuthError(sessionError.message)
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthorized(false)
      setAuthError('')
    })
    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    let cancelled = false
    supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data, error: checkError }) => {
      if (cancelled) return
      if (checkError) {
        setAuthError(`No se pudo verificar el permiso de administración: ${checkError.message}`)
        setAuthorized(false)
      } else if (!data) {
        setAuthError('Tu cuenta ha iniciado sesión, pero no está autorizada para gestionar la base de datos.')
        setAuthorized(false)
      } else {
        setAuthError('')
        setAuthorized(true)
      }
    })
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!authorized || !supabase) return
    let cancelled = false
    async function loadManagementData() {
      setBusy(true)
      setError('')
      const [competitionResult, teamsResult, playersResult] = await Promise.all([
        supabase!.from('competitions').select('id').eq('name', competition).maybeSingle(),
        supabase!.from('teams').select('id,name,short_name,location').order('name'),
        supabase!.from('players').select('id,name,shirt_number,active').eq('active', true).order('shirt_number'),
      ])
      if (competitionResult.error || !competitionResult.data) {
        if (!cancelled) { setError(competitionResult.error?.message ?? `No existe la competición ${competition}.`); setBusy(false) }
        return
      }
      if (teamsResult.error || playersResult.error) {
        if (!cancelled) { setError(teamsResult.error?.message ?? playersResult.error?.message ?? 'No se pudieron cargar equipos y jugadores.'); setBusy(false) }
        return
      }
      const { data: competitionTeamRows } = await supabase!
        .from('competition_teams').select('team_id').eq('competition_id', competitionResult.data.id)
      const { data: gameRows, error: gamesError } = await supabase!
        .from('games')
        .select('id,competition_id,season,round,game_date,home_team_id,away_team_id,venue,status,home_score,away_score,home_q1_score,away_q1_score,home_q2_score,away_q2_score,home_q3_score,away_q3_score,home_q4_score,away_q4_score')
        .eq('competition_id', competitionResult.data.id)
        .eq('season', SEASON)
        .order('game_date', { ascending: false })
      const { data: standingRows, error: standingsError } = await supabase!
        .from('competition_standings').select('team_id,position,played,wins,losses,points_for,points_against')
        .eq('competition_id', competitionResult.data.id).eq('season', SEASON).order('position')
      const participantIds = new Set<string>((competitionTeamRows ?? []).map((row) => row.team_id as string))
      if (participantIds.size === 0) {
        // Older databases have no competition_teams relation; use clubs in this competition's schedule.
        for (const game of gameRows ?? []) { participantIds.add(game.home_team_id); participantIds.add(game.away_team_id) }
      }
      if (!cancelled) {
        setTeams((teamsResult.data ?? []) as Team[])
        setCompetitionTeamIds([...participantIds])
        setPlayers((playersResult.data ?? []) as Player[])
        setGames((gameRows ?? []) as Game[])
        setStandings((standingRows ?? []) as Standing[])
        if (gamesError) setError(gamesError.message)
        if (standingsError) setError(standingsError.message)
        setBusy(false)
      }
    }
    void loadManagementData()
    return () => { cancelled = true }
  }, [authorized, competition])

  useEffect(() => {
    if (!authorized || !supabase || !selectedGameId) return
    let cancelled = false
    supabase.from('game_player_stats').select('*').eq('game_id', selectedGameId).order('player_id').then(({ data, error: statsError }) => {
      if (cancelled) return
      if (statsError) setError(`No se pudieron cargar las estadísticas: ${statsError.message}`)
      setPlayerStats((data ?? []) as PlayerStats[])
      setStatsLoading(false)
    })
    return () => { cancelled = true }
  }, [authorized, selectedGameId])

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams])
  const selectedGame = games.find((game) => game.id === selectedGameId) ?? null
  const orderedGames = useMemo(() => [...games].sort((a, b) => a.game_date.localeCompare(b.game_date)), [games])
  const competitionTeams = useMemo(() => teams.filter((team) => competitionTeamIds.includes(team.id)), [teams, competitionTeamIds])
  const standingByTeam = useMemo(() => new Map(standings.map((row) => [row.team_id, row])), [standings])
  const rankedStandings = useMemo(() => competitionTeams.map((team, index) => standingByTeam.get(team.id) ?? {
    team_id: team.id, position: index + 1, played: 0, wins: 0, losses: 0, points_for: 0, points_against: 0,
  }).sort((a, b) => {
    const aPct = a.played > 0 ? a.wins / a.played : 0
    const bPct = b.played > 0 ? b.wins / b.played : 0
    return bPct - aPct || b.wins - a.wins || a.losses - b.losses ||
      (b.points_for - b.points_against) - (a.points_for - a.points_against) ||
      b.points_for - a.points_for || (teams.find((team) => team.id === a.team_id)?.name ?? '').localeCompare(teams.find((team) => team.id === b.team_id)?.name ?? '')
  }).map((row, index) => ({ ...row, position: index + 1 })), [competitionTeams, standingByTeam, teams])
  const availablePlayers = useMemo(
    () => players.filter((player) => player.id === editingStatsPlayerId || !playerStats.some((row) => row.player_id === player.id)),
    [players, playerStats, editingStatsPlayerId],
  )

  function updateStanding(teamId: string, key: keyof Omit<Standing, 'team_id'>, value: string) {
    const fallback: Standing = { team_id: teamId, position: competitionTeams.findIndex((team) => team.id === teamId) + 1, played: 0, wins: 0, losses: 0, points_for: 0, points_against: 0 }
    const current = standingByTeam.get(teamId) ?? fallback
    setStandings((rows) => [...rows.filter((row) => row.team_id !== teamId), { ...current, [key]: Number(value) || 0 }].sort((a, b) => a.position - b.position))
  }

  async function saveStandings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setError(''); setNotice('')
    const { data: comp, error: compError } = await supabase.from('competitions').select('id').eq('name', competition).maybeSingle()
    if (compError || !comp) { setError(compError?.message ?? `No existe ${competition}.`); setBusy(false); return }
    const rows = rankedStandings.map((row) => ({ competition_id: comp.id, season: SEASON, ...row }))
    const { error: saveError } = await supabase.from('competition_standings').upsert(rows, { onConflict: 'competition_id,season,team_id' })
    if (saveError) setError(saveError.message)
    else setNotice('Clasificación guardada.')
    setBusy(false)
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setAuthLoading(true)
    setAuthError('')
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setAuthLoading(false)
    if (signInError) setAuthError(signInError.message)
    else setUser(data.user)
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setAuthorized(false)
  }

  function newGame() {
    setEditingGameId('')
    const defaultHomeTeam = teams.find((team) => team.name === 'Valencia Basket')
    setGameDraft({ ...blankGame, home_team_id: defaultHomeTeam?.id ?? '', venue: defaultHomeTeam?.location ?? '', away_team_id: '', game_date: `${SEASON.slice(0, 4)}-09-01T20:00` })
    setNotice('')
    setError('')
  }

  function editGame(game: Game) {
    setEditingGameId(game.id)
    setGameDraft({
      round: game.round ?? '', game_date: localDateTime(game.game_date), home_team_id: game.home_team_id,
      away_team_id: game.away_team_id, venue: game.venue ?? '', status: game.status,
      home_score: game.home_score === null ? '' : String(game.home_score),
      away_score: game.away_score === null ? '' : String(game.away_score),
      home_q1_score: game.home_q1_score === null ? '' : String(game.home_q1_score), away_q1_score: game.away_q1_score === null ? '' : String(game.away_q1_score),
      home_q2_score: game.home_q2_score === null ? '' : String(game.home_q2_score), away_q2_score: game.away_q2_score === null ? '' : String(game.away_q2_score),
      home_q3_score: game.home_q3_score === null ? '' : String(game.home_q3_score), away_q3_score: game.away_q3_score === null ? '' : String(game.away_q3_score),
      home_q4_score: game.home_q4_score === null ? '' : String(game.home_q4_score), away_q4_score: game.away_q4_score === null ? '' : String(game.away_q4_score),
    })
    setPane('games')
    setNotice('')
    setError('')
  }

  function updateQuarterScore(quarter: 1 | 2 | 3 | 4, side: 'home' | 'away', value: string) {
    const key = `${side}_q${quarter}_score` as keyof GameDraft
    const next = { ...gameDraft, [key]: value }
    const total = hasQuarterScore(next, side) ? String(quarterTotal(next, side) ?? 0) : ''
    if (side === 'home') next.home_score = total
    else next.away_score = total
    setGameDraft(next)
  }

  async function saveGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setNotice('')
    const record = {
      competition_id: games[0]?.competition_id,
      season: SEASON,
      round: gameDraft.round.trim() || null,
      game_date: new Date(gameDraft.game_date).toISOString(),
      home_team_id: gameDraft.home_team_id,
      away_team_id: gameDraft.away_team_id,
      venue: gameDraft.venue.trim() || null,
      status: gameDraft.status,
      home_score: quarterTotal(gameDraft, 'home'),
      away_score: quarterTotal(gameDraft, 'away'),
      home_q1_score: numeric(gameDraft.home_q1_score), away_q1_score: numeric(gameDraft.away_q1_score),
      home_q2_score: numeric(gameDraft.home_q2_score), away_q2_score: numeric(gameDraft.away_q2_score),
      home_q3_score: numeric(gameDraft.home_q3_score), away_q3_score: numeric(gameDraft.away_q3_score),
      home_q4_score: numeric(gameDraft.home_q4_score), away_q4_score: numeric(gameDraft.away_q4_score),
    }
    let result
    if (editingGameId) result = await supabase.from('games').update(record).eq('id', editingGameId)
    else {
      const competitionResult = await supabase.from('competitions').select('id').eq('name', competition).single()
      if (competitionResult.error) {
        setError(competitionResult.error.message)
        setBusy(false)
        return
      }
      result = await supabase.from('games').insert({ ...record, competition_id: competitionResult.data.id })
    }
    if (result.error) setError(result.error.message)
    else {
      setNotice(editingGameId ? 'Partido actualizado.' : 'Partido añadido.')
      setEditingGameId('')
      setGameDraft(blankGame)
      await reloadGames()
    }
    setBusy(false)
  }

  async function reloadGames() {
    if (!supabase) return
    const { data: comp } = await supabase.from('competitions').select('id').eq('name', competition).single()
    if (!comp) return
    const { data } = await supabase.from('games').select('*').eq('competition_id', comp.id).eq('season', SEASON).order('game_date', { ascending: false })
    setGames((data ?? []) as Game[])
  }

  async function deleteGame(game: Game) {
    if (!supabase || !window.confirm(`¿Eliminar el partido ${teamById.get(game.home_team_id)} - ${teamById.get(game.away_team_id)}? También se borrarán sus estadísticas.`)) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('games').delete().eq('id', game.id)
    if (deleteError) setError(deleteError.message)
    else {
      if (selectedGameId === game.id) { setSelectedGameId(''); setPlayerStats([]) }
      setNotice('Partido y sus estadísticas eliminados.')
      await reloadGames()
    }
    setBusy(false)
  }

  function startStatsEdit(row: PlayerStats) {
    setPlayerId(row.player_id)
    setEditingStatsPlayerId(row.player_id)
    setStatsDraft({ ...row, minutes: formatMinutes(playerMinutesSeconds(row)), minutes_seconds: playerMinutesSeconds(row), plus_minus: row.plus_minus ?? 0 })
    setError('')
    setNotice('')
  }

  function resetStatsForm() {
    setPlayerId('')
    setEditingStatsPlayerId('')
    setStatsDraft(blankStats)
  }

  async function saveStats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || !selectedGameId || !playerId) return
    if (!editingStatsPlayerId && playerStats.some((row) => row.player_id === playerId)) {
      setError('Este jugador ya tiene estadísticas en este partido. Selecciona otra persona o edita su fila existente.')
      return
    }
    const minutesSeconds = parseMinutes(statsDraft.minutes)
    if (minutesSeconds === null) {
      setError('Introduce los minutos en formato mm:ss, por ejemplo 12:43.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    const record = {
      minutes: Number((minutesSeconds / 60).toFixed(1)),
      minutes_seconds: minutesSeconds,
      plus_minus: Number(statsDraft.plus_minus) || 0,
      points: pointsFromStats(statsDraft),
      rebounds: reboundsFromDraft(statsDraft),
      offensive_rebounds: Number(statsDraft.offensive_rebounds) || 0,
      defensive_rebounds: Number(statsDraft.defensive_rebounds) || 0,
      two_points_made: Number(statsDraft.two_points_made) || 0,
      two_points_attempted: Number(statsDraft.two_points_attempted) || 0,
      three_points_made: Number(statsDraft.three_points_made) || 0,
      three_points_attempted: Number(statsDraft.three_points_attempted) || 0,
      free_throws_made: Number(statsDraft.free_throws_made) || 0,
      free_throws_attempted: Number(statsDraft.free_throws_attempted) || 0,
      assists: Number(statsDraft.assists) || 0,
      steals: Number(statsDraft.steals) || 0,
      blocks: Number(statsDraft.blocks) || 0,
      turnovers: Number(statsDraft.turnovers) || 0,
      fouls: Number(statsDraft.fouls) || 0,
    }
    const result = editingStatsPlayerId
      ? await supabase.from('game_player_stats').update(record).eq('game_id', selectedGameId).eq('player_id', editingStatsPlayerId)
      : await supabase.from('game_player_stats').insert({ ...record, game_id: selectedGameId, player_id: playerId })
    const saveError = result.error
    if (saveError) setError(saveError.message)
    else {
      setNotice(editingStatsPlayerId ? 'Estadísticas actualizadas.' : 'Estadísticas añadidas.')
      resetStatsForm()
      const { data } = await supabase.from('game_player_stats').select('*').eq('game_id', selectedGameId).order('player_id')
      setPlayerStats((data ?? []) as PlayerStats[])
      setStatsLoading(false)
    }
    setBusy(false)
  }

  async function deleteStats(row: PlayerStats) {
    if (!supabase || !window.confirm(`¿Eliminar las estadísticas de ${players.find((player) => player.id === row.player_id)?.name ?? 'este jugador'} en este partido?`)) return
    const { error: deleteError } = await supabase.from('game_player_stats').delete().eq('game_id', row.game_id).eq('player_id', row.player_id)
    if (deleteError) setError(deleteError.message)
    else {
      setPlayerStats((current) => current.filter((item) => item.player_id !== row.player_id))
      setNotice('Estadísticas eliminadas.')
    }
  }

  if (!hasSupabaseConfig) return <ManagementShell><div className="mg-notice mg-notice--error">Configura las variables de Supabase para utilizar la gestión.</div></ManagementShell>

  if (authLoading) return <ManagementShell><div className="mg-loading">Comprobando sesión…</div></ManagementShell>

  if (!user || !authorized) return (
    <ManagementShell>
      <div className="mg-login-card">
        <div className="mg-login-mark">TB<span>·</span></div>
        <span className="mg-eyebrow">ÁREA PRIVADA</span>
        <h1>Gestión de datos</h1>
        <p>Inicia sesión con la cuenta administradora de Supabase para editar partidos y estadísticas.</p>
        {authError && <div className="mg-notice mg-notice--error" role="alert">{authError}</div>}
        {!user && <form className="mg-login-form" onSubmit={signIn}>
          <label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="mg-button mg-button--primary" type="submit" disabled={authLoading}>Entrar al panel</button>
        </form>}
        <span className="mg-login-footnote">La ruta /gestion no concede permisos por sí sola.</span>
      </div>
    </ManagementShell>
  )

  return (
    <ManagementShell>
      <section className="mg-panel">
        <header className="mg-header">
          <div><span className="mg-eyebrow">TARONJA BASKET · ADMIN</span><h1>Gestión de datos</h1><p>Partidos y estadísticas individuales · Temporada {SEASON}</p></div>
          <div className="mg-header-actions"><span className="mg-user">{user.email}</span><button className="mg-button mg-button--ghost" type="button" onClick={() => void signOut()}>Cerrar sesión</button></div>
        </header>

        <div className="mg-toolbar">
          <div className="mg-tabs" role="tablist" aria-label="Secciones de gestión">
            <button type="button" role="tab" aria-selected={pane === 'games'} className={pane === 'games' ? 'is-active' : ''} onClick={() => setPane('games')}>Partidos <span>{games.length}</span></button>
            <button type="button" role="tab" aria-selected={pane === 'stats'} className={pane === 'stats' ? 'is-active' : ''} onClick={() => setPane('stats')}>Estadísticas de jugadores</button>
            <button type="button" role="tab" aria-selected={pane === 'standings'} className={pane === 'standings' ? 'is-active' : ''} onClick={() => setPane('standings')}>Clasificación</button>
          </div>
          <span className="mg-season-pill">{competition} <i /> {SEASON}</span>
        </div>

        {notice && <div className="mg-notice mg-notice--success" role="status">{notice}</div>}
        {error && <div className="mg-notice mg-notice--error" role="alert">{error}</div>}

        {pane === 'standings' ? (
          <form className="mg-card" onSubmit={(event) => void saveStandings(event)}>
            <div className="mg-card-heading"><div><span className="mg-eyebrow">CLASIFICACIÓN OFICIAL</span><h2>Clasificación {competition}</h2></div><button className="mg-button mg-button--primary" type="submit" disabled={busy || !competitionTeams.length}>{busy ? 'Guardando…' : 'Guardar clasificación'}</button></div>
            <p className="mg-hint">Actualiza partidos, victorias y derrotas; la clasificación se ordena automáticamente por porcentaje de victorias, diferencial y puntos.</p>
            <div className="mg-standings-editor"><div className="mg-standings-head"><span>Equipo</span><span>Puesto</span><span>PJ</span><span>V</span><span>D</span><span>PF</span><span>PC</span></div>
              {rankedStandings.map((row) => { const team = teams.find((candidate) => candidate.id === row.team_id)!; return <div className="mg-standing-row" key={team.id}><b>{team.name}</b><strong className="mg-standing-position">{row.position}</strong>{(['played', 'wins', 'losses', 'points_for', 'points_against'] as const).map((key) => <label key={key}><span>{key === 'played' ? 'PJ' : key === 'wins' ? 'V' : key === 'losses' ? 'D' : key === 'points_for' ? 'PF' : 'PC'}</span><input aria-label={`${team.name}: ${key}`} type="number" min="0" value={row[key]} onChange={(event) => updateStanding(team.id, key, event.target.value)} /></label>)}</div> })}
            </div>
          </form>
        ) : pane === 'games' ? (
          <div className="mg-layout">
            <section className="mg-card mg-games-card">
              <div className="mg-card-heading"><div><span className="mg-eyebrow">CALENDARIO Y RESULTADOS</span><h2>Partidos {competition}</h2></div><button className="mg-button mg-button--primary" type="button" onClick={newGame}>＋ Añadir partido</button></div>
              {busy && <div className="mg-inline-loading">Actualizando…</div>}
              <div className="mg-games-list">
                {orderedGames.length ? orderedGames.map((game) => (
                  <article className={`mg-game-row ${selectedGameId === game.id ? 'mg-game-row--selected' : ''}`} key={game.id}>
                    <button className="mg-game-select" type="button" onClick={() => { setSelectedGameId(game.id); setPlayerStats([]); setStatsLoading(true); setPane('stats'); resetStatsForm() }} aria-label={`Gestionar estadísticas de ${teamById.get(game.home_team_id)} contra ${teamById.get(game.away_team_id)}`}>
                      <span className="mg-game-date">{new Date(game.game_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}<small>{game.round || 'Sin jornada'}</small></span>
                      <span className="mg-game-match"><b>{teamById.get(game.home_team_id) ?? 'Equipo local'}</b><b>{teamById.get(game.away_team_id) ?? 'Equipo visitante'}</b></span>
                      <span className="mg-game-score"><b>{game.home_score ?? '—'}</b><b>{game.away_score ?? '—'}</b></span>
                      <span className={`mg-status mg-status--${game.status}`}>{game.status === 'finished' ? 'Final' : game.status === 'live' ? 'En juego' : 'Pendiente'}</span>
                    </button>
                    <div className="mg-game-actions"><button type="button" onClick={() => editGame(game)}>Editar</button><button type="button" className="mg-danger-link" onClick={() => void deleteGame(game)}>Borrar</button></div>
                  </article>
                )) : <div className="mg-empty">No hay partidos cargados para {competition} en {SEASON}.</div>}
              </div>
            </section>

            <section className="mg-card mg-game-form-card">
              <div className="mg-card-heading"><div><span className="mg-eyebrow">{editingGameId ? 'EDITAR REGISTRO' : 'NUEVO REGISTRO'}</span><h2>{editingGameId ? 'Editar partido' : 'Añadir partido'}</h2></div>{editingGameId && <button className="mg-close-form" type="button" onClick={newGame} aria-label="Cancelar edición">×</button>}</div>
              <form className="mg-form" onSubmit={(event) => void saveGame(event)}>
                <label>Jornada / ronda<input value={gameDraft.round} onChange={(event) => setGameDraft({ ...gameDraft, round: event.target.value })} placeholder="J5 / R8" /></label>
                <label>Fecha y hora<input type="datetime-local" required value={gameDraft.game_date} onChange={(event) => setGameDraft({ ...gameDraft, game_date: event.target.value })} /></label>
                <label>Equipo local<select required value={gameDraft.home_team_id} onChange={(event) => { const homeTeam = competitionTeams.find((team) => team.id === event.target.value); setGameDraft({ ...gameDraft, home_team_id: event.target.value, venue: homeTeam?.location ?? '' }) }}><option value="">Seleccionar equipo</option>{competitionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <label>Equipo visitante<select required value={gameDraft.away_team_id} onChange={(event) => setGameDraft({ ...gameDraft, away_team_id: event.target.value })}><option value="">Seleccionar equipo</option>{competitionTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <label className="mg-form-wide">Estadio / pabellón<input value={gameDraft.venue} onChange={(event) => setGameDraft({ ...gameDraft, venue: event.target.value })} placeholder="Nombre del pabellón" /></label>
                <label>Estado<select value={gameDraft.status} onChange={(event) => setGameDraft({ ...gameDraft, status: event.target.value as Game['status'] })}><option value="scheduled">Pendiente</option><option value="live">En juego</option><option value="finished">Finalizado</option></select></label>
                <div className="mg-score-inputs"><label>Marcador local<input type="number" min="0" value={gameDraft.home_score} readOnly={hasQuarterScore(gameDraft, 'home')} onChange={(event) => setGameDraft({ ...gameDraft, home_score: event.target.value })} placeholder="—" /></label><span>:</span><label>Marcador visitante<input type="number" min="0" value={gameDraft.away_score} readOnly={hasQuarterScore(gameDraft, 'away')} onChange={(event) => setGameDraft({ ...gameDraft, away_score: event.target.value })} placeholder="—" /></label></div>
                <fieldset className="mg-quarter-inputs mg-form-wide"><legend>Marcador por cuartos</legend>{([1, 2, 3, 4] as const).map((quarter) => { const homeKey = `home_q${quarter}_score` as keyof GameDraft; const awayKey = `away_q${quarter}_score` as keyof GameDraft; return <div key={quarter}><span>Q{quarter}</span><input aria-label={`Puntos local Q${quarter}`} type="number" min="0" value={gameDraft[homeKey]} onChange={(event) => updateQuarterScore(quarter, 'home', event.target.value)} placeholder="Local" /><input aria-label={`Puntos visitante Q${quarter}`} type="number" min="0" value={gameDraft[awayKey]} onChange={(event) => updateQuarterScore(quarter, 'away', event.target.value)} placeholder="Visitante" /></div>})}</fieldset>
                <p className="mg-hint mg-form-wide">Al introducir los puntos de los cuartos, el marcador final se calcula automáticamente con la suma de Q1–Q4.</p>
                <button className="mg-button mg-button--primary mg-form-wide" type="submit" disabled={busy || !gameDraft.home_team_id || !gameDraft.away_team_id || gameDraft.home_team_id === gameDraft.away_team_id}>{busy ? 'Guardando…' : editingGameId ? 'Guardar cambios' : 'Crear partido'}</button>
              </form>
              <p className="mg-hint">Al borrar un partido, Supabase elimina también las estadísticas asociadas.</p>
            </section>
          </div>
        ) : (
          <section className="mg-card mg-stats-card">
            <div className="mg-card-heading"><div><span className="mg-eyebrow">BOX SCORE DE VALENCIA</span><h2>Estadísticas individuales</h2></div><label className="mg-game-picker">Partido<select value={selectedGameId} onChange={(event) => { setSelectedGameId(event.target.value); setPlayerStats([]); setStatsLoading(Boolean(event.target.value)); resetStatsForm(); setError(''); setNotice('') }}><option value="">Selecciona un partido</option>{orderedGames.map((game) => <option key={game.id} value={game.id}>{new Date(game.game_date).toLocaleDateString('es-ES')} · {teamById.get(game.home_team_id)} {game.home_score ?? '—'}–{game.away_score ?? '—'} {teamById.get(game.away_team_id)}</option>)}</select></label></div>
            {!selectedGame ? <div className="mg-empty">Selecciona un partido para añadir o editar las estadísticas de sus jugadores.</div> : <div className="mg-stats-layout">
              <form className="mg-stats-form" onSubmit={(event) => void saveStats(event)}>
                <div className="mg-stats-form-heading"><div><span className="mg-eyebrow">{editingStatsPlayerId ? 'EDITAR BOX SCORE' : 'NUEVO BOX SCORE'}</span><h3>{editingStatsPlayerId ? 'Actualizar jugador' : 'Añadir jugador'}</h3></div>{editingStatsPlayerId && <button className="mg-close-form" type="button" onClick={resetStatsForm} aria-label="Cancelar edición">×</button>}</div>
                <label>Jugador<select required disabled={Boolean(editingStatsPlayerId) || statsLoading} value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">{statsLoading ? 'Cargando jugadores del partido…' : 'Selecciona jugador'}</option>{availablePlayers.map((player) => <option key={player.id} value={player.id}>#{player.shirt_number ?? '—'} · {player.name}</option>)}</select></label>
                {!editingStatsPlayerId && !statsLoading && availablePlayers.length === 0 && <p className="mg-hint">Todos los jugadores activos ya tienen estadísticas en este partido. Edita una fila existente o elimina una antes de volver a añadirla.</p>}
                <div className="mg-stat-fields">
                  <label>Minutos<input className="mg-minutes-input" type="text" inputMode="numeric" placeholder="12:43" pattern="\d{1,3}:[0-5]\d" value={statsDraft.minutes} onChange={(event) => setStatsDraft({ ...statsDraft, minutes: event.target.value })} aria-describedby="mg-minutes-hint" /><small id="mg-minutes-hint">Formato mm:ss</small></label>
                  <div className="mg-derived-stat"><span>Puntos</span><strong>{pointsFromStats(statsDraft)}</strong><small>2 × T2 + 3 × T3 + TL; conserva dato previo si no hay tiros</small></div>
                  <StatInput label="+/- en pista" value={statsDraft.plus_minus} min="-999" onChange={(value) => setStatsDraft({ ...statsDraft, plus_minus: value })} />
                  <StatInput label="Rebotes ofensivos" value={statsDraft.offensive_rebounds} onChange={(value) => setStatsDraft({ ...statsDraft, offensive_rebounds: value })} />
                  <StatInput label="Rebotes defensivos" value={statsDraft.defensive_rebounds} onChange={(value) => setStatsDraft({ ...statsDraft, defensive_rebounds: value })} />
                  <div className="mg-derived-stat"><span>Rebotes totales</span><strong>{reboundsFromDraft(statsDraft)}</strong><small>Ofensivos + defensivos</small></div>
                  <StatInput label="Asistencias" value={statsDraft.assists} onChange={(value) => setStatsDraft({ ...statsDraft, assists: value })} />
                  <StatInput label="T2 anotados" value={statsDraft.two_points_made} onChange={(value) => setStatsDraft({ ...statsDraft, two_points_made: value })} />
                  <StatInput label="T2 intentados" value={statsDraft.two_points_attempted} onChange={(value) => setStatsDraft({ ...statsDraft, two_points_attempted: value })} />
                  <StatInput label="T3 anotados" value={statsDraft.three_points_made} onChange={(value) => setStatsDraft({ ...statsDraft, three_points_made: value })} />
                  <StatInput label="T3 intentados" value={statsDraft.three_points_attempted} onChange={(value) => setStatsDraft({ ...statsDraft, three_points_attempted: value })} />
                  <StatInput label="TL anotados" value={statsDraft.free_throws_made} onChange={(value) => setStatsDraft({ ...statsDraft, free_throws_made: value })} />
                  <StatInput label="TL intentados" value={statsDraft.free_throws_attempted} onChange={(value) => setStatsDraft({ ...statsDraft, free_throws_attempted: value })} />
                  <StatInput label="Robos" value={statsDraft.steals} onChange={(value) => setStatsDraft({ ...statsDraft, steals: value })} />
                  <StatInput label="Tapones" value={statsDraft.blocks} onChange={(value) => setStatsDraft({ ...statsDraft, blocks: value })} />
                  <StatInput label="Pérdidas" value={statsDraft.turnovers} onChange={(value) => setStatsDraft({ ...statsDraft, turnovers: value })} />
                  <StatInput label="Faltas" value={statsDraft.fouls} onChange={(value) => setStatsDraft({ ...statsDraft, fouls: value })} />
                </div>
                <button className="mg-button mg-button--primary" type="submit" disabled={busy || statsLoading || !playerId}>{busy ? 'Guardando…' : editingStatsPlayerId ? 'Guardar estadísticas' : 'Añadir estadísticas'}</button>
              </form>
              <div className="mg-stat-list-wrap">
                <div className="mg-stats-list-heading"><div><span className="mg-eyebrow">{selectedGame.round || 'PARTIDO'} · {new Date(selectedGame.game_date).toLocaleDateString('es-ES')}</span><h3>{teamById.get(selectedGame.home_team_id)} <b>{selectedGame.home_score ?? '—'}–{selectedGame.away_score ?? '—'}</b> {teamById.get(selectedGame.away_team_id)}</h3></div><button type="button" className="mg-back-button" onClick={() => setPane('games')}>Volver a partidos</button></div>
                {playerStats.length ? <div className="mg-stat-list">{playerStats.map((row) => <article className="mg-stat-row" key={row.player_id}><div className="mg-stat-player"><b>#{players.find((player) => player.id === row.player_id)?.shirt_number ?? '—'}</b><span>{players.find((player) => player.id === row.player_id)?.name ?? 'Jugador'}</span></div><div className="mg-stat-summary"><span><b>{row.points}</b> PTS</span><span><b>{totalRebounds(row)}</b> REB</span><span><b>{row.assists}</b> AST</span><span><b>{row.plus_minus > 0 ? '+' : ''}{row.plus_minus ?? 0}</b> +/-</span><span><b>{formatMinutes(playerMinutesSeconds(row))}</b> MIN</span></div><div className="mg-game-actions"><button type="button" onClick={() => startStatsEdit(row)}>Editar</button><button type="button" className="mg-danger-link" onClick={() => void deleteStats(row)}>Borrar</button></div></article>)}</div> : <div className="mg-empty">Todavía no hay líneas individuales para este partido.</div>}
              </div>
            </div>}</section>
        )}
      </section>
    </ManagementShell>
  )
}

function StatInput({ label, value, onChange, step = '1', min = '0' }: { label: string; value: number | string; onChange: (value: number) => void; step?: string; min?: string }) {
  return <label>{label}<input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>
}

function ManagementShell({ children }: { children: ReactNode }) {
  return <section className="management-page">{children}</section>
}
