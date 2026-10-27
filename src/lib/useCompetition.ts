import { useContext } from 'react'
import { CompetitionContext } from './CompetitionContext'

export function useCompetition() {
  const context = useContext(CompetitionContext)
  if (!context) throw new Error('useCompetition debe usarse dentro de CompetitionProvider')
  return context
}
