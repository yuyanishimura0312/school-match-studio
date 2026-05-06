// School Match Studio - Report Builder
// Builds detailed reports for each school using the JSON data layer

const ERA_LABELS = {
  meiji: "明治", taisho: "大正", showa_pre: "昭和前期", showa_post: "昭和後期",
  heisei: "平成", reiwa: "令和", future_2030: "2030年代", future_2050: "2050年代", future_2100: "2100年代"
};

const ARCHETYPE_NAMES = {
  arch_explorer: "探究者", arch_creator: "創造者", arch_leader: "リーダー型",
  arch_caregiver: "養育者", arch_warrior: "挑戦者", arch_mediator: "調停者",
  arch_craftsman: "職人型", arch_introvert_thinker: "内省思索者",
  arch_social_creator: "社交創造者", arch_steady: "堅実型"
};

function buildReport(school) {
  const cultureProfile = parseJSON(school.culture_profile, {});
  const fitsForSchool = FITS.filter(f => f.school_id === school.id);
  const eraFitsForSchool = ERA_FITS.filter(f => f.school_id === school.id);
  const pathsForSchool = PATHS.filter(p => p.school_id === school.id);

  return `
    <div class="report-block">
      <h3>序論：${school.school_name}という場</h3>
      <p>本レポートは、${school.school_name}（${school.prefecture || ""}）について、jpms-db の学校文化スコア・era-talents-db の時代適合分析・PST-DB の人格適合モデルを統合して作成された。学校選択は「序列」ではなく「相性」であり、本レポートも各次元での適合パターンを示すものである。最終的な選択は子ども・保護者・教師の対話で決めることが望ましい。</p>
      ${school.philosophy_summary ? `<p>${school.philosophy_summary}</p>` : ""}
    </div>

    <div class="report-block">
      <h3>第1章：学校文化プロファイル</h3>
      <p>${school.school_name}の学校文化は、jpms-db が定義する5次元（規律・競争・自由度・協調・学問厳密性）で記述される。各次元のスコアは、生徒・保護者・教師・卒業生の声を5層スキーマで集約した値である。</p>
      ${buildCultureBars(cultureProfile)}
      <p>このプロファイルは、本校が ${characterizeCulture(cultureProfile)}という性格を持つことを示している。これは特定の人格類型と高い適合性を持つ一方、別の類型にとってはストレッチ的な発達課題を提供する。詳しくは第3章「人格適合」で論じる。</p>
    </div>

    <div class="report-block">
      <h3>第2章：時代適合性 — 6時代+未来3時代の能力地形との関係</h3>
      <p>本校の教育方針が、明治から令和、2030年代以降の能力地形とどの程度適合するかを示す。fit_score は0.30-0.85の範囲で、0.65以上を「高適合」、0.55以上を「中適合」、それ未満を「低適合」とする。</p>
      ${buildEraTable(eraFitsForSchool)}
      ${buildEraInterpretation(eraFitsForSchool)}
    </div>

    <div class="report-block">
      <h3>第3章：人格類型との相性</h3>
      <p>10アーキタイプ（jpms person_archetype 準拠の Big Five-J + Holland Codes 統合分類）と本校の相性を、direct_fit / stretch_fit / poor_fit の3区分で評価する。direct_fit は基本的な適合性が高い類型、stretch_fit は基本適合の上に発達チャレンジが期待できる類型、poor_fit は構造的な不一致がある類型を意味する。重要なのは direct_fit が必ずしも「最良」ではなく、stretch_fit が発達的により価値ある場合があるという点である。</p>
      ${buildArchetypeBars(fitsForSchool)}
      ${buildArchetypeRationale(fitsForSchool)}
    </div>

    <div class="report-block">
      <h3>第4章：想定される活躍経路</h3>
      <p>本校に進学した場合、各人格類型がどのような活躍経路を辿る可能性が高いかを、PST-DB の予測モデルに基づいて示す。これは決定論的予測ではなく、複数シナリオの確率分布として理解されたい。</p>
      ${buildPathsSection(pathsForSchool)}
    </div>

    <div class="report-block">
      <h3>第5章：歴史上の偉人との関連</h3>
      <p>本校に向く人格類型と歴史上の偉人を関連付ける。ただし時代差異により直接投影は誤りであり、能力地形の翻訳が必要であることに留意されたい。</p>
      ${buildEminentSection(fitsForSchool)}
    </div>

    <div class="report-block">
      <h3>結論：${school.school_name}が向く子ども像</h3>
      <p>${buildConclusion(school, fitsForSchool, eraFitsForSchool)}</p>
      <div class="callout">
        <div class="callout-label">利用上の留意</div>
        <p>本レポートはjpms-db・era-talents-db・PST-DBの統合データから自動生成されたものです。学校の「序列付け」ではなく「相性のマップ」として理解してください。最終的な進学選択は、子ども本人の意思・実際の学校訪問・教師との面談を踏まえて決定してください。</p>
      </div>
    </div>`;
}

function parseJSON(s, fallback) {
  try { return JSON.parse(s || "{}"); } catch(e) { return fallback; }
}

function buildCultureBars(profile) {
  const dims = [
    {key: "discipline", label: "規律"}, {key: "competition", label: "競争性"},
    {key: "freedom", label: "自由度"}, {key: "cooperation", label: "協調性"},
    {key: "academic_rigor", label: "学問厳密性"}, {key: "diversity", label: "多様性"},
    {key: "internationality", label: "国際性"}, {key: "creativity", label: "創造性"}
  ];
  const present = dims.filter(d => profile[d.key] !== undefined);
  if (present.length === 0) return '<p style="color: var(--text-muted); font-size: 0.85rem;">文化プロファイル情報なし</p>';
  return present.map(d => {
    const v = profile[d.key];
    const pct = typeof v === "number" ? v : 50;
    return `<div class="score-bar-row">
      <div>${d.label}</div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>
      <div class="value">${typeof v === "number" ? v.toFixed(0) : v}</div>
    </div>`;
  }).join("");
}

function characterizeCulture(profile) {
  const high = [];
  if (profile.academic_rigor >= 70) high.push("学問厳密性が高い");
  if (profile.discipline >= 70) high.push("規律重視");
  if (profile.freedom >= 70) high.push("自由度が高い");
  if (profile.creativity >= 70) high.push("創造性志向");
  if (profile.cooperation >= 70) high.push("協調性重視");
  if (profile.internationality >= 70) high.push("国際性が高い");
  if (profile.diversity >= 70) high.push("多様性受容");
  return high.length > 0 ? high.join("・") + "の校風" : "バランス型の校風";
}

function buildEraTable(eraFits) {
  if (eraFits.length === 0) return '<p style="color: var(--text-muted); font-size: 0.85rem;">時代適合データなし</p>';
  const eras = ["meiji","taisho","showa_pre","showa_post","heisei","reiwa","future_2030","future_2050","future_2100"];
  let html = '<table class="era-table"><thead><tr>';
  eras.forEach(e => html += `<th>${ERA_LABELS[e]}</th>`);
  html += '</tr></thead><tbody><tr>';
  eras.forEach(e => {
    const f = eraFits.find(x => x.era_id === e);
    if (!f) { html += '<td>-</td>'; return; }
    const cls = f.fit_score >= 0.65 ? "high" : f.fit_score >= 0.55 ? "mid" : "low";
    html += `<td class="era-cell ${cls}">${f.fit_score.toFixed(2)}</td>`;
  });
  html += '</tr></tbody></table>';
  return html;
}

function buildEraInterpretation(eraFits) {
  if (eraFits.length === 0) return "";
  const sorted = [...eraFits].sort((a,b) => b.fit_score - a.fit_score);
  const top = sorted[0];
  const future = eraFits.filter(f => f.era_id.startsWith("future_")).sort((a,b)=>b.fit_score-a.fit_score)[0];
  return `<p>最も高適合の時代は <strong>${ERA_LABELS[top.era_id] || top.era_id}</strong>（fit ${top.fit_score.toFixed(2)}）であり、${top.rationale || "本校の教育方針が当該時代の能力像と高い親和性を持つ"}。${future ? `未来時代では <strong>${ERA_LABELS[future.era_id]}</strong> が最高適合（fit ${future.fit_score.toFixed(2)}）で、${future.rationale || "その時代の能力地形に対する潜在的な適合性"}を示している。` : ""}</p>`;
}

function buildArchetypeBars(fits) {
  if (fits.length === 0) return '<p style="color: var(--text-muted); font-size: 0.85rem;">人格適合データなし</p>';
  const sorted = [...fits].sort((a,b) => b.fit_score - a.fit_score);
  return sorted.map(f => {
    const archName = ARCHETYPE_NAMES[f.archetype_id] || f.archetype_id;
    const fitColor = f.fit_type === "direct_fit" ? "var(--accent-warm)" :
                     f.fit_type === "stretch_fit" ? "rgba(204,20,0,0.5)" : "rgba(204,20,0,0.2)";
    return `<div class="score-bar-row" style="grid-template-columns: 160px 1fr 110px;">
      <div>${archName}</div>
      <div class="score-bar-track"><div class="score-bar-fill" style="width:${(f.fit_score*100).toFixed(0)}%; background: ${fitColor};"></div></div>
      <div class="value">${f.fit_score.toFixed(2)} <small>${f.fit_type}</small></div>
    </div>`;
  }).join("");
}

function buildArchetypeRationale(fits) {
  const direct = fits.filter(f => f.fit_type === "direct_fit").sort((a,b) => b.fit_score - a.fit_score);
  const stretch = fits.filter(f => f.fit_type === "stretch_fit").sort((a,b) => b.fit_score - a.fit_score).slice(0, 3);
  let html = "";
  if (direct.length > 0) {
    html += `<h4>direct_fit（基本適合が高い類型）</h4>`;
    direct.forEach(f => {
      html += `<p><strong>${ARCHETYPE_NAMES[f.archetype_id]}</strong>：${f.rationale || "心理学的に高適合"}${f.risks ? ` ／ リスク：${f.risks}` : ""}</p>`;
    });
  }
  if (stretch.length > 0) {
    html += `<h4>stretch_fit（発達チャレンジが期待できる類型）</h4>`;
    stretch.forEach(f => {
      html += `<p><strong>${ARCHETYPE_NAMES[f.archetype_id]}</strong>：${f.rationale || "stretch fit パターン"}${f.risks ? ` ／ 注意：${f.risks}` : ""}</p>`;
    });
  }
  return html;
}

function buildPathsSection(paths) {
  if (paths.length === 0) return '<p style="color: var(--text-muted); font-size: 0.85rem;">本校についての予測パスデータは現時点で不足しています。第3章の人格適合とPST-DBダッシュボードを併せて参照してください。</p>';
  return paths.map(p => {
    const archName = ARCHETYPE_NAMES[p.archetype_id] || p.archetype_id;
    let careers = parseJSON(p.likely_career_domains, []);
    let outcomes = parseJSON(p.estimated_outcomes, {});
    let conf = parseJSON(p.confidence_interval, {});
    let scenarios = parseJSON(p.scenario_breakdown, {});
    return `<div class="callout">
      <div class="callout-title">${archName}型の活躍経路</div>
      <p style="font-size:0.85rem;">想定キャリア：${Array.isArray(careers) ? careers.join("、") : careers}</p>
      <p style="font-size:0.85rem;">${p.rationale || ""}</p>
      <div style="font-size:0.72rem; color: var(--text-muted); margin-top:8px;">
        信頼区間：${conf.lower?.toFixed(2) || "-"} 〜 ${conf.upper?.toFixed(2) || "-"} ／
        シナリオ別：${Object.entries(scenarios).map(([k,v])=>`${k}=${(v*100).toFixed(0)}%`).join(" / ")}
      </div>
    </div>`;
  }).join("");
}

function buildEminentSection(fits) {
  const direct = fits.filter(f => f.fit_type === "direct_fit").sort((a,b) => b.fit_score - a.fit_score).slice(0, 3);
  if (direct.length === 0) {
    const top = fits.sort((a,b)=>b.fit_score-a.fit_score).slice(0,2);
    if (top.length === 0) return '';
    return top.map(f => buildEminentBlock(f.archetype_id)).join("");
  }
  return direct.map(f => buildEminentBlock(f.archetype_id)).join("");
}

function buildEminentBlock(archetypeId) {
  const archName = ARCHETYPE_NAMES[archetypeId] || archetypeId;
  const list = (EMINENTS[archetypeId] || []).slice(0, 5);
  if (list.length === 0) return "";
  return `<h4>${archName}型の歴史上の事例</h4>
    <p>${list.map(p => `<strong>${p.name}</strong>（${ERA_LABELS[p.era] || p.era}・${p.domain || ""}）`).join("、")}。これらは本校に向く${archName}型の歴史的な代表者である。ただし時代差異があり、明治・大正の能力地形と令和・未来の能力地形は異なるため、直接的なロールモデルではなく「翻訳された等価像」として参照されたい。</p>`;
}

function buildConclusion(school, fits, eraFits) {
  const directFits = fits.filter(f => f.fit_type === "direct_fit").map(f => ARCHETYPE_NAMES[f.archetype_id]);
  const topEra = [...eraFits].sort((a,b)=>b.fit_score-a.fit_score)[0];
  return `${school.school_name}は、${directFits.length > 0 ? directFits.join("・") + "型" : "バランス型"}の子どもにとって基本的な適合性が高い学校である。${topEra ? `時代適合性では ${ERA_LABELS[topEra.era_id]} の能力像と最も親和的（fit ${topEra.fit_score.toFixed(2)}）で、` : ""}本校に進学する子どもは、その校風の中で能力を発達させながら、複数の活躍経路の可能性を持つ。重要なのは、本校が「合わない」類型でも stretch_fit として発達的価値を持つ場合があり、最終的な選択は子ども本人の意思と保護者・教師の対話で決めることである。`;
}
