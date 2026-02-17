import React from "react";

export default function InsightsCard({ title = "Insights", subtitle, losing = [], improve = [] }) {
  return (
    <section className="insCard">
      <div className="insHead">
        <div>
          <div className="insTitle">{title}</div>
          {subtitle ? <div className="insSub">{subtitle}</div> : null}
        </div>
        <span className="insBadge">AI insights</span>
      </div>

      <div className="insGrid">
        <div className="insCol">
          <div className="insColTitle">Where you’re losing money</div>
          {losing?.length ? (
            <ul className="insList">
              {losing.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : (
            <div className="insMuted">No data yet.</div>
          )}
        </div>

        <div className="insCol">
          <div className="insColTitle">How to improve</div>
          {improve?.length ? (
            <ul className="insList">
              {improve.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : (
            <div className="insMuted">No suggestions yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
