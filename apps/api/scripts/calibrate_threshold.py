"""§5 threshold calibration: for known-similar (same-theme) and known-dissimilar
(cross-theme) pairs from the seeded corpus, compute the FULL combined score (the same
similarity + intent-complement + tag-overlap + recency + region formula the /search
endpoint filters on — not raw cosine similarity alone, which would let boosts alone
push an irrelevant candidate over threshold). Find the valley between the two
combined-score distributions and recommend a threshold with a safety margin toward the
stricter side (fewer false positives is the safer failure mode for a judged demo).

Run: ./venv/bin/python -m scripts.calibrate_threshold
"""

import asyncio
import itertools
import random

from app.db.mongo import get_db
from app.db.qdrant import get_qdrant_client
from app.config import get_settings
from app.services.ranking import score_candidate
from scripts.seed_demo_corpus import ROWS as ROWS_PHASE4
from scripts.seed_full_corpus import ROWS as ROWS_PHASE5

ROWS = ROWS_PHASE4 + ROWS_PHASE5
random.seed(42)


async def main():
    theme_by_persona = {row[0]: row[5] for row in ROWS}
    db = get_db()
    docs = await db.signals.find({"owner_id": {"$in": list(theme_by_persona)}}).to_list(200)
    if not docs:
        print("No seeded corpus signals found — run scripts.seed_demo_corpus first.")
        return

    settings = get_settings()
    qdrant = get_qdrant_client()
    point_ids = [d["qdrant_point_id"] for d in docs if d.get("qdrant_point_id")]
    points = await qdrant.retrieve(
        collection_name=settings.qdrant_collection, ids=point_ids, with_vectors=True
    )
    vector_by_point_id = {p.id: p.vector for p in points}

    items = []
    for d in docs:
        pid = d.get("qdrant_point_id")
        if pid in vector_by_point_id:
            items.append({
                "theme": theme_by_persona[d["owner_id"]],
                "vector": vector_by_point_id[pid],
                "text": d["raw_text"][:50],
                "intent": d["intent"],
                "tags": d["tags"],
                "created_at": d["created_at"].isoformat(),
                "kind": d["kind"],
                "region_label": d["region_label"],
            })

    print(f"Loaded {len(items)} corpus vectors across {len(set(i['theme'] for i in items))} themes.\n")

    def cosine(a, b):
        return sum(x * y for x, y in zip(a, b))

    def combined_score(query_item, candidate_item):
        similarity = cosine(query_item["vector"], candidate_item["vector"])
        return score_candidate(
            similarity=similarity,
            query_intent=query_item["intent"],
            candidate_intent=candidate_item["intent"],
            query_tags=query_item["tags"],
            candidate_tags=candidate_item["tags"],
            candidate_created_at=candidate_item["created_at"],
            candidate_kind=candidate_item["kind"],
            region_filter=None,
            candidate_region=candidate_item["region_label"],
        )

    same_theme_pairs = []
    cross_theme_pairs = []
    for a, b in itertools.combinations(items, 2):
        (same_theme_pairs if a["theme"] == b["theme"] else cross_theme_pairs).append((a, b))

    random.shuffle(same_theme_pairs)
    random.shuffle(cross_theme_pairs)
    similar_sample = same_theme_pairs[:60]
    dissimilar_sample = cross_theme_pairs[:60]

    # Score both directions (A as query against B, and B as query against A) since the
    # formula isn't symmetric (recency/kind live on the candidate side).
    similar_scores = sorted(
        s for a, b in similar_sample for s in (combined_score(a, b), combined_score(b, a))
    )
    dissimilar_scores = sorted(
        s for a, b in dissimilar_sample for s in (combined_score(a, b), combined_score(b, a))
    )

    print(f"Same-theme (similar) pairs: n={len(similar_scores)}")
    print(f"  min={similar_scores[0]:.4f}  median={similar_scores[len(similar_scores)//2]:.4f}  max={similar_scores[-1]:.4f}")
    print(f"Cross-theme (dissimilar) pairs: n={len(dissimilar_scores)}")
    print(f"  min={dissimilar_scores[0]:.4f}  median={dissimilar_scores[len(dissimilar_scores)//2]:.4f}  max={dissimilar_scores[-1]:.4f}\n")

    labeled = sorted(
        [(s, 1) for s in similar_scores] + [(s, 0) for s in dissimilar_scores]
    )
    best_threshold, best_accuracy = 0.5, 0.0
    for candidate, _ in labeled:
        correct = sum(1 for s, label in labeled if (s >= candidate) == (label == 1))
        accuracy = correct / len(labeled)
        if accuracy >= best_accuracy:
            best_accuracy, best_threshold = accuracy, candidate

    # Err toward the dissimilar-max side, not just the raw accuracy-optimal point —
    # a false "match" is worse than a missed one for a judged demo.
    safe_floor = max(best_threshold, dissimilar_scores[-1])
    margin = 0.03
    recommended = round(safe_floor + margin, 4)

    print(f"Best-separating threshold: {best_threshold:.4f} (accuracy {best_accuracy:.1%})")
    print(f"Dissimilar max: {dissimilar_scores[-1]:.4f}")
    print(f"Recommended threshold (+{margin} safety margin above the stricter of the two): {recommended}")
    print("\nHistogram (0.05 buckets):")
    for lo in [i / 20 for i in range(28)]:
        hi = lo + 0.05
        s_count = sum(1 for s in similar_scores if lo <= s < hi)
        d_count = sum(1 for s in dissimilar_scores if lo <= s < hi)
        marker = " <-- threshold" if lo <= recommended < hi else ""
        print(f"  {lo:.2f}-{hi:.2f}  similar:{'#'*s_count:<20} dissimilar:{'#'*d_count:<20}{marker}")


if __name__ == "__main__":
    asyncio.run(main())
