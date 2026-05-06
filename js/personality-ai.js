// School Match Studio - Personality AI inference
// Calls Claude API to analyze personality text and infer Big Five + archetype

const SYSTEM_PROMPT = `あなたは教育心理学の専門家です。保護者が記述した子どもの特徴から、Big Five-J人格尺度（O開放性/C誠実性/E外向性/A協調性/N神経症傾向）と10アーキタイプを推論します。

10アーキタイプ:
- arch_explorer 探究者 (O>75, C>60): 知的好奇心が強く、新領域への探求を好む
- arch_creator 創造者 (O>80, N>55): 内的世界が豊かで創作・表現に向かう
- arch_leader リーダー型 (E>70, C>65, A<60): 対人影響力と達成志向
- arch_caregiver 養育者 (A>75, E>55): 他者ケア志向
- arch_warrior 挑戦者 (E>70, C>70, N<40): 困難に立ち向かう型
- arch_mediator 調停者 (A>75, O>65): 対立調整・価値統合志向
- arch_craftsman 職人型 (C>80, O 40-65): 専門技能の磨き上げ志向
- arch_introvert_thinker 内省思索者 (E<40, O>70, N>55): 内向的な思索・観察志向
- arch_social_creator 社交創造者 (E>70, O>75): 社交性と創造性の両立
- arch_steady 堅実型 (C>70, A>65, N<45): 安定志向の堅実型

回答原則:
1. 単一断定は避け、可能性を複数併記する
2. 「つまりこういう傾向ですか？」と問い返すトーン
3. 子どもの現在の様子は「傾向」であって「決めつけ」ではないことを強調
4. Big Five は0-100の整数、各次元の確信度（low/medium/high）も併記

JSON形式で返答してください:
{
  "summary_question": "つまり〜という傾向の子でしょうか？という問いかけ文（200字程度）",
  "big_five": {"O": 80, "C": 60, "E": 50, "A": 65, "N": 45},
  "big_five_confidence": {"O": "high", "C": "medium", ...},
  "primary_archetype": "arch_explorer",
  "secondary_archetype": "arch_introvert_thinker",
  "primary_confidence": 0.7,
  "rationale": "推論の根拠（300字程度）",
  "alternative_interpretations": ["別の解釈1（150字）", "別の解釈2（150字）"],
  "uncertainty_note": "推論の限界・確信できない点（150字程度）"
}`;

async function analyzePersonality(apiKey, text) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `以下は保護者が記述した子どもの特徴です。Big Five と10アーキタイプを推論してください。\n\n${text}\n\n重要：「決めつけ」ではなく「可能性のある傾向」として推論し、保護者が修正できる余地を残した問いかけトーンで返答してください。`
      }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API エラー (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI応答がJSON形式ではありません");

  return JSON.parse(jsonMatch[0]);
}

async function generatePersonalizedReport(apiKey, school, archetype, bigFive, fits, eminents) {
  const archName = {
    arch_explorer: "探究者", arch_creator: "創造者", arch_leader: "リーダー型",
    arch_caregiver: "養育者", arch_warrior: "挑戦者", arch_mediator: "調停者",
    arch_craftsman: "職人型", arch_introvert_thinker: "内省思索者",
    arch_social_creator: "社交創造者", arch_steady: "堅実型"
  }[archetype] || archetype;

  const fit = fits.find(f => f.school_id === school.id && f.archetype_id === archetype);
  const fitInfo = fit ? `fit_score=${fit.fit_score.toFixed(2)} (${fit.fit_type}), 根拠: ${fit.rationale || ""}` : "適合データ不足";

  const eminentList = (eminents[archetype] || []).slice(0, 5).map(p => `${p.name}(${p.era}・${p.domain})`).join("、");

  const userPrompt = `以下の子どもについて、${school.school_name}との人格適合性を中心とする追加レポートを書いてください。

【子どもの推論プロファイル】
主要アーキタイプ: ${archName}
Big Five: O=${bigFive.O}, C=${bigFive.C}, E=${bigFive.E}, A=${bigFive.A}, N=${bigFive.N}

【学校情報】
${school.school_name} (${school.prefecture || ""})
${school.philosophy_summary || ""}

【人格適合データ】
${fitInfo}

【類型の歴史的代表者】
${eminentList || "データなし"}

レポート構成（合計1500-2000字程度）:
1. ${school.school_name}と${archName}型の相性 (400字)
2. この子の発達における本校のメリット (400字)
3. 注意点・stretch fit的な発達課題 (400字)
4. 想定される活躍経路の例 (400字)
5. 結論：この子にとっての本校の意味 (200-300字)

書き方の原則:
- 「行くべき」ではなく「合いそう」「発達できそう」のトーン
- 確率的・条件付きの表現
- 序列付け禁止
- 偉人を直接モデルにしない、時代差異を明示

HTMLで返してください（h3, h4, p タグを使用、styleなし）。`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{role: "user", content: userPrompt}]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API エラー (${response.status}): ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
