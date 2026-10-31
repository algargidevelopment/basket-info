
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase, hasSupabaseConfig } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import './PlayersPage.css'

const SEASON = '2026-27'
const localPlayerPhotos = import.meta.glob<string>('../../../assets/players/*.{avif,jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
})

type Player = {
  id: string
  name: string
  shirt_number: number | null
  position: string | null
  birth_date: string | null
  height_cm: number | null
  photo_url: string | null
  active: boolean
}

type PlayerGameStat = {
  player_id: string
  minutes: number | string
  points: number
  rebounds: number | null
  two_points_made: number
  two_points_attempted: number
  three_points_made: number
  three_points_attempted: number
  free_throws_made: number
  free_throws_attempted: number
  offensive_rebounds: number
  defensive_rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
}

type PlayerTotals = {
  games: number
  minutes: number
  points: number
  twoMade: number
  twoAttempted: number
  threeMade: number
  threeAttempted: number
  freeMade: number
  freeAttempted: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
}

const emptyTotals = (): PlayerTotals => ({
  games: 0, minutes: 0, points: 0, twoMade: 0, twoAttempted: 0,
  threeMade: 0, threeAttempted: 0, freeMade: 0, freeAttempted: 0,
  rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
})

function percent(made: number, attempted: number) {
  return attempted ? `${Math.round((made / attempted) * 100)}%` : '—'
}

function average(value: number, games: number, digits = 1) {
  return games ? (value / games).toFixed(digits) : '—'
}

function ageOnToday(birthDate: string | null) {
  if (!birthDate) return null
  const birth = new Date(`${birthDate}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const beforeBirthday = today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age
}

function playerInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function playerPhotoSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function playerPhoto(player: Player) {
  const slug = playerPhotoSlug(player.name)
  const localEntry = Object.entries(localPlayerPhotos).find(([path]) => path.split('/').pop()?.replace(/\.[^.]+$/, '') === slug)
  return localEntry?.[1] ?? player.photo_url
}

export default function PlayersPage() {
  const { competition } = useCompetition()
  const [players, setPlayers] = useState<Player[]>([])
  const [totals, setTotals] = useState<Record<string, PlayerTotals>>({})
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [position, setPosition] = useState('Todos')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadRoster() {
      setLoading(true)
      setError('')
      if (!hasSupabaseConfig || !supabase) {
        setError('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local para cargar la plantilla.')
        setLoading(false)
        return
      }

      const { data: roster, error: rosterError } = await supabase
        .from('players')
        .select('id,name,shirt_number,position,birth_date,height_cm,photo_url,active')
        .eq('active', true)
        .order('shirt_number', { ascending: true })

      if (rosterError) {
        if (!cancelled) {
          setError(`No se pudo cargar la plantilla: ${rosterError.message}`)
          setLoading(false)
        }
        return
      }

      const activePlayers = (roster ?? []) as Player[]
      const { data: competitionRow, error: competitionError } = await supabase
        .from('competitions')
        .select('id')
        .eq('name', competition)
        .maybeSingle()

      const { data: statRows, error: statsError } = competitionError || !competitionRow
        ? { data: null, error: competitionError ?? new Error(`No se encontró la competición ${competition}`) }
        : await supabase
        .from('game_player_stats')
        .select('player_id,minutes,points,rebounds,two_points_made,two_points_attempted,three_points_made,three_points_attempted,free_throws_made,free_throws_attempted,offensive_rebounds,defensive_rebounds,assists,steals,blocks,turnovers,games!inner(season,status)')
        .eq('games.season', SEASON)
        .eq('games.competition_id', competitionRow.id)
        .eq('games.status', 'finished')

      const grouped: Record<string, PlayerTotals> = {}
      if (!statsError && statRows) {
        for (const row of statRows as unknown as PlayerGameStat[]) {
          const player = grouped[row.player_id] ?? emptyTotals()
          player.games += 1
          player.minutes += Number(row.minutes) || 0
          player.points += row.points || 0
          player.twoMade += row.two_points_made || 0
          player.twoAttempted += row.two_points_attempted || 0
          player.threeMade += row.three_points_made || 0
          player.threeAttempted += row.three_points_attempted || 0
          player.freeMade += row.free_throws_made || 0
          player.freeAttempted += row.free_throws_attempted || 0
          const splitRebounds = (row.offensive_rebounds || 0) + (row.defensive_rebounds || 0)
          player.rebounds += splitRebounds || row.rebounds || 0
          player.assists += row.assists || 0
          player.steals += row.steals || 0
          player.blocks += row.blocks || 0
          player.turnovers += row.turnovers || 0
          grouped[row.player_id] = player
        }
      }

      if (!cancelled) {
        setPlayers(activePlayers)
        setTotals(grouped)
        if (statsError) setError('La plantilla está cargada, pero las estadísticas de temporada todavía no están disponibles.')
        setLoading(false)
      }
    }

    void loadRoster()
    return () => { cancelled = true }
  }, [competition])

  useEffect(() => {
    if (!selectedPlayer) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedPlayer(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedPlayer])

  const positions = useMemo(() => ['Todos', ...new Set(players.map((player) => player.position).filter((value): value is string => Boolean(value)))], [players])
  const visiblePlayers = useMemo(() => players.filter((player) => {
    const matchesPosition = position === 'Todos' || player.position === position
    const matchesSearch = player.name.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))
    return matchesPosition && matchesSearch
  }), [players, position, search])

  const selectedTotals = selectedPlayer ? totals[selectedPlayer.id] ?? emptyTotals() : null
  const selectedPhoto = selectedPlayer ? playerPhoto(selectedPlayer) : null

  return (
    <section className="roster-page">
      <div className="roster-hero">
        <div className="roster-hero__copy">
          <span className="roster-kicker"><span className="roster-kicker__dot" /> TEMPORADA 2026 / 27</span>
          <h1>El equipo <span>taronja.</span></h1>
          <p>Conoce a los jugadores que defienden nuestros colores esta temporada.</p>
        </div>
        
        <div className="roster-hero__season">VALENCIA<br />BASKET <span>·</span> 26/27</div>
      </div>

      <div className="roster-toolbar">
        <div className="roster-toolbar__heading">
          <span className="roster-kicker">PRIMER EQUIPO MASCULINO</span>
          <h2>La plantilla <span>{loading ? '…' : `(${visiblePlayers.length})`}</span></h2>
        </div>
        <label className="roster-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.4 4.4" /></svg>
          <input aria-label="Buscar jugador" placeholder="Buscar jugador" value={search} onChange={(event) => setSearch(event.target.value)} />
          <span>⌘ K</span>
        </label>
      </div>

      <div className="roster-filters" role="group" aria-label="Filtrar por posición">
        {positions.map((item) => (
          <button key={item} type="button" className={`roster-filter ${position === item ? 'roster-filter--active' : ''}`} onClick={() => setPosition(item)} aria-pressed={position === item}>
            {item}
          </button>
        ))}
      </div>

      {error && <div className={`roster-notice ${players.length ? 'roster-notice--subtle' : ''}`} role="status">{error}</div>}

      {loading ? (
        <div className="roster-grid" aria-label="Cargando plantilla">
          {Array.from({ length: 8 }, (_, index) => <div className="roster-skeleton" key={index} />)}
        </div>
      ) : visiblePlayers.length ? (
        <div className="roster-grid">
          {visiblePlayers.map((player, index) => {
            const stats = totals[player.id] ?? emptyTotals()
            const age = ageOnToday(player.birth_date)
            const photo = playerPhoto(player)
            return (
              <button className="player-card" key={player.id} type="button" onClick={() => setSelectedPlayer(player)} style={{ animationDelay: `${index * 45}ms` }}>
                <span className="player-card__topline"><span>VALENCIA BASKET</span><span>#{player.shirt_number ?? '—'}</span></span>
                <span className="player-card__portrait">
                  <span className="player-card__initials">{playerInitials(player.name)}</span>
                  {photo && <img src={photo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
                  <span className="player-card__portrait-number">{String(player.shirt_number ?? '').padStart(2, '0')}</span>
                  <span className="player-card__portrait-ball" aria-hidden="true">🏀</span>
                </span>
                <span className="player-card__info">
                  <span className="player-card__position">{player.position || 'Jugador'}</span>
                  <span className="player-card__name">{player.name}</span>
                  <span className="player-card__meta">{player.height_cm ? `${(player.height_cm / 100).toFixed(2)} m` : 'Altura pendiente'}{age !== null ? ` · ${age} años` : ''}</span>
                </span>
                <span className="player-card__stats">
                  <span><strong>{average(stats.points, stats.games)}</strong><small>PTS / PJ</small></span>
                  <span className="player-card__shooting-stat"><strong>{percent(stats.twoMade + stats.threeMade, stats.twoAttempted + stats.threeAttempted)}</strong><small>TC%</small><i className="player-card__shooting-track" aria-hidden="true"><i style={{ width: `${stats.twoAttempted + stats.threeAttempted ? Math.min(((stats.twoMade + stats.threeMade) / (stats.twoAttempted + stats.threeAttempted)) * 100, 100) : 0}%` }} /></i></span>
                  <span className="player-card__arrow" aria-hidden="true">↗</span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="roster-empty">
          <span>🏀</span>
          <h3>{players.length ? 'No encontramos a ese jugador' : 'La plantilla aún no está disponible'}</h3>
          <p>{players.length ? 'Prueba con otro nombre o filtro.' : 'Cuando conectes Supabase y cargues los jugadores, aparecerán aquí.'}</p>
        </div>
      )}

      <footer className="roster-footer"><span>ESTADÍSTICAS · {competition}</span><p>Los promedios corresponden a partidos finalizados de {competition} en la temporada 2026/27. Selecciona un jugador para ver su ficha.</p></footer>

      {selectedPlayer && selectedTotals && createPortal((
        <div className="player-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPlayer(null) }}>
          <section className="player-dialog" role="dialog" aria-modal="true" aria-labelledby="player-dialog-name">
            <button className="player-dialog__close" type="button" aria-label="Cerrar ficha" onClick={() => setSelectedPlayer(null)}>×</button>
            <div className="player-dialog__hero">
              <span className="player-dialog__jersey">{String(selectedPlayer.shirt_number ?? '—').padStart(2, '0')}</span>
              <span className="player-dialog__initials">{playerInitials(selectedPlayer.name)}</span>
              {selectedPhoto && <img src={selectedPhoto} alt={selectedPlayer.name} onError={(event) => { event.currentTarget.style.display = 'none' }} />}
              <div className="player-dialog__identity">
                <span className="roster-kicker">{selectedPlayer.position || 'JUGADOR'} · VALENCIA BASKET</span>
                <h2 id="player-dialog-name">{selectedPlayer.name}</h2>
                <p>{selectedPlayer.height_cm ? `${(selectedPlayer.height_cm / 100).toFixed(2)} m` : 'Altura pendiente'}<span> / </span>{ageOnToday(selectedPlayer.birth_date) ?? 'Edad pendiente'}{ageOnToday(selectedPlayer.birth_date) !== null ? ' años' : ''}</p>
              </div>
            </div>
            <div className="player-dialog__content">
              <div className="player-dialog__section-title"><div><span className="roster-kicker">TEMPORADA 2026 / 27</span><h3>Estadísticas</h3></div><span className="player-dialog__games">{selectedTotals.games} PARTIDOS</span></div>
              <div className="player-dialog__stats-grid">
                <div><small>Puntos</small><strong>{average(selectedTotals.points, selectedTotals.games)}</strong><span>por partido</span></div>
                <div><small>Rebotes</small><strong>{average(selectedTotals.rebounds, selectedTotals.games)}</strong><span>por partido</span></div>
                <div><small>Asistencias</small><strong>{average(selectedTotals.assists, selectedTotals.games)}</strong><span>por partido</span></div>
                <div><small>Minutos</small><strong>{selectedTotals.minutes ? average(selectedTotals.minutes, selectedTotals.games) : '—'}</strong><span>{selectedTotals.minutes ? 'por partido' : 'sin dato'}</span></div>
              </div>
              <div className="player-dialog__shooting">
                <div className="player-dialog__section-title"><div><span className="roster-kicker">EFICACIA</span><h3>Porcentajes de tiro</h3></div></div>
                {[
                  ['Tiros de campo', selectedTotals.twoMade + selectedTotals.threeMade, selectedTotals.twoAttempted + selectedTotals.threeAttempted],
                  ['Tiros de 2', selectedTotals.twoMade, selectedTotals.twoAttempted],
                  ['Triples', selectedTotals.threeMade, selectedTotals.threeAttempted],
                  ['Tiros libres', selectedTotals.freeMade, selectedTotals.freeAttempted],
                ].map(([label, made, attempts]) => {
                  const madeNumber = Number(made)
                  const attemptsNumber = Number(attempts)
                  const rate = attemptsNumber > 0 ? Math.max(0, Math.min(madeNumber / attemptsNumber, 1)) : 0
                  const ratePercent = rate * 100
                  return <div className="shooting-row" key={String(label)}><span>{label}</span><div className="shooting-row__track" role="img" aria-label={`${label}: ${percent(madeNumber, attemptsNumber)}`} style={{ background: `linear-gradient(90deg, #f35b04 ${ratePercent}%, #eef0f2 ${ratePercent}%)` }} /><strong>{percent(madeNumber, attemptsNumber)}</strong><small>{madeNumber}/{attemptsNumber}</small></div>
                })}
              </div>
              <div className="player-dialog__extras"><span>ROBOS <strong>{average(selectedTotals.steals, selectedTotals.games)}</strong></span><span>TAPONES <strong>{average(selectedTotals.blocks, selectedTotals.games)}</strong></span><span>PÉRDIDAS <strong>{average(selectedTotals.turnovers, selectedTotals.games)}</strong></span></div>
            </div>
          </section>
        </div>
      ), document.body)}
    </section>
  )
}
