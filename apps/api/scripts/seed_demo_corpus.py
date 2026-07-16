"""Phase 4 calibration corpus: the representative examples from spec §11, one persona
per signal, posted through the REAL running API (POST /signals -> /signals/confirm) —
no direct database inserts. Requires the API server running on localhost:8000.

Run: ./venv/bin/python -m scripts.seed_demo_corpus
"""

import asyncio

import httpx

from app.db.mongo import get_db

API_BASE = "http://localhost:8000"

# (persona_id, display_name, region_label, lat, lng, theme, raw_text)
ROWS = [
    ("persona_seed_001", "Priya", "Bangalore, India", 12.9716, 77.5946, "relocation",
     "Moving from India to Germany for a tech job — what should I know about the visa process?"),
    ("persona_seed_002", "Karan", "Berlin, Germany", 52.5200, 13.4050, "relocation",
     "Moved from Bangalore to Berlin 18 months ago on a Blue Card. Happy to help newcomers."),
    ("persona_seed_003", "Ngozi", "Lagos, Nigeria", 6.5244, 3.3792, "relocation",
     "Relocating to London for a master's in 2 months — anyone been through the student visa process?"),
    ("persona_seed_004", "Emeka", "London, UK", 51.5074, -0.1278, "relocation",
     "Did my master's in London 2 years ago as a Nigerian student. Can walk you through visa and halls."),
    ("persona_seed_005", "Wanjiru", "Nairobi, Kenya", -1.2921, 36.8219, "relocation",
     "Got into a PhD program in Munich — anyone know how German health insurance works?"),
    ("persona_seed_006", "Kevin", "Munich, Germany", 48.1351, 11.5820, "relocation",
     "PhD student from Kenya, year 2 in Munich. German insurance confused me too — happy to explain."),

    ("persona_seed_007", "Rohan", "Pune, India", 18.5204, 73.8567, "mentorship",
     "Stuck on React state management for 2 weeks — need someone to pair with for an hour."),
    ("persona_seed_008", "Derek", "Austin, USA", 30.2672, -97.7431, "mentorship",
     "Senior frontend engineer, happy to do free 1-hour pairing sessions on React for beginners."),
    ("persona_seed_009", "Putri", "Jakarta, Indonesia", -6.2088, 106.8456, "mentorship",
     "Preparing for interviews, need someone to mock-interview me on system design."),
    ("persona_seed_010", "Grace", "Seattle, USA", 47.6062, -122.3321, "mentorship",
     "Ex-big-tech SDE2, doing free mock system design interviews most weekends."),
    ("persona_seed_011", "Youssef", "Cairo, Egypt", 30.0444, 31.2357, "mentorship",
     "Want to learn conversational Japanese before a work trip — need a language exchange partner."),
    ("persona_seed_012", "Sakura", "Osaka, Japan", 34.6937, 135.5023, "mentorship",
     "Native Japanese speaker learning Arabic — happy to trade language exchange sessions."),

    ("persona_seed_013", "Vikram", "Bangalore, India", 12.9716, 77.5946, "startup",
     "Solo hacker for the OpenAI Codex Hackathon, strong backend, weak on frontend — looking for a teammate."),
    ("persona_seed_014", "Ishita", "Hyderabad, India", 17.3850, 78.4867, "startup",
     "Frontend + design person looking for a backend-strong teammate for the Codex Hackathon."),
    ("persona_seed_015", "Wei", "Singapore", 1.3521, 103.8198, "startup",
     "Recently built a startup MVP, looking for a product designer to join as an early collaborator."),
    ("persona_seed_016", "Lotte", "Amsterdam, Netherlands", 52.3676, 4.9041, "startup",
     "Product designer, 4 years in fintech, looking for an early-stage startup to join as a collaborator."),
    ("persona_seed_017", "Farah", "Singapore", 1.3521, 103.8198, "startup",
     "Building a side-project SaaS for freelancer invoicing, need a co-founder with sales instinct."),
    ("persona_seed_018", "Daan", "Amsterdam, Netherlands", 52.3676, 4.9041, "startup",
     "Ex-sales lead, wants to try the startup thing, looking for a technical co-founder."),

    ("persona_seed_019", "Divya", "Chennai, India", 13.0827, 80.2707, "travel",
     "Planning a 2-week Thailand trip on a tight budget — anybody done this recently and can share numbers?"),
    ("persona_seed_020", "Jack", "Melbourne, Australia", -37.8136, 144.9631, "travel",
     "Backpacked Thailand for 3 weeks on ~$900 total. Happy to share the full breakdown."),
    ("persona_seed_021", "Bruno", "Sao Paulo, Brazil", -23.5505, -46.6333, "travel",
     "First solo trip to Japan next month — nervous about the language barrier, any tips?"),
    ("persona_seed_022", "Rin", "Fukuoka, Japan", 33.5904, 130.4017, "travel",
     "Lived in Japan for a year, traveled solo extensively. Language barrier is smaller than you think."),
    ("persona_seed_023", "Olivia", "Toronto, Canada", 43.6532, -79.3832, "travel",
     "Looking for a travel buddy for a Peru/Bolivia trip in September, open dates."),

    ("persona_seed_024", "Anand", "Kochi, India", 9.9312, 76.2673, "jobs",
     "Looking for MERN stack roles in India, 2 years experience, open to relocation within the country."),
    ("persona_seed_025", "Simran", "Gurgaon, India", 28.4595, 77.0266, "jobs",
     "Hiring a MERN developer for a 3-month contract, remote-friendly, India timezone preferred."),
    ("persona_seed_026", "Felix", "Berlin, Germany", 52.5200, 13.4050, "jobs",
     "Laid off last month, looking for backend roles — Python/Django, open to relocating within Europe."),
    ("persona_seed_027", "Elin", "Stockholm, Sweden", 59.3293, 18.0686, "jobs",
     "Our team is hiring a backend engineer, Python/Django, remote across Europe."),
    ("persona_seed_028", "Neha", "Mumbai, India", 19.0760, 72.8777, "jobs",
     "Considering a career switch from finance to data analytics — is it realistic at 29?"),
    ("persona_seed_029", "Tom", "Manchester, UK", 53.4808, -2.2426, "jobs",
     "Switched from finance to data analytics at 31. Realistic, but the first 6 months are rough."),

    ("persona_seed_030", "Rafael", "Sao Paulo, Brazil", -23.5505, -46.6333, "events",
     "Anyone watching FIFA World Cup 2026 tonight? Looking for people to talk trash with during the match."),
    ("persona_seed_031", "Tunde", "Lagos, Nigeria", 6.5244, 3.3792, "events",
     "Hosting a small FIFA 2026 watch party this weekend, a few spots open if anyone's around."),
    ("persona_seed_032", "Meera", "Bangalore, India", 12.9716, 77.5946, "events",
     "In town for the hackathon today, anyone else here also new to Bangalore and want to grab coffee?"),
    ("persona_seed_033", "Arjun", "Chennai, India", 13.0827, 80.2707, "events",
     "Free this evening, up for badminton if anyone nearby wants to play."),
    ("persona_seed_034", "Casey", "Austin, USA", 30.2672, -97.7431, "events",
     "Watching the F1 race tomorrow morning, anyone else obsessed enough to livetext through it?"),

    ("persona_seed_035", "Debjani", "Kolkata, India", 22.5726, 88.3639, "casual",
     "I am very bored, anyone there to discuss cinema? Specifically anything Scorsese."),
    ("persona_seed_036", "Suresh", "Bangalore, India", 12.9716, 77.5946, "casual",
     "RCB is a waste team, fight me."),
    ("persona_seed_037", "Miguel", "Manila, Philippines", 14.5995, 120.9842, "casual",
     "Deep into a Kurosawa rewatch this month, would love to talk about it with someone equally unwell."),
    ("persona_seed_038", "Kwame", "Accra, Ghana", 5.6037, -0.1870, "casual",
     "Learning guitar for 6 months, plateaued hard — need someone to point out what I'm doing wrong."),
    ("persona_seed_039", "Brianna", "Nashville, USA", 36.1627, -86.7816, "casual",
     "Session guitarist, offer free 30-min feedback sessions for beginners who send a clip."),
    ("persona_seed_040", "Aoife", "Dublin, Ireland", 53.3498, -6.2603, "casual",
     "Terrible at cooking, attempting my first real dinner party this weekend, mildly panicking."),
]


async def seed_personas():
    db = get_db()
    for persona_id, name, region_label, lat, lng, _theme, _text in ROWS:
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
    print(f"Seeded {len(ROWS)} personas.")


async def post_signal(client: httpx.AsyncClient, persona_id: str, text: str) -> dict:
    preview_res = await client.post(
        "/signals", json={"raw_text": text}, headers={"X-Persona-Id": persona_id}
    )
    preview_res.raise_for_status()
    preview = preview_res.json()["data"]
    if preview["blocked"]:
        return {"status": "blocked", "reason": preview["reason"]}
    confirm_res = await client.post("/signals/confirm", json={"preview_id": preview["preview_id"]})
    confirm_res.raise_for_status()
    return {"status": "created", "id": confirm_res.json()["data"]["id"]}


async def seed_signals():
    async with httpx.AsyncClient(base_url=API_BASE, timeout=60) as client:
        for i, (persona_id, name, region_label, _lat, _lng, theme, text) in enumerate(ROWS, 1):
            result = await post_signal(client, persona_id, text)
            print(f"[{i}/{len(ROWS)}] {theme:12s} {name:10s} -> {result['status']}")


async def main():
    await seed_personas()
    await seed_signals()


if __name__ == "__main__":
    asyncio.run(main())
