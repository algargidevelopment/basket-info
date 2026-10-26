import './NextMatch.css'

export default function NextMatch() {
  return (
    <section className="next-match" aria-labelledby="next-match-title">
      <div className="next-match__topline">
        <div className="next-match__tags">
          <span className="next-match__badge next-match__badge--featured" id="next-match-title">
            <span className="next-match__badge-dot" aria-hidden="true" />
            Próximo encuentro
          </span>
          <span className="next-match__badge next-match__badge--competition">
            EuroLeague <span aria-hidden="true">·</span> Jornada 28
          </span>
        </div>
        <a className="next-match__broadcast" href="#retransmision">
          <span aria-hidden="true">▣</span> Movistar+ Deportes <span>(Dial 63)</span>
        </a>
      </div>

      <div className="next-match__main">
        <div className="next-match__team next-match__team--home">
          <div className="next-match__crest next-match__crest--valencia" aria-hidden="true">V</div>
          <span className="next-match__venue-label">Local</span>
          <h2 className="next-match__team-name">Valencia</h2>
          <p className="next-match__team-record">Taronja Spirit · 15V - 10D</p>
          <div className="next-match__recent" aria-label="Últimos cinco partidos: victoria, victoria, derrota, victoria, victoria">
            <span>Racha:</span><i className="is-win">V</i><i className="is-win">V</i><i className="is-loss">D</i><i className="is-win">V</i><i className="is-win">V</i>
          </div>
        </div>

        <div className="next-match__schedule">
          <span className="next-match__versus">VS</span>
          <time className="next-match__time" dateTime="20:30">20:30</time>
          <span className="next-match__date">CET · Viernes, 28 feb</span>
        </div>

        <div className="next-match__team next-match__team--away">
          <div className="next-match__crest next-match__crest--madrid" aria-hidden="true">RM</div>
          <span className="next-match__venue-label next-match__venue-label--away">Visitante</span>
          <h2 className="next-match__team-name">R. Madrid</h2>
          <p className="next-match__team-record">2º clasificado · 19V - 6D</p>
          <div className="next-match__recent" aria-label="Últimos cinco partidos: victoria, victoria, victoria, derrota, derrota">
            <span>Racha:</span><i className="is-win">V</i><i className="is-win">V</i><i className="is-win">V</i><i className="is-loss">D</i><i className="is-loss">D</i>
          </div>
        </div>

        <aside className="next-match__countdown" aria-label="Cuenta atrás para el partido">
          <div className="next-match__countdown-heading">
            <span>Tiempo restante</span><span className="next-match__countdown-light" aria-hidden="true" />
          </div>
          <div className="next-match__countdown-units">
            <div><strong>02</strong><span>Días</span></div>
            <div><strong>04</strong><span>Horas</span></div>
            <div><strong>30</strong><span>Min</span></div>
          </div>
          <p className="next-match__arena"><span aria-hidden="true">⌖</span> La Fonteta, Valencia</p>
        </aside>
      </div>

      <footer className="next-match__footer">
        <p className="next-match__referees"><span aria-hidden="true">⚑</span> Árbitros: B. Ryzhyk (UKR), E. Mogulkoc (TUR), J. Bissang (FRA)</p>
        <div className="next-match__actions">
          <button className="next-match__button next-match__button--calendar" type="button">
            <span aria-hidden="true">▣</span> Añadir a calendario
          </button>
          <a className="next-match__button next-match__button--preview" href="/partidos">
            Ver previa del partido <span aria-hidden="true">→</span>
          </a>
        </div>
      </footer>
    </section>
  )
}
