const SEV_LABEL = {
  major: 'Crise active majeure',
  watch: 'Zone de veille'
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderSources(sources = []) {
  if (!sources.length) return '';
  return `<ul class="p-sources">${sources
    .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`)
    .join('')}</ul>`;
}

/** Construit le HTML d'une fiche crise (complète ou ébauche). */
export function renderCrisis(crisis, meta) {
  const sev = crisis.severity;
  const figMod = sev === 'watch' ? ' p-figure--watch' : '';

  let body = `
    <div class="p-sev p-sev--${sev}"><span class="p-sev__dot"></span>${SEV_LABEL[sev] || ''} · ${esc(
    crisis.type || ''
  )}</div>
    <h2 class="p-name">${esc(crisis.name)}</h2>
    <div class="p-region">${esc(crisis.region)}</div>
    <div class="p-figure${figMod}">
      <div class="p-figure__value">${esc(crisis.keyFigure.value)}</div>
      <div class="p-figure__label">${esc(crisis.keyFigure.label)}</div>
    </div>
  `;

  if (crisis.status === 'complete') {
    if (crisis.editorialNote) {
      body += `<p class="p-note">${esc(crisis.editorialNote)}</p>`;
    }
    body += `<div class="p-h">Contexte</div><div class="p-context">${crisis.context
      .map((p) => `<p>${esc(p)}</p>`)
      .join('')}</div>`;

    if (crisis.timeline?.length) {
      body += `<div class="p-h">Repères chronologiques</div><ul class="p-timeline">${crisis.timeline
        .map(
          (t) =>
            `<li><div class="p-timeline__year">${esc(t.year)}</div><div class="p-timeline__label">${esc(
              t.label
            )}</div></li>`
        )
        .join('')}</ul>`;
    }
  } else {
    if (crisis.editorialNote) {
      body += `<p class="p-note">${esc(crisis.editorialNote)}</p>`;
    }
    body += `<div class="p-h">Contexte</div><p class="p-stub">Fiche en cours de rédaction et de sourçage. Le chiffre clé ci-dessus est un ordre de grandeur issu des agences citées ci-dessous ; le contexte détaillé, la frise et les incertitudes seront ajoutés dans une prochaine version.</p>`;
  }

  body += `<div class="p-h">Sources</div>${renderSources(crisis.sources)}`;

  if (meta?.disclaimer) {
    body += `<p class="p-note">${esc(meta.disclaimer)}</p>`;
  }

  if (crisis.moreUrl) {
    body += `<a class="p-more" href="${esc(crisis.moreUrl)}" target="_blank" rel="noopener">En savoir plus ↗</a>`;
  }

  return body;
}

export function methodologyHTML() {
  return `
    <h2>Méthodologie &amp; sources</h2>
    <p>Ce site est un outil de <strong>sensibilisation</strong>. Il vise à rendre visibles des crises souvent absentes des médias, sans dramatisation gratuite et en s'appuyant sur des sources vérifiables.</p>

    <h3>Choix des chiffres</h3>
    <p>Les chiffres affichés sont des <em>estimations</em> produites par des agences humanitaires (ONU/OCHA, HCR, OIM) ou des ONG reconnues. Ils sont souvent incertains, révisés dans le temps, et parfois contestés selon les méthodologies. Ils indiquent des <strong>ordres de grandeur</strong>, jamais des décomptes exacts.</p>

    <h3>Sources privilégiées</h3>
    <ul>
      <li>Agences des Nations unies : OCHA, HCR, OIM, PAM, IPC.</li>
      <li>ONG de défense des droits humains : Human Rights Watch, Amnesty International, et des organisations locales (ex. B'Tselem).</li>
      <li>Médias établis, en recoupant plusieurs sources.</li>
    </ul>

    <h3>Ligne éditoriale</h3>
    <ul>
      <li>Distinguer clairement les <strong>politiques et acteurs armés</strong> des <strong>populations civiles</strong> et des <strong>religions</strong>.</li>
      <li>Éviter les simplifications (par ex. ne pas réduire le conflit dans l'est de la RDC à « Rwanda contre Congo »).</li>
      <li>Expliciter les incertitudes plutôt que de les masquer.</li>
    </ul>

    <h3>Limites</h3>
    <p>Certaines fiches sont encore des ébauches, signalées comme telles. Les données ne sont pas mises à jour en temps réel : reportez-vous toujours aux sources liées pour l'information la plus récente.</p>
  `;
}
