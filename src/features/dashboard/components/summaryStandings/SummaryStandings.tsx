type NearbyTeam = { id: string; position: number; name: string; wins: number; losses: number; current: boolean }

export default function SummaryStandings({ teams }: { teams: NearbyTeam[] }) {
  return (
    <ol className="home-nearby" aria-label="Equipos cercanos en la clasificación">
      {teams.map((team) => (
        <li className={team.current ? 'is-current' : ''} key={team.id}>
          <span>{team.position}.</span><b>{team.name}</b><span>{team.wins} - {team.losses}</span>
        </li>
      ))}
    </ol>
  )
}
