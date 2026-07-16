"""Phase 7: seed ~20 permanent Profile signals (is_profile: true) through the real
POST /profile pipeline — spread across common skill/interest categories per §11 so
queries like "product designer" or "MERN developer" surface something real.

Run: ./venv/bin/python -m scripts.seed_profiles
"""

import asyncio

import httpx

from app.db.mongo import get_db
from scripts.seed_demo_corpus import API_BASE

# (persona_id, display_name, region_label, lat, lng, bio, tags, links)
PROFILES = [
    ("persona_seed_007", "Rohan", "Pune, India", 18.5204, 73.8567,
     "MERN stack developer, 3 years, open source contributor. GitHub linked. Actively looking for interesting projects.",
     ["mern", "open source", "javascript"], ["https://github.com/example-rohan"]),
    ("persona_tor_01", "Sofia", "Toronto, Canada", 43.6532, -79.3832,
     "ML engineer, ex-big tech, now freelancing. Shipped 4 production models. Blog linked.",
     ["machine learning", "freelance", "python"], ["https://sofia-ml.example.com"]),
    ("persona_mnl_01", "Ana", "Manila, Philippines", 14.5995, 120.9842,
     "Marketing generalist, early-stage startups, growth + content. Open to advisory or part-time roles.",
     ["marketing", "startups", "growth"], []),
    ("persona_ber_01", "Lukas", "Berlin, Germany", 52.5200, 13.4050,
     "UX researcher, healthcare focus. Papers and case studies linked. Happy to mentor early-career researchers.",
     ["ux research", "healthcare", "mentorship"], ["https://lukas-research.example.com"]),
    ("persona_profile_001", "Ines", "Lisbon, Portugal", 38.7223, -9.1393,
     "Backend engineer, Go and distributed systems, 6 years. Currently at a payments company. Open to consulting.",
     ["go", "backend", "distributed systems"], []),
    ("persona_profile_002", "Marcus", "Seattle, USA", 47.6062, -122.3321,
     "DevOps / SRE, Kubernetes and AWS, on-call veteran. Happy to review your infra setup.",
     ["devops", "kubernetes", "aws"], []),
    ("persona_profile_003", "Priya", "Bangalore, India", 12.9716, 77.5946,
     "Data scientist, healthcare analytics. Published a couple of papers. Open to research collaborations.",
     ["data science", "healthcare", "research"], ["https://priya-datasci.example.com"]),
    ("persona_profile_004", "Jonas", "Stockholm, Sweden", 59.3293, 18.0686,
     "iOS developer, Swift and SwiftUI, shipped 3 apps to the App Store. Open to freelance work.",
     ["ios", "swift", "mobile"], []),
    ("persona_profile_005", "Aaliyah", "London, UK", 51.5074, -0.1278,
     "Content writer and copywriter, B2B SaaS focus. Portfolio linked. Taking on new clients.",
     ["copywriting", "content", "saas"], ["https://aaliyah-writes.example.com"]),
    ("persona_profile_006", "Diego", "Mexico City, Mexico", 19.4326, -99.1332,
     "Product manager, fintech and marketplaces, 5 years. Open to advisory conversations.",
     ["product management", "fintech", "marketplaces"], []),
    ("persona_profile_007", "Grace", "Austin, USA", 30.2672, -97.7431,
     "Sales and BD, early-stage B2B, closed our first 20 enterprise deals. Happy to swap notes.",
     ["sales", "business development", "b2b"], []),
    ("persona_profile_008", "Kenji", "Tokyo, Japan", 35.6762, 139.6503,
     "Illustrator and graphic designer, editorial and branding work. Portfolio linked.",
     ["illustration", "graphic design", "branding"], ["https://kenji-illustrates.example.com"]),
    ("persona_profile_009", "Naledi", "Cape Town, South Africa", -33.9249, 18.4241,
     "Video editor, documentary and branded content. Reel linked. Open to freelance projects.",
     ["video editing", "documentary", "freelance"], ["https://naledi-edits.example.com"]),
    ("persona_profile_010", "Tomas", "Prague, Czech Republic", 50.0755, 14.4378,
     "Full-stack generalist, comfortable across the whole stack, enjoys 0-to-1 projects.",
     ["full stack", "generalist", "startups"], []),
    ("persona_profile_011", "Fatima", "Dubai, UAE", 25.2048, 55.2708,
     "Cybersecurity analyst, penetration testing and incident response. Open to consulting engagements.",
     ["cybersecurity", "penetration testing", "security"], []),
    ("persona_profile_012", "Owen", "Dublin, Ireland", 53.3498, -6.2603,
     "HR and recruiting, technical hiring specialist. Happy to give resume feedback.",
     ["recruiting", "hr", "hiring"], []),
    ("persona_profile_013", "Bianca", "Sao Paulo, Brazil", -23.5505, -46.6333,
     "Fitness coach, strength training and mobility. Certified, open to online coaching.",
     ["fitness", "coaching", "strength training"], []),
    ("persona_profile_014", "Haruto", "Osaka, Japan", 34.6937, 135.5023,
     "Language teacher, Japanese and English, 8 years experience. Open to tutoring.",
     ["language teaching", "japanese", "tutoring"], []),
    ("persona_profile_015", "Elena", "Barcelona, Spain", 41.3874, 2.1686,
     "Photographer, portrait and street photography. Portfolio linked. Open to collaborations.",
     ["photography", "portrait", "street photography"], ["https://elena-photo.example.com"]),
]


async def seed_personas():
    db = get_db()
    for persona_id, name, region_label, lat, lng, *_ in PROFILES:
        existing = await db.personas.find_one({"_id": persona_id})
        if existing:
            continue
        await db.personas.update_one(
            {"_id": persona_id},
            {"$set": {
                "_id": persona_id,
                "display_name": name,
                "region_label": region_label,
                "region_lat": lat,
                "region_lng": lng,
                "profile_signal_id": None,
                "is_demo": True,
            }},
            upsert=True,
        )
    print(f"Ensured {len(PROFILES)} personas exist.")


async def seed_profile_signals(start_index: int = 0):
    async with httpx.AsyncClient(base_url=API_BASE, timeout=900) as client:
        for i, (persona_id, name, _region, _lat, _lng, bio, tags, links) in enumerate(PROFILES, 1):
            if i - 1 < start_index:
                continue
            res = await client.post(
                "/profile",
                json={"bio": bio, "tags": tags, "links": links},
                headers={"X-Persona-Id": persona_id},
            )
            res.raise_for_status()
            data = res.json()["data"]
            status = "blocked" if data.get("blocked") else "saved"
            print(f"[{i}/{len(PROFILES)}] {name:10s} -> {status}")


async def main():
    import sys

    start_index = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    await seed_personas()
    await seed_profile_signals(start_index)


if __name__ == "__main__":
    asyncio.run(main())
