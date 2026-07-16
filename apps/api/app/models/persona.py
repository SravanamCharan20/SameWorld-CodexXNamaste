def serialize_persona(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "display_name": doc["display_name"],
        "region_label": doc["region_label"],
        "region_lat": doc["region_lat"],
        "region_lng": doc["region_lng"],
        "profile_signal_id": str(doc["profile_signal_id"]) if doc.get("profile_signal_id") else None,
        "is_demo": doc.get("is_demo", True),
    }
