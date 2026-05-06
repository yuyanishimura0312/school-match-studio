// School Match Studio - Report Builder (Benchmark準拠版)
// jpms-db sample-12-schools.html 形式の詳細レポートを生成

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

const ROLE_LABELS = {
  principal: "校長／理事長", teacher: "教員", chairperson: "理事長",
  student_current: "在校生", student_alumni: "卒業生", parent: "保護者"
};

const GENDER_LABELS = { boys: "男子校", girls: "女子校", coed: "共学" };
const INTEGRATED_LABELS = { attached: "大学付属", full: "完全中高一貫", linked: "連携型", none: "独立校" };
const RELIGION_LABELS = {
  catholic: "カトリック", protestant: "プロテスタント", anglican: "聖公会",
  buddhist: "仏教", non_religious: "無宗教", unknown: "不明", other: "その他"
};

let SCHOOL_REPORTS = {};

async function loadReportData() {
  if (Object.keys(SCHOOL_REPORTS).length > 0) return;
  const res = await fetch("../data/school_reports.json");
  SCHOOL_REPORTS = await res.json();
}

function buildReport(school) {
  const reportData = SCHOOL_REPORTS[school.id] || {philosophies:{}, testimonials:{}, testimonial_counts:{}, stats:[], alumni:[]};
  const culture = school.culture_profile || {};
  const fitsForSchool = FITS.filter(f => f.school_id === school.id);
  const eraFitsForSchool = ERA_FITS.filter(f => f.school_id === school.id);
  const pathsForSchool = PATHS.filter(p => p.school_id === school.id);

  const tagline = generateTagline(school, reportData);

  return `
<div class="bm-report">

<div class="lead">${buildLead(school, reportData, fitsForSchool)}</div>

${buildMetaTable(school, reportData)}

<h3>1. 学校の輪郭 — ${school.prefecture||""}${school.city||""}に立つ${characterizeSchool(school, culture)}</h3>
${buildOutlineSection(school, reportData)}

<h3>2. 建学の精神と教育設計</h3>
${buildPhilosophySection(reportData.philosophies || {})}

<h3>3. 校長・教員の言葉</h3>
${buildTestimonialsBlock(reportData.testimonials || {}, ["principal","chairperson","teacher"])}

<h3>4. 在校生・卒業生の声</h3>
${buildTestimonialsBlock(reportData.testimonials || {}, ["student_current","student_alumni"])}

<h3>5. 保護者と取材記者の視点</h3>
${buildTestimonialsBlock(reportData.testimonials || {}, ["parent"])}
${buildParentNotice(reportData.testimonial_counts || {})}

<h3>6. 学校文化プロファイル — 10次元の構造</h3>
${buildCultureSection(culture)}

<h3>7. 進学実績・公式統計</h3>
${buildStatsSection(reportData.stats || [], reportData.alumni || [])}

<h3>8. 時代適合性 — 9時代の能力地形との関係</h3>
${buildEraSection(eraFitsForSchool)}

<h3>9. 人格類型との相性 — 10アーキタイプ別フィット分析</h3>
${buildArchetypeSection(fitsForSchool)}

<h3>10. 想定される活躍経路</h3>
${buildPathsSection(pathsForSchool)}

<h3>11. ネガティブ・批判的視点 — 知っておきたい影の側面</h3>
${buildCriticalSection(reportData.testimonials || {})}

<h3>12. 元データ量と感情分布</h3>
${buildSentimentSection(reportData.testimonial_counts || {})}

<h3>13. 合うお子さん・慎重に検討すべきお子さん</h3>
${buildFitGuidanceSection(school, fitsForSchool)}

<h3>14. 第一志望校として向き合う際の判断軸</h3>
${buildDecisionSection(school, fitsForSchool, eraFitsForSchool)}

<div class="summary-box">
<h3>本章のまとめ</h3>
${buildConclusionBox(school, fitsForSchool, eraFitsForSchool)}
</div>

</div>`;
}

function buildLead(school, reportData, fits) {
  const directFits = fits.filter(f => f.fit_type === "direct_fit").map(f => ARCHETYPE_NAMES[f.archetype_id]).filter(Boolean);
  const archLabel = school.archetype_label || "";
  const tCount = Object.values(reportData.testimonial_counts || {}).reduce((a,b)=>a+b, 0);
  return `<p>${school.school_name}（${school.prefecture||""}${school.city||""}）について、本稿は校長の言葉、教員の指導姿勢、在校生・卒業生・保護者の声、口コミの評価まで、肯定面と批判面を等しく拾い上げ、第一志望としての判断軸を立てる材料を整理しました。${tCount > 0 ? `本校に関するJPMS-DB登録の関係者発言は${tCount.toLocaleString()}件におよびます。` : ""}${archLabel ? `本校は「${archLabel}」と位置づけられ、` : ""}${directFits.length > 0 ? `${directFits.slice(0,3).join("・")}の人格類型と直接的な適合性が高い校風を持ちます。` : "多様な人格類型に対して相性のバリエーションを持つ校風です。"}本稿を読む際は「序列」ではなく「相性」のフレームで眺めてください。最終判断はご家庭の対話で。</p>`;
}

function buildMetaTable(school, reportData) {
  const philosophies = reportData.philosophies || {};
  const founding = philosophies.founding_philosophy?.[0]?.summary || philosophies.education_principle?.[0]?.summary || "";
  const stats = reportData.stats || [];
  const recentYear = Math.max(0, ...stats.map(s => s.year || 0));
  const enrollment = stats.find(s => s.year === recentYear && (s.name||"").includes("生徒数"))?.value;

  return `<table class="meta-table">
<caption>基本情報</caption>
<tbody>
<tr><th>所在地</th><td>${school.prefecture || ""}${school.city ? "／"+school.city : ""}${school.homepage_url ? `（<a href="${school.homepage_url}" target="_blank">公式HP</a>）` : ""}</td></tr>
<tr><th>創立</th><td>${school.establishment_year ? school.establishment_year + "年" : "—"}</td></tr>
<tr><th>校種</th><td>${GENDER_LABELS[school.gender_type] || "—"}・${INTEGRATED_LABELS[school.integrated_type] || ""}</td></tr>
<tr><th>宗教</th><td>${RELIGION_LABELS[school.religion] || "—"}</td></tr>
<tr><th>建学の精神</th><td>${escapeHtml(founding.slice(0, 200) || "（未収録）")}${founding.length > 200 ? "…" : ""}</td></tr>
${enrollment ? `<tr><th>生徒数（${recentYear}）</th><td>${enrollment} 名</td></tr>` : ""}
<tr><th>JPMS分類</th><td>${school.archetype_label || "—"} ／ LCAクラス：${school.lca_class || "—"}</td></tr>
<tr><th>主要成果クラスタ</th><td>${school.primary_outcome_cluster || "—"}</td></tr>
<tr><th>JPMSデータ完全性</th><td>${school.data_completeness || 0}/100</td></tr>
</tbody>
</table>`;
}

function buildOutlineSection(school, reportData) {
  const philos = reportData.philosophies || {};
  const founding = philos.founding_philosophy?.[0]?.text_full || philos.founding_philosophy?.[0]?.summary || philos.education_principle?.[0]?.text_full || philos.education_principle?.[0]?.summary || "";
  const aboutText = philos.extracted_about?.[0]?.text_full || philos.extracted_about?.[0]?.summary || "";

  let html = "";
  if (founding) {
    html += `<p>${escapeHtml(founding.slice(0, 600))}</p>`;
  } else if (aboutText) {
    html += `<p>${escapeHtml(aboutText.slice(0, 600))}</p>`;
  } else {
    html += `<p>${school.school_name}は${school.prefecture||""}${school.city||""}に位置する${GENDER_LABELS[school.gender_type]||""}${INTEGRATED_LABELS[school.integrated_type]||""}で、${school.establishment_year||"——"}年に創立されました。${school.religion && school.religion !== "non_religious" ? RELIGION_LABELS[school.religion] + "系の教育機関として、" : ""}独自の教育文化を育んできた学校です。</p>`;
  }

  // 校風の特徴を文章化
  const culture = school.culture_profile || {};
  const traits = [];
  if (culture.academic_rigor >= 70) traits.push("学問的な厳密性が高く");
  if (culture.discipline >= 70) traits.push("規律ある学校生活が重視され");
  if (culture.freedom >= 70) traits.push("自由度の高い校風で");
  if (culture.creativity >= 70) traits.push("創造性を重んじ");
  if (culture.cooperation >= 70) traits.push("共同体性が強く");
  if (culture.diversity >= 70) traits.push("多様性を受容し");
  if (culture.internationality >= 70) traits.push("国際性に富み");

  if (traits.length > 0) {
    html += `<p>JPMS-DBの校風スコア分析では、${traits.join("、")}という特徴が現れています。これらは${school.school_name}に集まる関係者の発言群から構造抽出したもので、表面的な校訓だけでは見えにくい「実態としての校風」を示します。</p>`;
  }

  return html;
}

function buildPhilosophySection(philosophies) {
  const types = ["founding_philosophy","education_principle","extracted_philosophy","extracted_principal"];
  let html = "";
  for (const t of types) {
    const items = philosophies[t] || [];
    for (const item of items.slice(0, 2)) {
      if (item.text_full || item.summary) {
        html += `<p>${escapeHtml((item.text_full || item.summary || "").slice(0, 500))}</p>`;
      }
    }
  }
  if (!html) {
    html = `<p>本校の建学の精神・教育設計に関する詳細データは現時点でJPMS-DBに収録されていません。学校公式HPや学校説明会資料を直接ご確認ください。</p>`;
  }
  return html;
}

function buildTestimonialsBlock(testimonials, roles) {
  const items = [];
  for (const role of roles) {
    const list = testimonials[role] || [];
    list.slice(0, 4).forEach(t => items.push({...t, role}));
  }
  if (items.length === 0) {
    return `<p>${roles.map(r=>ROLE_LABELS[r]||r).join("・")}の発言データはJPMS-DBに収録されていません。学校説明会・授業見学で直接お聞きいただくことをお勧めします。</p>`;
  }
  return items.map(t => {
    const speaker = ROLE_LABELS[t.role] || t.role;
    const attr = t.attribute ? `／${t.attribute}` : "";
    const ctx = t.context ? `／${t.context}` : "";
    return `<blockquote>
${escapeHtml(t.quote)}
<span class="who">— ${speaker}${attr}${ctx}</span>
</blockquote>`;
  }).join("\n");
}

function buildParentNotice(counts) {
  const total = Object.values(counts).reduce((a,b)=>a+b, 0);
  if (total === 0) return "";
  return `<p>本校に関する関係者発言は計${total.toLocaleString()}件がJPMS-DBに収録されています（校長 ${counts.principal||0}件 ／ 教員 ${counts.teacher||0}件 ／ 在校生 ${counts.student_current||0}件 ／ 卒業生 ${counts.student_alumni||0}件 ／ 保護者 ${counts.parent||0}件）。これらは公式HP・取材記事・SNS等から収集されたもので、JPMSの倫理レビューを通過したもののみを掲載しています。</p>`;
}

function buildCultureSection(culture) {
  const dims = [
    {key:"academic_rigor", label:"学問的厳密性", desc:"知的負荷の高さ"},
    {key:"discipline", label:"規律", desc:"生活規範の厳格さ"},
    {key:"freedom", label:"自由度", desc:"自主性の重視"},
    {key:"creativity", label:"創造性", desc:"創造活動の比重"},
    {key:"cooperation", label:"共同体性", desc:"集団凝集性"},
    {key:"competition", label:"競争性", desc:"比較・競争の強度"},
    {key:"diversity", label:"多様性", desc:"異質性受容"},
    {key:"internationality", label:"国際性", desc:"グローバル志向"},
    {key:"mentor", label:"メンター密度", desc:"教員との距離感"},
    {key:"spirituality", label:"精神性", desc:"宗教・精神文化の比重"}
  ];
  let html = `<table class="compare-table"><thead><tr><th>次元</th><th>スコア</th><th>意味</th></tr></thead><tbody>`;
  for (const d of dims) {
    const v = culture[d.key];
    const display = v !== undefined ? Math.round(v) : "—";
    const level = v >= 70 ? "高" : v >= 50 ? "中" : v !== undefined ? "低" : "—";
    html += `<tr><td>${d.label}</td><td><strong>${display}</strong> （${level}）</td><td>${d.desc}</td></tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

function buildStatsSection(stats, alumni) {
  let html = "";
  if (stats.length > 0) {
    const recent = stats.sort((a,b)=>(b.year||0)-(a.year||0)).slice(0, 8);
    html += `<p>JPMS-DBに収録されている本校の公式統計（${stats.length}件、最新${recent[0]?.year || "—"}年度）：</p>`;
    html += `<table class="compare-table"><thead><tr><th>年度</th><th>項目</th><th>値</th><th>出典</th></tr></thead><tbody>`;
    recent.forEach(s => {
      html += `<tr><td>${s.year||""}</td><td>${escapeHtml(s.name||"")}</td><td>${s.value!==null?s.value:"—"}${s.unit||""}</td><td><small>${s.source||""}</small></td></tr>`;
    });
    html += `</tbody></table>`;
  }
  if (alumni.length > 0) {
    const fields = {};
    alumni.forEach(a => { fields[a.field || "その他"] = (fields[a.field || "その他"] || 0) + 1; });
    const top = Object.entries(fields).sort((a,b)=>b[1]-a[1]).slice(0, 8);
    html += `<p>卒業生キャリアデータ（${alumni.length}件、複数のミラツク統合DBから連携）：</p><p>${top.map(([f,n])=>`<span class="academic-link">${escapeHtml(f)}：${n}件</span>`).join(" ")}</p>`;
  }
  if (!html) {
    html = `<p>進学実績・公式統計のデータはJPMS-DBに本校では未収録です。学校公式の進学実績資料・大学合格実績一覧をご確認ください。</p>`;
  }
  return html;
}

function buildEraSection(eraFits) {
  if (eraFits.length === 0) return `<p>時代適合性データなし</p>`;
  const eras = ["meiji","taisho","showa_pre","showa_post","heisei","reiwa","future_2030","future_2050","future_2100"];
  let html = `<p>本校の校風が、明治から令和、2030年代以降の能力地形と各時代でどの程度適合するかを示します。fit_score は0.30-0.85の範囲で、0.65以上を高適合、0.55以上を中適合、それ未満を低適合とします。</p>`;
  html += `<table class="compare-table"><thead><tr>`;
  eras.forEach(e => html += `<th>${ERA_LABELS[e]}</th>`);
  html += `</tr></thead><tbody><tr>`;
  eras.forEach(e => {
    const f = eraFits.find(x => x.era_id === e);
    html += `<td>${f ? f.fit_score.toFixed(2) : "—"}</td>`;
  });
  html += `</tr></tbody></table>`;
  const sorted = [...eraFits].sort((a,b)=>b.fit_score-a.fit_score);
  const top = sorted[0];
  const future = eraFits.filter(f=>f.era_id.startsWith("future_")).sort((a,b)=>b.fit_score-a.fit_score)[0];
  html += `<p>最も高適合の時代は<strong>${ERA_LABELS[top.era_id]}</strong>（fit ${top.fit_score.toFixed(2)}）です。${top.rationale ? escapeHtml(top.rationale) : "本校の教育方針が当該時代の能力像と高い親和性を持ちます。"}${future ? `未来時代では<strong>${ERA_LABELS[future.era_id]}</strong>が最も高い適合（fit ${future.fit_score.toFixed(2)}）を示しており、${future.rationale ? escapeHtml(future.rationale) : "本校の校風が将来も価値を持つ可能性を示唆します。"}` : ""}</p>`;
  return html;
}

function buildArchetypeSection(fits) {
  if (fits.length === 0) return `<p>人格適合データなし</p>`;
  const sorted = [...fits].sort((a,b)=>b.fit_score-a.fit_score);
  let html = `<table class="compare-table"><thead><tr><th>人格類型</th><th>fit</th><th>分類</th><th>根拠</th></tr></thead><tbody>`;
  sorted.forEach(f => {
    const name = ARCHETYPE_NAMES[f.archetype_id] || f.archetype_id;
    html += `<tr><td><strong>${name}</strong></td><td>${f.fit_score.toFixed(2)}</td><td>${f.fit_type}</td><td>${escapeHtml((f.rationale || "").slice(0, 120))}</td></tr>`;
  });
  html += `</tbody></table>`;
  const direct = sorted.filter(f => f.fit_type === "direct_fit").slice(0, 3);
  const stretch = sorted.filter(f => f.fit_type === "stretch_fit").slice(0, 3);
  if (direct.length > 0) {
    html += `<p><strong>direct_fit（基本適合の高い類型）</strong>：${direct.map(f=>ARCHETYPE_NAMES[f.archetype_id]).join("・")}。これらの類型は本校の文化と直接的な親和性を持ち、入学後の適応がスムーズに進む可能性が高いと推定されます。${direct[0].risks ? `ただしリスクとして「${escapeHtml(direct[0].risks)}」があり、過剰適合の可能性も視野に入れる必要があります。` : ""}</p>`;
  }
  if (stretch.length > 0) {
    html += `<p><strong>stretch_fit（発達的チャレンジが期待できる類型）</strong>：${stretch.map(f=>ARCHETYPE_NAMES[f.archetype_id]).join("・")}。基本的な適合性に加えて、発達的なチャレンジが期待できる類型です。重要なのは、stretch_fit が direct_fit より「劣る」のではなく、むしろ発達的な意義が大きい場合があるという点です。</p>`;
  }
  return html;
}

function buildPathsSection(paths) {
  if (paths.length === 0) {
    return `<p>本校についての具体的な活躍経路予測データは、PST-DBの60校サンプルに含まれていないため自動生成されません。第3章「校長・教員の言葉」と第7章「進学実績・公式統計」を踏まえ、ご家庭で想定される進路を考えてください。第二段階「人格適合レポート」では、お子様の人格情報を踏まえた個別の活躍経路予測をAIで生成できます。</p>`;
  }
  return paths.map(p => {
    const archName = ARCHETYPE_NAMES[p.archetype_id] || p.archetype_id;
    let careers = parseJSON(p.likely_career_domains, []);
    let outcomes = parseJSON(p.estimated_outcomes, {});
    let conf = parseJSON(p.confidence_interval, {});
    let scenarios = parseJSON(p.scenario_breakdown, {});
    return `<blockquote>
<strong>${archName}型の活躍経路</strong><br>
想定キャリア領域：${Array.isArray(careers) ? careers.join("、") : careers}<br>
${escapeHtml(p.rationale || "")}<br>
<small>信頼区間：${conf.lower?.toFixed(2)||"—"} 〜 ${conf.upper?.toFixed(2)||"—"} ／
シナリオ別：${Object.entries(scenarios).map(([k,v])=>`${k}=${(v*100).toFixed(0)}%`).join(" / ")}</small>
<span class="who">— PST-DB予測モデル（確率的・条件付き）</span>
</blockquote>`;
  }).join("");
}

function buildCriticalSection(testimonials) {
  // Look for testimonials with critical/negative tone (heuristic: search for negative keywords)
  const negKeywords = ["問題","課題","改善","批判","不満","厳しい","つらい","負担","プレッシャー","合わな","ストレス","不安"];
  const allTestimonials = [];
  Object.entries(testimonials).forEach(([role, list]) => {
    list.forEach(t => allTestimonials.push({...t, role}));
  });
  const negs = allTestimonials.filter(t => negKeywords.some(k => (t.quote||"").includes(k))).slice(0, 4);
  if (negs.length === 0) {
    return `<p>JPMS-DBに登録された関係者発言の中で、明示的に批判的・課題提起的な内容を抽出した結果、該当するものは現時点で見当たりませんでした。これは本校に課題が無いという意味ではなく、データ収集ソース（公式HP・取材記事中心）の性質上、批判的な声が記録に残りにくいバイアスがあることを示唆します。学校選びの際は、口コミサイト・SNS・卒業生個別の声も併せてご確認ください。</p>`;
  }
  let html = `<p>完全に肯定的な情報だけが並ぶレポートは、結果的に親御さんの判断を誤らせます。以下、JPMS-DBから批判的・課題提起的な視点を含む発言を抜粋します。これらは特定の学校を批判する意図ではなく、「合わない子もいる」「改善の余地もある」という現実をご家庭の判断材料に変えるためのものです。</p>`;
  html += negs.map(t => `<blockquote>
${escapeHtml(t.quote)}
<span class="who">— ${ROLE_LABELS[t.role]||t.role}${t.attribute?"／"+t.attribute:""}</span>
</blockquote>`).join("");
  html += `<p>これらの指摘を読んで「この学校はだめだ」と即断するのではなく、「うちの子の場合はどうだろうか」と立ち止まって考える材料としてお使いください。</p>`;
  return html;
}

function buildSentimentSection(counts) {
  const total = Object.values(counts).reduce((a,b)=>a+b, 0);
  if (total === 0) return `<p>本校に関する関係者発言データはJPMS-DBに登録されていません。</p>`;
  let html = `<table class="sentiment-table"><thead><tr><th>役割</th><th>件数</th><th>比率</th></tr></thead><tbody>`;
  const order = ["principal","chairperson","teacher","student_current","student_alumni","parent"];
  order.forEach(role => {
    const n = counts[role] || 0;
    if (n > 0) {
      html += `<tr><td>${ROLE_LABELS[role]||role}</td><td>${n.toLocaleString()}</td><td>${(n*100/total).toFixed(1)}%</td></tr>`;
    }
  });
  html += `<tr><td><strong>合計</strong></td><td><strong>${total.toLocaleString()}</strong></td><td>100%</td></tr></tbody></table>`;
  html += `<p>JPMSは公式HP・取材記事・公開SNSなど合法的なソースからのみ発言を収集し、未成年（在校生・卒業生・保護者）については匿名化処理を適用しています。本データは学校選択の参考情報であり、個別の生徒・保護者を特定する用途には使用できません。</p>`;
  return html;
}

function buildFitGuidanceSection(school, fits) {
  const direct = fits.filter(f => f.fit_type === "direct_fit").map(f=>ARCHETYPE_NAMES[f.archetype_id]);
  const poor = fits.filter(f => f.fit_type === "poor_fit").map(f=>ARCHETYPE_NAMES[f.archetype_id]);
  const stretch = fits.filter(f => f.fit_type === "stretch_fit").map(f=>ARCHETYPE_NAMES[f.archetype_id]);

  let html = `<p><strong>合うお子さん（direct_fit型）</strong>：${direct.length > 0 ? direct.join("、") + "の傾向を持つお子さん" : "明示的なdirect_fit類型は検出されませんでした"}。これらの類型は本校の文化と基本的に親和性があり、入学後の生活に馴染みやすい可能性が高いと推定されます。</p>`;
  if (stretch.length > 0) {
    html += `<p><strong>発達的なチャレンジが期待できるお子さん（stretch_fit型）</strong>：${stretch.slice(0,5).join("、")}など。基本的な適合に加えて、本校の校風がお子さんを発達的に伸ばす環境となる可能性があります。</p>`;
  }
  if (poor.length > 0) {
    html += `<p><strong>慎重に検討すべきお子さん（poor_fit型）</strong>：${poor.join("、")}の傾向が強いお子さん。本校の校風と構造的なミスマッチがある可能性があるため、進学を検討される場合は学校訪問・授業見学を通じて慎重にご確認ください。ただしこれは「合わない」と断定するものではなく、「相性に注意」という意味合いです。</p>`;
  }
  html += `<p>これらの相性判定は、本校とJPMS person_archetype 10類型の心理学的閾値マッチングに基づくもので、お子さん個別のBig Five-J値・Holland Codeを「子どもの特徴を入力」ステップで具体化することで、より精度の高い適合分析が可能になります。</p>`;
  return html;
}

function buildDecisionSection(school, fits, eraFits) {
  const archLabel = school.archetype_label || "";
  const directCount = fits.filter(f => f.fit_type === "direct_fit").length;
  const topEra = [...eraFits].sort((a,b)=>b.fit_score-a.fit_score)[0];

  return `<p>${school.school_name}を第一志望として位置づける場合、以下の判断軸を整理してください。</p>
<p><strong>軸1：校風との相性</strong>。本校は10アーキタイプのうち${directCount}類型と direct_fit を示します。お子さんがどの類型に近いか、Big Five-J 値で確認することをお勧めします。</p>
<p><strong>軸2：時代適合性</strong>。${topEra ? `本校は${ERA_LABELS[topEra.era_id]}の能力地形に最も適合（fit ${topEra.fit_score.toFixed(2)}）しています。` : ""}お子さんが活躍する2030〜2050年代の能力地形にも適合するかを、未来時代の fit_score で確認してください。</p>
<p><strong>軸3：建学の精神への共感</strong>。本校の建学の精神・教育理念に、ご家庭として共感できるかを確認してください。校風は形式的な校訓ではなく、日々の生活規範として機能します。</p>
<p><strong>軸4：実体験の確認</strong>。本レポートは関係者発言・統計データに基づく分析ですが、最終的な判断はご家庭で、文化祭・体育祭・学校説明会・授業見学に親子で足を運び、空気感を確認してください。</p>
<p><strong>軸5：複数候補との比較</strong>。第一志望以外の学校の章を読むことは、「なぜ我が家はこの学校なのか」を逆照射する作業です。比較によって初めて見えてくる「うちの子に必要なもの／必要でないもの」の輪郭があります。</p>`;
}

function buildConclusionBox(school, fits, eraFits) {
  const directFits = fits.filter(f=>f.fit_type==="direct_fit").map(f=>ARCHETYPE_NAMES[f.archetype_id]);
  const topEra = [...eraFits].sort((a,b)=>b.fit_score-a.fit_score)[0];
  return `<p>${school.school_name}は、${directFits.length > 0 ? directFits.slice(0,3).join("・") + "型のお子さんと基本的な適合性を示し" : "多様な類型に対して相性のバリエーションを持ち"}、${topEra ? `${ERA_LABELS[topEra.era_id]}の能力地形に最も親和的（fit ${topEra.fit_score.toFixed(2)}）` : ""}な学校です。本校への進学を検討される際は、お子さんの人格特性・ご家庭の教育観・実際の学校体験の3点を統合的に判断してください。</p>
<p>本レポートは「序列付け」ではなく「相性のマップ」として設計されています。第二段階「子どもの特徴を入力」では、お子様個別の人格情報をAIに入力することで、本校との人格適合性をさらに具体化したレポートを追加生成できます。</p>`;
}

// ===== utilities =====
function parseJSON(s, fallback) { try { return JSON.parse(s||"null") || fallback; } catch(e) { return fallback; } }
function escapeHtml(s) { return (s||"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

function characterizeSchool(school, culture) {
  if (school.religion === "catholic") return "カトリック系の伝統校";
  if (school.religion === "protestant" || school.religion === "anglican") return "プロテスタント系のミッションスクール";
  if (school.religion === "buddhist") return "仏教系の校風を持つ学校";
  if (school.integrated_type === "attached") return "大学付属の伝統校";
  if (culture.academic_rigor >= 75) return "学問厳密性の高い進学校";
  if (culture.creativity >= 75) return "創造性を重んじる校風";
  if (culture.freedom >= 75) return "自由度の高い校風";
  return "独自の校風を持つ学校";
}

function generateTagline(school, reportData) {
  const founding = reportData.philosophies?.founding_philosophy?.[0]?.summary || "";
  if (founding) {
    const words = founding.match(/[「『]([^」』]{2,15})[」』]/);
    if (words) return words[1];
  }
  return school.archetype_label || "";
}
