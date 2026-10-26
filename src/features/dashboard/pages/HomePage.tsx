import LastMatch from "../components/lastMatch/LastMatch";
import NextMatch from "../components/nextMatch/NextMatch";
import SummaryStandings from "../components/summaryStandings/SummaryStandings";
import './HomePage.css'


export default function HomePage() {
  return (
    <div className="home-page">
        <NextMatch />
        <div className="summaryLastMatch_section">
          <LastMatch />
          <SummaryStandings/>
        </div>
    </div>
  )
}
