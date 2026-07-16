from datetime import datetime, timedelta, timezone

# Soft complement pairs used only as a ranking boost — never a filter (§5).
INTENT_COMPLEMENTS: dict[str, set[str]] = {
    "need": {"offer"},
    "offer": {"need"},
    "question": {"experience", "offer"},
    "experience": {"question"},
    "goal": {"offer", "experience"},
    "opinion": {"opinion"},
    "moment": {"moment"},
    "other": set(),
}

NOW_LIFETIME = timedelta(hours=24)
OPEN_LIFETIME = timedelta(days=30)


def intent_complements(query_intent: str, candidate_intent: str) -> bool:
    return candidate_intent in INTENT_COMPLEMENTS.get(query_intent, set())


def tag_overlap(query_tags: list[str], candidate_tags: list[str]) -> bool:
    return bool(set(query_tags) & set(candidate_tags))


def recency_boost(created_at: str | None, kind: str) -> float:
    if kind == "PROFILE" or not created_at:
        return 0.0
    lifetime = NOW_LIFETIME if kind == "NOW" else OPEN_LIFETIME
    created = datetime.fromisoformat(created_at)
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    elapsed = datetime.now(timezone.utc) - created
    fraction_remaining = max(0.0, 1 - elapsed / lifetime)
    return 0.05 * fraction_remaining


def same_region(region_filter: str | None, candidate_region: str) -> bool:
    if not region_filter:
        return False
    return region_filter.lower() in candidate_region.lower()


def score_candidate(
    *,
    similarity: float,
    query_intent: str,
    candidate_intent: str,
    query_tags: list[str],
    candidate_tags: list[str],
    candidate_created_at: str | None,
    candidate_kind: str,
    region_filter: str | None,
    candidate_region: str,
    region_required: bool = False,
) -> float:
    score = similarity
    if intent_complements(query_intent, candidate_intent):
        score += 0.15
    if tag_overlap(query_tags, candidate_tags):
        score += 0.10
    score += recency_boost(candidate_created_at, candidate_kind)
    matches_region = same_region(region_filter, candidate_region)
    if region_required:
        # An explicit ask ("I want USA people") isn't a soft preference — a
        # generic travel-question match from the wrong continent used to
        # rank right alongside genuine matches because the region signal was
        # a same-sized nudge either way. A real mismatch penalty is what
        # actually keeps a false-positive region below the results cutoff.
        score += 0.15 if matches_region else -0.35
    elif matches_region:
        score += 0.05
    return score
