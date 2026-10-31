import { teamLogoFor, teamLogoNeedsDarkInk } from '../../../teams/teamLogos'

type NearbyTeam = { id: string; position: number; name: string; wins: number; losses: number; current: boolean }
type CompetitionName = 'ACB' | 'EuroLeague'

function initials(name: string) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }

export default function SummaryStandings({ teams, competition }: { teams: NearbyTeam[]; competition: CompetitionName }) {
  return (
    <ol className="home-nearby" aria-label="Equipos cercanos en la clasificación">
      {teams.map((team) => (
        <li className={team.current ? 'is-current' : ''} key={team.id}>
          <span>{team.position}.</span><span className="home-nearby__mark">{teamLogoFor(team.name, competition) ? <img className={teamLogoNeedsDarkInk(team.name, competition) ? 'team-logo--dark-ink' : undefined} src={teamLogoFor(team.name, competition)} alt="" /> : initials(team.name)}</span><b>{team.name}</b><span>{team.wins} - {team.losses}</span>
        </li>
      ))}
    </ol>
  )
}
