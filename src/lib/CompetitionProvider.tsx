import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CompetitionContext, type CompetitionName } from './CompetitionContext'
import { supabase } from './supabase'

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competition, setCompetition] = useState<CompetitionName>('ACB')
  const userHasSelected = useRef(false)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function selectNearestCompetition() {
      const [competitionResult, valenciaResult] = await Promise.all([
        supabase!.from('competitions').select('id,name').in('name', ['ACB', 'EuroLeague']),
        supabase!.from('teams').select('id').eq('name', 'Valencia Basket').maybeSingle(),
      ])
      if (competitionResult.error || valenciaResult.error || !valenciaResult.data) return

      const competitionRows = competitionResult.data ?? []
      const ids = competitionRows.map((row) => row.id)
      if (!ids.length) return
      const { data: gameRows, error } = await supabase!
        .from('games')
        .select('competition_id,game_date,status,home_team_id,away_team_id')
        .in('competition_id', ids)
        .eq('season', '2026-27')
        .in('status', ['scheduled', 'live'])
        .order('game_date', { ascending: true })
      if (error || cancelled || userHasSelected.current) return

      const valenciaId = valenciaResult.data.id
      const nextGame = (gameRows ?? [])
        .filter((game) => game.home_team_id === valenciaId || game.away_team_id === valenciaId)
        .filter((game) => game.status === 'live' || new Date(game.game_date).getTime() >= Date.now())
        .sort((a, b) => {
          if (a.status === 'live' && b.status !== 'live') return -1
          if (b.status === 'live' && a.status !== 'live') return 1
          return new Date(a.game_date).getTime() - new Date(b.game_date).getTime()
        })[0]
      const nearest = competitionRows.find((row) => row.id === nextGame?.competition_id)
      if (nearest && (nearest.name === 'ACB' || nearest.name === 'EuroLeague')) setCompetition(nearest.name)
    }

    void selectNearestCompetition()
    return () => { cancelled = true }
  }, [])

  function chooseCompetition(next: CompetitionName) {
    userHasSelected.current = true
    setCompetition(next)
  }

  const value = useMemo(() => ({ competition, setCompetition: chooseCompetition }), [competition])
  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>
}
