import { useMemo, useState, type ReactNode } from 'react'
import { CompetitionContext, type CompetitionName } from './CompetitionContext'

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const [competition, setCompetition] = useState<CompetitionName>('ACB')
  const value = useMemo(() => ({ competition, setCompetition }), [competition])
  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>
}
