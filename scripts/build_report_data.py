#!/usr/bin/env python3
"""ベンチマーク準拠のレポート生成用データ構築
各校について philosophy / testimonials by role / official_stats / alumni_career を集約"""
import sqlite3, json
from pathlib import Path
from collections import defaultdict

JPMS = Path.home() / "projects/research/jpms-db/v2/jpms_v2.db"
OUT = Path.home() / "projects/apps/school-match-studio/data"

jpms = sqlite3.connect(JPMS)

active_schools = json.load(open(OUT/"schools.json"))
active_ids = {s["id"] for s in active_schools}

# 1. philosophies (type別、最大3件/type)
philosophies = defaultdict(lambda: defaultdict(list))
for sid, ptype, full, summary in jpms.execute("""
    SELECT school_id, philosophy_type, text_full, COALESCE(text_summary, substr(text_full, 1, 600))
    FROM school_philosophy_v2
""").fetchall():
    if sid in active_ids and len(philosophies[sid][ptype]) < 3:
        philosophies[sid][ptype].append({
            "summary": (summary or "")[:600],
            "text_full": (full or "")[:2000]
        })
print(f"philosophies: {sum(sum(len(p) for p in v.values()) for v in philosophies.values())} 件 / {len(philosophies)} 校")

# 2. testimonials (speaker_role別、最大10件/role)
testimonials = defaultdict(lambda: defaultdict(list))
testimonial_counts = defaultdict(lambda: defaultdict(int))
for sid, role, attr, quote, summary, context in jpms.execute("""
    SELECT school_id, speaker_role, speaker_attribute, quote_text,
           COALESCE(quote_summary, substr(quote_text, 1, 250)), context
    FROM testimonials_v2
    WHERE rights_level IN ('quoted_with_attribution','anonymized_only')
""").fetchall():
    if sid not in active_ids: continue
    testimonial_counts[sid][role] += 1
    if len(testimonials[sid][role]) < 10:
        testimonials[sid][role].append({
            "attribute": attr or "",
            "quote": (quote or "")[:500],
            "summary": summary or "",
            "context": context or ""
        })
print(f"testimonials: {sum(sum(len(rl) for rl in v.values()) for v in testimonials.values())} 件 / {len(testimonials)} 校")

# 3. stats
stats = defaultdict(list)
for sid, year, source, name, value, unit in jpms.execute("""
    SELECT school_id, stat_year, stat_source, stat_name, stat_value, stat_unit
    FROM school_official_stats
""").fetchall():
    if sid in active_ids:
        stats[sid].append({"year":year,"source":source,"name":name,"value":value,"unit":unit})
print(f"stats: {sum(len(v) for v in stats.values())} 件 / {len(stats)} 校")

# 4. alumni
alumni = defaultdict(list)
for sid, field, archetype, level, source_db in jpms.execute("""
    SELECT school_id, career_field, career_archetype_id, achievement_level, source_db_ref
    FROM alumni_career
""").fetchall():
    if sid in active_ids:
        alumni[sid].append({"field":field,"archetype":archetype,"level":level,"source":source_db})
print(f"alumni: {sum(len(v) for v in alumni.values())} 件 / {len(alumni)} 校")

school_reports = {}
for s in active_schools:
    sid = s["id"]
    school_reports[sid] = {
        "philosophies": dict(philosophies.get(sid, {})),
        "testimonials": dict(testimonials.get(sid, {})),
        "testimonial_counts": dict(testimonial_counts.get(sid, {})),
        "stats": stats.get(sid, []),
        "alumni": alumni.get(sid, []),
    }

import os
with open(OUT/"school_reports.json", "w", encoding="utf-8") as f:
    json.dump(school_reports, f, ensure_ascii=False)
size = os.path.getsize(OUT/"school_reports.json")
print(f"\nschool_reports.json: {size/1024/1024:.1f}MB / {len(school_reports)} 校")

sample = school_reports.get("jpms_s_0001", {})
print(f"\n=== 開成 サンプル ===")
print(f"philosophies: {list(sample.get('philosophies', {}).keys())}")
print(f"testimonial roles: {list(sample.get('testimonials', {}).keys())} / counts: {sample.get('testimonial_counts', {})}")
print(f"stats: {len(sample.get('stats', []))} / alumni: {len(sample.get('alumni', []))}")
jpms.close()
