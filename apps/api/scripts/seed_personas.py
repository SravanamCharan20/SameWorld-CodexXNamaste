"""One-off script: seed a handful of demo personas for the login picker.
Run: ./venv/bin/python -m scripts.seed_personas
"""

import asyncio

from app.db.mongo import get_db

PERSONAS = [
    {"_id": "persona_blr_01", "display_name": "Aditi", "region_label": "Bangalore, India", "region_lat": 12.9716, "region_lng": 77.5946},
    {"_id": "persona_ber_01", "display_name": "Lukas", "region_label": "Berlin, Germany", "region_lat": 52.5200, "region_lng": 13.4050},
    {"_id": "persona_aus_01", "display_name": "Maria", "region_label": "Austin, USA", "region_lat": 30.2672, "region_lng": -97.7431},
    {"_id": "persona_lag_01", "display_name": "Chidi", "region_label": "Lagos, Nigeria", "region_lat": 6.5244, "region_lng": 3.3792},
    {"_id": "persona_tor_01", "display_name": "Sofia", "region_label": "Toronto, Canada", "region_lat": 43.6532, "region_lng": -79.3832},
    {"_id": "persona_mnl_01", "display_name": "Ana", "region_label": "Manila, Philippines", "region_lat": 14.5995, "region_lng": 120.9842},
    {"_id": "persona_lon_01", "display_name": "James", "region_label": "London, UK", "region_lat": 51.5074, "region_lng": -0.1278},
    {"_id": "persona_osa_01", "display_name": "Haruto", "region_label": "Osaka, Japan", "region_lat": 34.6937, "region_lng": 135.5023},
]


async def main():
    db = get_db()
    for persona in PERSONAS:
        await db.personas.update_one(
            {"_id": persona["_id"]},
            {"$set": {**persona, "profile_signal_id": None, "is_demo": True}},
            upsert=True,
        )
    count = await db.personas.count_documents({})
    print(f"Seeded {len(PERSONAS)} personas. Total personas in db: {count}")


if __name__ == "__main__":
    asyncio.run(main())
