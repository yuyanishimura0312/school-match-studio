#!/usr/bin/env python3
"""School Match Studio: 全551校データ生成
JPMS-DB から全校情報を取得、PST-DBの60校分は既存データ使用、残り491校はLCA+culture_scoreから動的に推定"""
import sqlite3
import json
from pathlib import Path
from collections import defaultdict

JPMS = Path.home() / "projects/research/jpms-db/v2/jpms_v2.db"
PST = Path.home() / "projects/research/persona-school-trajectory-db/data/pst.db"
OUT = Path.home() / "projects/apps/school-match-studio/data"

jpms = sqlite3.connect(JPMS)
pst = sqlite3.connect(PST)

# ===== 1. schools.json (全551校) =====
schools_rows = jpms.execute("""
    SELECT s.id, s.name_ja, s.name_kana, s.location_pref, s.location_city,
           s.gender_type, s.integrated_type, s.religious_affiliation,
           s.establishment_year, s.archetype_label, s.primary_outcome_cluster,
           s.notes, s.homepage_url, s.data_completeness_v2,
           t.typology_class, t.posterior_prob
    FROM schools_v2 s
    LEFT JOIN school_typology_lca t ON s.id = t.school_id
""").fetchall()

# 各校の culture_score を集計（10次元）
culture_lookup = defaultdict(dict)
for school_id, dim_id, score in jpms.execute(
    "SELECT school_id, culture_dim_id, score FROM school_culture_score"
).fetchall():
    culture_lookup[school_id][dim_id] = score

# 哲学summaryを取得
philosophy_lookup = {}
for r in jpms.execute("SELECT school_id, COALESCE(text_summary, substr(text_full, 1, 400)) FROM school_philosophy_v2 WHERE text_full IS NOT NULL").fetchall():
    if r[0] not in philosophy_lookup:
        philosophy_lookup[r[0]] = r[1]

# PST-DB の既存60校マッピング（school_id 文字列ベースで突合）
pst_school_map = {}
for r in pst.execute("SELECT id, jpms_school_id, school_name FROM schools_pst").fetchall():
    if r[1]: pst_school_map[r[1]] = r[0]
    # 名前ベース突合のためのバックアップ
    pst_school_map[r[2]] = r[0]

schools = []
for r in schools_rows:
    sid, name_ja, name_kana, pref, city, gender, integrated, religion, est_year, arch_label, primary_oc, notes, hp, completeness, lca_class, lca_prob = r
    culture = culture_lookup.get(sid, {})
    # culture profile dictを生成
    culture_profile = {
        "discipline": culture.get("cult_structure", 50),
        "competition": culture.get("cult_competition", 50),
        "freedom": culture.get("cult_autonomy", 50),
        "cooperation": culture.get("cult_community", 50),
        "academic_rigor": culture.get("cult_intensity", 50),
        "diversity": culture.get("cult_diversity", 50),
        "creativity": culture.get("cult_creativity", 50),
        "mentor": culture.get("cult_mentor", 50),
        "spirituality": culture.get("cult_spirituality", 50),
        "internationality": culture.get("cult_internationality", 50),
    }
    schools.append({
        "id": sid,
        "school_name": name_ja,
        "name_kana": name_kana,
        "prefecture": pref,
        "city": city,
        "gender_type": gender,
        "integrated_type": integrated,
        "religion": religion,
        "establishment_year": est_year,
        "lca_class": lca_class or "class_unknown",
        "lca_prob": lca_prob or 0,
        "culture_profile": culture_profile,
        "philosophy_summary": philosophy_lookup.get(sid, "") or notes or "",
        "homepage_url": hp,
        "data_completeness": completeness,
        "primary_outcome_cluster": primary_oc,
        "archetype_label": arch_label,
        "pst_school_id": pst_school_map.get(sid) or pst_school_map.get(name_ja),  # PST-DB 連携ID
    })

json.dump(schools, open(OUT/"schools.json","w"), ensure_ascii=False, indent=2)
print(f"schools.json: {len(schools)} 校")

# ===== 2. school_archetype_fit.json (全551校に拡張) =====
# 既存PST-DB 60校 + 残り491校はculture_profile×archetype閾値から動的推定
existing_fits = []
for r in pst.execute("SELECT school_id, archetype_id, fit_score, fit_type, psychological_rationale, risks FROM school_archetype_fit").fetchall():
    existing_fits.append({"pst_school_id":r[0],"archetype_id":r[1],"fit_score":r[2],"fit_type":r[3],"rationale":r[4],"risks":r[5]})

# pst_school_id → jpms_school_id mapping
pst_id_to_jpms = {}
for r in pst.execute("SELECT id, jpms_school_id FROM schools_pst").fetchall():
    if r[1]: pst_id_to_jpms[r[0]] = r[1]

# 既存fitsをjpms_idベースに変換
fits_by_jpms = []
for f in existing_fits:
    jid = pst_id_to_jpms.get(f["pst_school_id"])
    if jid:
        fits_by_jpms.append({
            "school_id": jid, "archetype_id": f["archetype_id"],
            "fit_score": f["fit_score"], "fit_type": f["fit_type"],
            "rationale": f["rationale"], "risks": f["risks"],
            "source": "pst_explicit"
        })

# 残り491校を動的推定（culture_profile + archetype閾値ルール）
covered = {f["school_id"] for f in fits_by_jpms}
ARCHETYPE_RULES = {
    "arch_explorer":         {"academic_rigor":(60,100), "freedom":(50,100), "competition":(0,80)},
    "arch_creator":          {"creativity":(60,100), "freedom":(60,100), "diversity":(50,100)},
    "arch_leader":           {"competition":(50,100), "discipline":(50,90), "mentor":(50,100)},
    "arch_caregiver":        {"cooperation":(60,100), "spirituality":(40,100), "diversity":(40,100)},
    "arch_warrior":          {"competition":(60,100), "discipline":(60,90), "academic_rigor":(50,100)},
    "arch_mediator":         {"cooperation":(60,100), "diversity":(60,100), "internationality":(50,100)},
    "arch_craftsman":        {"academic_rigor":(60,100), "discipline":(50,90), "creativity":(30,70)},
    "arch_introvert_thinker":{"academic_rigor":(60,100), "freedom":(40,90), "competition":(0,60)},
    "arch_social_creator":   {"creativity":(60,100), "diversity":(60,100), "internationality":(40,100)},
    "arch_steady":           {"discipline":(60,100), "cooperation":(50,100), "competition":(0,70)},
}

def estimate_fit(culture, rules):
    """各能力次元が範囲内に収まる程度をスコア化"""
    score_components = []
    for dim, (lo, hi) in rules.items():
        v = culture.get(dim, 50)
        if lo <= v <= hi:
            # 範囲内の中央に近いほど高スコア
            mid = (lo + hi) / 2
            distance = abs(v - mid)
            range_half = (hi - lo) / 2 or 1
            score = 1 - (distance / range_half) * 0.3  # 0.7-1.0
        else:
            # 範囲外
            distance = min(abs(v - lo), abs(v - hi))
            score = max(0.3, 1 - distance / 50)
        score_components.append(score)
    base = sum(score_components) / len(score_components)
    # 0.30-0.85 範囲にクリップ
    return max(0.30, min(0.85, base * 0.85))

estimated_fits = []
school_lookup = {s["id"]: s for s in schools}
for sid, school_data in school_lookup.items():
    if sid in covered: continue
    culture = school_data["culture_profile"]
    for arch_id, rules in ARCHETYPE_RULES.items():
        score = estimate_fit(culture, rules)
        fit_type = "direct_fit" if score >= 0.70 else ("stretch_fit" if score >= 0.50 else "poor_fit")
        # 簡易 rationale
        high_dims = [d for d,(lo,hi) in rules.items() if lo <= culture.get(d,50) <= hi]
        rationale = f"{school_data['school_name']}の文化次元（{', '.join(high_dims[:3])}）が{arch_id}の閾値範囲と{fit_type}的に整合"
        estimated_fits.append({
            "school_id": sid, "archetype_id": arch_id,
            "fit_score": round(score, 3), "fit_type": fit_type,
            "rationale": rationale, "risks": None,
            "source": "estimated_from_culture"
        })

all_fits = fits_by_jpms + estimated_fits
json.dump(all_fits, open(OUT/"school_archetype_fit.json","w"), ensure_ascii=False, indent=2)
print(f"school_archetype_fit.json: {len(all_fits)} 件 ({len(fits_by_jpms)} explicit + {len(estimated_fits)} estimated)")

# ===== 3. school_era_fit.json (全551校に拡張) =====
era_fits_existing = []
for r in pst.execute("SELECT school_id, era_id, fit_score, matched_capabilities, rationale_ja FROM school_era_fit").fetchall():
    jid = pst_id_to_jpms.get(r[0])
    if jid:
        era_fits_existing.append({"school_id":jid,"era_id":r[1],"fit_score":r[2],
                                   "matched_capabilities":r[3],"rationale":r[4],"source":"pst_explicit"})

# 残り491校を時代ごとに culture_profile から推定
ERAS_RULES = {
    "meiji":       {"discipline":1.0, "academic_rigor":1.0, "competition":0.5},
    "taisho":      {"creativity":1.0, "freedom":1.0, "diversity":0.7},
    "showa_pre":   {"discipline":1.0, "cooperation":0.8, "spirituality":0.5},
    "showa_post":  {"cooperation":1.0, "discipline":0.7, "competition":0.5},
    "heisei":      {"academic_rigor":1.0, "freedom":0.8, "creativity":0.7},
    "reiwa":       {"creativity":1.0, "diversity":1.0, "internationality":1.0, "freedom":0.7},
    "future_2030": {"creativity":1.0, "internationality":1.0, "freedom":0.8, "academic_rigor":0.7},
    "future_2050": {"diversity":1.0, "cooperation":0.9, "spirituality":0.7, "creativity":0.7},
    "future_2100": {"creativity":1.0, "spirituality":0.9, "diversity":0.9, "freedom":0.7},
}

covered_era = {(f["school_id"], f["era_id"]) for f in era_fits_existing}
estimated_era = []
for sid, school_data in school_lookup.items():
    culture = school_data["culture_profile"]
    for era_id, weights in ERAS_RULES.items():
        if (sid, era_id) in covered_era: continue
        # weighted average
        total_w = sum(weights.values())
        weighted_score = sum(culture.get(dim, 50) * w for dim, w in weights.items()) / total_w
        # 0-100 → 0.30-0.85
        normalized = 0.30 + (weighted_score / 100) * 0.55
        normalized = max(0.30, min(0.85, normalized))
        rationale = f"{', '.join(weights.keys())}次元の重み付き平均から推定 (heuristic)"
        estimated_era.append({
            "school_id": sid, "era_id": era_id,
            "fit_score": round(normalized, 3),
            "matched_capabilities": "[]",
            "rationale": rationale, "source": "estimated_from_culture"
        })

all_era_fits = era_fits_existing + estimated_era
json.dump(all_era_fits, open(OUT/"school_era_fit.json","w"), ensure_ascii=False, indent=2)
print(f"school_era_fit.json: {len(all_era_fits)} 件")

# ===== 4. archetypes.json + eminents.json + paths.json は変更なし、コピー =====
print("\n他のJSONファイルは既存維持")

jpms.close()
pst.close()
print(f"\n=== 全551校データ生成完了 ===")
EOF