import type { CompetitionName } from '../../lib/CompetitionContext'
import './teamLogos.css'

const teamLogos = import.meta.glob<string>('../../assets/teams/**/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
})

const logoAliases: Record<CompetitionName, Record<string, string>> = {
  ACB: {
    'fc-barcelona': 'barca',
    barcelona: 'barca',
  },
  EuroLeague: {
    'anadolu-efes-istanbul': 'anadolu-efes',
    'besiktas-istanbul': 'besiktas',
    'crvena-zvezda-meridianbet-belgrade': 'crvena-zvezda',
    'fc-bayern-munich': 'bayern-munich',
    'fc-barcelona': 'barcelona',
    'fenerbahce-tarfin-istanbul': 'fenerbahce',
    'kosner-baskonia-vitoria-gasteiz': 'kosner-baskonia',
    'olympiacos-piraeus': 'olympiacos',
    'panathinaikos-aktor-athens': 'panathinaikos',
    'partizan-mozzart-bet-belgrade': 'partizan',
    'real-madrid-baloncesto': 'real-madrid',
  },
}

function slug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function teamLogoFor(name: string, competition: CompetitionName) {
  const normalizedName = slug(name)
  const filename = logoAliases[competition][normalizedName] ?? normalizedName
  const relativeAsset = competition === 'EuroLeague'
    ? `/assets/teams/euroleague/${filename}.webp`
    : `/assets/teams/${filename}.webp`
  const entry = Object.entries(teamLogos).find(([path]) => path.replace(/\\/g, '/').endsWith(relativeAsset))
  return entry?.[1]
}

export function teamLogoNeedsDarkInk(name: string, competition: CompetitionName) {
  return competition === 'EuroLeague' && slug(name).startsWith('maccabi')
}
