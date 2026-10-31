import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useCompetition } from '../../../lib/useCompetition'
import { teamLogoFor, teamLogoNeedsDarkInk } from '../../teams/teamLogos'
import './StandingsPage.css'

const SEASON = '2026-27'
type Team = { id: string; name: string; short_name: string | null; logo_url: string | null }
type Game = { id: string; home_team_id: string; away_team_id: string; status: string; home_score: number | null; away_score: number | null }
type PublishedRow = { team_id: string; position: number; played: number; wins: number; losses: number; points_for: number; points_against: number }
type Standing = { team: Team; position: number; played: number; wins: number; losses: number; pointsFor: number; pointsAgainst: number; official: boolean }

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function percentage(wins: number, played: number) { return played ? `${(wins / played * 100).toFixed(1)}%` : '—' }
function signed(value: number) { return value > 0 ? `+${value}` : String(value) }

export default function StandingsPage() {
  const { competition } = useCompetition()
  const [rows, setRows] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setError('Configura Supabase para consultar la clasificación.'); setLoading(false); return }
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      const { data: comp, error: compError } = await supabase!.from('competitions').select('id').eq('name', competition).maybeSingle()
      if (compError || !comp) { if (!cancelled) { setError(compError?.message ?? `No se encontró ${competition}.`); setLoading(false) }; return }
      const [membershipResult, gameResult, standingResult] = await Promise.all([
        supabase!.from('competition_teams').select('team_id').eq('competition_id', comp.id),
        supabase!.from('games').select('id,home_team_id,away_team_id,status,home_score,away_score').eq('competition_id', comp.id).eq('season', SEASON),
        supabase!.from('competition_standings').select('team_id,position,played,wins,losses,points_for,points_against').eq('competition_id', comp.id).eq('season', SEASON),
      ])
      if (membershipResult.error || gameResult.error || standingResult.error) {
        if (!cancelled) { setError(membershipResult.error?.message ?? gameResult.error?.message ?? standingResult.error?.message ?? 'No se pudo cargar la clasificación.'); setLoading(false) }
        return
      }
      const teamIds = (membershipResult.data ?? []).map((row) => row.team_id as string)
      if (!teamIds.length) { if (!cancelled) { setRows([]); setLoading(false) }; return }
      const { data: teamRows, error: teamError } = await supabase!.from('teams').select('id,name,short_name,logo_url').in('id', teamIds)
      if (teamError) { if (!cancelled) { setError(teamError.message); setLoading(false) }; return }

      const teams = (teamRows ?? []) as Team[]
      const byTeam = new Map<string, Standing>(teams.map((team) => [team.id, { team, position: 0, played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, official: false }]))
      for (const game of (gameResult.data ?? []) as Game[]) {
        if (game.status !== 'finished' || game.home_score === null || game.away_score === null) continue
        const home = byTeam.get(game.home_team_id); const away = byTeam.get(game.away_team_id)
        if (!home || !away) continue
        home.played++; away.played++
        home.pointsFor += game.home_score; home.pointsAgainst += game.away_score
        away.pointsFor += game.away_score; away.pointsAgainst += game.home_score
        if (game.home_score > game.away_score) { home.wins++; away.losses++ } else { away.wins++; home.losses++ }
      }
      const published = new Map(((standingResult.data ?? []) as PublishedRow[]).map((row) => [row.team_id, row]))
      for (const [teamId, row] of published) {
        const current = byTeam.get(teamId)
        if (current) Object.assign(current, { position: row.position, played: row.played, wins: row.wins, losses: row.losses, pointsFor: row.points_for, pointsAgainst: row.points_against, official: true })
      }
      const ordered = [...byTeam.values()].sort((a, b) => {
        if (a.official && b.official) return a.position - b.position
        if (a.official !== b.official) return a.official ? -1 : 1
        const aPct = a.played ? a.wins / a.played : 0; const bPct = b.played ? b.wins / b.played : 0
        return bPct - aPct || b.wins - a.wins || a.losses - b.losses || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor || a.team.name.localeCompare(b.team.name)
      }).map((row, index) => ({ ...row, position: row.official ? row.position : index + 1 }))
      if (!cancelled) { setRows(ordered); setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [competition])

  const valencia = rows.find((row) => row.team.name.toLowerCase() === 'valencia basket')
  const totals = useMemo(() => rows.reduce((result, row) => ({
    played: Math.max(result.played, row.played), wins: result.wins + row.wins,
  }), { played: 0, wins: 0 }), [rows])

  return (
    <section className="standings-page">
      <header className="standings-hero">
        <div className="standings-hero__copy"><span className="standings-eyebrow">TEMPORADA {SEASON.replace('-', ' / ')}</span><h1>Clasificación</h1><p>Todos los equipos y su rendimiento en {competition}.</p></div>
        <div className="standings-hero__competition"><span className="standings-hero__dot" />{competition}<small>Fase regular</small></div>
      </header>

      {!loading && !error && rows.length > 0 && <div className="standings-highlights">
        <article><span>Equipos</span><strong>{rows.length}</strong><small>Participantes</small></article>
        <article><span>Jornada</span><strong>{totals.played || '—'}</strong><small>Partidos disputados</small></article>
        <article className="standings-highlight--valencia"><span>Valencia Basket</span><strong>{valencia ? `${valencia.position}º` : '—'}</strong><small>{valencia ? `${valencia.wins}V · ${valencia.losses}D` : 'Sin clasificación'}</small></article>
      </div>}

      <section className="standings-card" aria-label={`Clasificación ${competition}`}>
        <div className="standings-card__heading"><div><span className="standings-eyebrow">TABLA DE POSICIONES</span><h2>{competition} · 2026/27</h2></div></div>
        {loading ? <div className="standings-state">Cargando clasificación…</div> : error ? <div className="standings-state standings-state--error" role="alert">{error}</div> : rows.length === 0 ? <div className="standings-state">No hay equipos asociados a {competition}. Revisa la relación de participantes de la competición.</div> : <div className="standings-table-scroll">
          <table className="standings-table">
            <thead><tr><th className="standings-table__rank">#</th><th className="standings-table__team">Equipo</th><th title="Partidos jugados">PJ</th><th title="Partidos ganados">V</th><th title="Partidos perdidos">D</th><th title="Porcentaje de victorias">%V</th><th title="Puntos a favor">PF</th><th title="Puntos en contra">PC</th><th title="Diferencial de puntos">+/-</th></tr></thead>
            <tbody>{rows.map((row) => {
              const logo = teamLogoFor(row.team.name, competition) ?? row.team.logo_url
              return <tr className={row.team.id === valencia?.team.id ? 'is-valencia' : ''} key={row.team.id}>
                <td className="standings-table__rank"><span>{row.position}</span></td>
                <td className="standings-table__team"><div className="standings-team-mark">{logo ? <img className={teamLogoNeedsDarkInk(row.team.name, competition) ? 'team-logo--dark-ink' : undefined} src={logo} alt="" /> : initials(row.team.short_name || row.team.name)}</div><strong>{row.team.name}</strong></td>
                <td>{row.played}</td><td className="standings-table__wins">{row.wins}</td><td>{row.losses}</td><td>{percentage(row.wins, row.played)}</td><td>{row.pointsFor}</td><td>{row.pointsAgainst}</td><td className={row.pointsFor - row.pointsAgainst > 0 ? 'is-positive' : row.pointsFor - row.pointsAgainst < 0 ? 'is-negative' : ''}>{signed(row.pointsFor - row.pointsAgainst)}</td>
              </tr>
            })}</tbody>
          </table>
        </div>}
        {!loading && !error && rows.length > 0 && <footer className="standings-card__footer"><span><i className="standings-football-dot" />Valencia Basket</span><span>PJ: partidos jugados · V: victorias · D: derrotas</span><span>PF: puntos a favor · PC: puntos en contra</span></footer>}
      </section>
    </section>
  )
}
