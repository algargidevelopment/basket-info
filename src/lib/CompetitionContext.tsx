import { createContext } from 'react'

export type CompetitionName = 'ACB' | 'EuroLeague'

export type CompetitionContextValue = {
  competition: CompetitionName
  setCompetition: (competition: CompetitionName) => void
}

export const CompetitionContext = createContext<CompetitionContextValue | null>(null)
