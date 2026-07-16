"""Phase 5: expand the Phase-4 40-signal corpus to the full ~140 regular signals
(profiles are seeded separately in Phase 7, once the profile system exists) across
the 7 themes, per §11's generation brief — varied tone, 25+ regions, deliberately
including borderline/weak examples for threshold robustness. Posted through the same
real POST /signals -> /signals/confirm pipeline as Phase 4, no direct DB inserts.

Run: ./venv/bin/python -m scripts.seed_full_corpus
"""

import asyncio

import httpx

from app.db.mongo import get_db
from scripts.seed_demo_corpus import API_BASE, post_signal

# (persona_id, display_name, region_label, lat, lng, theme, raw_text)
ROWS = [
    # Theme 1 — Relocation & Cultural Transition (14 more)
    ("persona_seed_041", "Carlo", "Manila, Philippines", 14.5995, 120.9842, "relocation",
     "Accepted a job offer in Toronto, moving from Manila in 6 weeks — anyone know how tight the PR pathway is after landing?"),
    ("persona_seed_042", "Marites", "Toronto, Canada", 43.6532, -79.3832, "relocation",
     "Immigrated to Toronto from the Philippines 3 years ago, went through the Express Entry route. Happy to answer questions."),
    ("persona_seed_043", "Nico", "Berlin, Germany", 52.5200, 13.4050, "relocation",
     "Trying to figure out if Lisbon's digital nomad visa is worth the paperwork — anyone actually done it?"),
    ("persona_seed_044", "Ines", "Lisbon, Portugal", 38.7223, -9.1393, "relocation",
     "Did the Portugal D7 visa process last year from Berlin. Long paperwork but doable — ask away."),
    ("persona_seed_045", "Hassan", "Dubai, UAE", 25.2048, 55.2708, "relocation",
     "Six months into an expat contract in Dubai, still adjusting to the heat and the pace. Anyone else going through the same?"),
    ("persona_seed_046", "Sian", "Manchester, UK", 53.4808, -2.2426, "relocation",
     "Moving my whole family from Manchester to Wellington for my partner's job — overwhelmed by the checklist."),
    ("persona_seed_047", "Grant", "Wellington, New Zealand", -41.2865, 174.7762, "relocation",
     "Relocated a family of four from the UK to New Zealand two years ago. The paperwork is the easy part, honestly."),
    ("persona_seed_048", "Linh", "Ho Chi Minh City, Vietnam", 10.8231, 106.6297, "relocation",
     "Considering a move to Vietnam for the lower cost of living — anyone who's actually done the visa runs?"),
    ("persona_seed_049", "Marcus", "Ho Chi Minh City, Vietnam", 10.8231, 106.6297, "relocation",
     "American expat in Vietnam for 2 years now, still do visa runs every 3 months. Ask me anything."),
    ("persona_seed_050", "Yuna", "Seoul, South Korea", 37.5665, 126.9780, "relocation",
     "First week in a new country and I already miss my mom's cooking more than I expected."),
    ("persona_seed_051", "Bex", "Busan, South Korea", 35.1796, 129.0756, "relocation",
     "Moving to Seoul for a teaching contract next month — any tips on the apartment deposit system?"),
    ("persona_seed_052", "Daniel", "Seoul, South Korea", 37.5665, 126.9780, "relocation",
     "Taught English in Seoul for a year, the deposit (jeonse) system confused me too at first. Happy to explain."),
    ("persona_seed_053", "Camila", "Sao Paulo, Brazil", -23.5505, -46.6333, "relocation",
     "Relocating from Sao Paulo to Lisbon for a remote-first company — anyone navigated the NHR tax status?"),
    ("persona_seed_054", "Tiago", "Porto, Portugal", 41.1579, -8.6291, "relocation",
     "Went through Portugal's NHR process from Brazil two years back. Tax stuff is confusing but manageable."),

    # Theme 2 — Skill Mentorship & Learning (14 more)
    ("persona_seed_055", "Thandiwe", "Cape Town, South Africa", -33.9249, 18.4241, "mentorship",
     "Six months into learning Python for data work, keep getting stuck on pandas — need someone to unblock me for 30 min."),
    ("persona_seed_056", "Marek", "Warsaw, Poland", 52.2297, 21.0122, "mentorship",
     "Data analyst, use pandas daily, happy to jump on a quick call to unstick people."),
    ("persona_seed_057", "Laia", "Barcelona, Spain", 41.3874, 2.1686, "mentorship",
     "Terrified of public speaking but have a conference talk in 3 weeks — need someone to run through it with me."),
    ("persona_seed_058", "Pau", "Barcelona, Spain", 41.3874, 2.1686, "mentorship",
     "Give conference talks regularly, happy to do a practice-run feedback session before your next one."),
    ("persona_seed_059", "Salma", "Marrakesh, Morocco", 31.6295, -7.9811, "mentorship",
     "Trying to get better at street photography — my compositions all look the same, need a second pair of eyes."),
    ("persona_seed_060", "Idris", "Marrakesh, Morocco", 31.6295, -7.9811, "mentorship",
     "Street photographer for 8 years, happy to review a few shots and give honest feedback."),
    ("persona_seed_061", "Ola", "Warsaw, Poland", 52.2297, 21.0122, "mentorship",
     "Studying for the AWS Solutions Architect exam, drowning in the networking section — anyone passed recently?"),
    ("persona_seed_062", "Kasia", "Krakow, Poland", 50.0647, 19.9450, "mentorship",
     "Passed AWS SAA last month. The networking section trips everyone up — happy to share how I studied it."),
    ("persona_seed_063", "Freja", "Copenhagen, Denmark", 55.6761, 12.5683, "mentorship",
     "Want to get into home baking beyond banana bread — everything I try to level up just flops."),
    ("persona_seed_064", "Mikkel", "Copenhagen, Denmark", 55.6761, 12.5683, "mentorship",
     "Pastry chef by trade, happy to answer baking questions on my days off."),
    ("persona_seed_065", "Valentina", "Buenos Aires, Argentina", -34.6037, -58.3816, "mentorship",
     "Trying to learn to sketch people from life, my proportions are always off — need pointers."),
    ("persona_seed_066", "Martin", "Buenos Aires, Argentina", -34.6037, -58.3816, "mentorship",
     "Illustrator, figure drawing is my thing — happy to give quick critique on sketches."),
    ("persona_seed_067", "Chloe", "Perth, Australia", -31.9505, 115.8605, "mentorship",
     "Six weeks into learning to swim as an adult, still panic in deep water — need a patient practice partner."),
    ("persona_seed_068", "Ben", "Perth, Australia", -31.9505, 115.8605, "mentorship",
     "Swim instructor, specialize in adult beginners who are nervous in water. Happy to help outside of paid lessons too."),

    # Theme 3 — Startup & Project Collaboration (14 more)
    ("persona_seed_069", "Amani", "Nairobi, Kenya", -1.2921, 36.8219, "startup",
     "Building a climate-tech idea, need someone who actually understands carbon credit markets to sanity-check it."),
    ("persona_seed_070", "Otieno", "Nairobi, Kenya", -1.2921, 36.8219, "startup",
     "Worked in carbon markets for 5 years, happy to sanity-check climate-tech pitches."),
    ("persona_seed_071", "Naledi", "Cape Town, South Africa", -33.9249, 18.4241, "startup",
     "Non-technical founder, built the whole business plan, now need a CTO who'll actually commit long-term."),
    ("persona_seed_072", "Sipho", "Johannesburg, South Africa", -26.2041, 28.0473, "startup",
     "CTO-for-hire type, looking for an early-stage startup with a non-technical founder who's done the homework."),
    ("persona_seed_073", "Finn", "Berlin, Germany", 52.5200, 13.4050, "startup",
     "Two of us on a hackathon team, need a third for the pitch deck and demo video — event's this weekend."),
    ("persona_seed_074", "Greta", "Berlin, Germany", 52.5200, 13.4050, "startup",
     "Freelance motion designer, free this weekend if any hackathon team needs a demo video done fast."),
    ("persona_seed_075", "Priyanka", "Toronto, Canada", 43.6532, -79.3832, "startup",
     "Considering quitting my job to go full-time on a side project — anyone done that leap and survived?"),
    ("persona_seed_076", "Liam", "Vancouver, Canada", 49.2827, -123.1207, "startup",
     "Quit my corporate job 18 months ago for my startup. Still alive, happy to talk through the tradeoffs."),
    ("persona_seed_077", "Rakesh", "Bangalore, India", 12.9716, 77.5946, "startup",
     "Building a marketplace app, need someone who's actually dealt with two-sided marketplace chicken-and-egg problems."),
    ("persona_seed_078", "Ananya", "Bangalore, India", 12.9716, 77.5946, "startup",
     "Grew a two-sided marketplace from zero to liquidity at my last startup. Happy to talk through the chicken-and-egg problem."),
    ("persona_seed_079", "Josh", "Manila, Philippines", 14.5995, 120.9842, "startup",
     "Idea-stage only, want someone to just poke holes in my business model before I build anything."),
    ("persona_seed_080", "Michelle", "Singapore", 1.3521, 103.8198, "startup",
     "Ex-VC analyst, enjoy poking holes in early business models over coffee (virtual is fine)."),
    ("persona_seed_081", "Cody", "Austin, USA", 30.2672, -97.7431, "startup",
     "Weekend project turned into something people actually want to pay for — no idea how to handle the legal/incorporation side."),
    ("persona_seed_082", "Alexis", "Austin, USA", 30.2672, -97.7431, "startup",
     "Startup lawyer, incorporation questions are literally my day job, happy to point you in the right direction informally."),

    # Theme 4 — Travel & Trip Planning (15 more)
    ("persona_seed_083", "Cian", "Dublin, Ireland", 53.3498, -6.2603, "travel",
     "Doing a solo Iceland road trip in October — is that too late in the season for the Ring Road?"),
    ("persona_seed_084", "Bjork", "Reykjavik, Iceland", 64.1466, -21.9426, "travel",
     "Drove the Ring Road in late October two years ago. Doable but pack for real winter."),
    ("persona_seed_085", "Lena", "Vienna, Austria", 48.2082, 16.3738, "travel",
     "Trying to plan a budget trip through the Balkans — is 3 weeks enough for Croatia, Bosnia, and Montenegro?"),
    ("persona_seed_086", "Ivan", "Zagreb, Croatia", 45.8150, 15.9819, "travel",
     "Backpacked the Balkans for a month, 3 weeks for those 3 countries is tight but workable if you're efficient."),
    ("persona_seed_087", "Camille", "Paris, France", 48.8566, 2.3522, "travel",
     "Nervous about doing Morocco solo as a woman — anyone actually done it and can share real talk?"),
    ("persona_seed_088", "Fatima", "Marrakesh, Morocco", 31.6295, -7.9811, "travel",
     "Traveled Morocco solo as a woman last year, happy to share what actually helped vs. what was overhyped worry."),
    ("persona_seed_089", "Duarte", "Lisbon, Portugal", 38.7223, -9.1393, "travel",
     "Nothing beats the feeling of landing somewhere with zero plan and just wandering for the first day."),
    ("persona_seed_090", "Sofia", "Madrid, Spain", 40.4168, -3.7038, "travel",
     "Looking for people who've done the Camino de Santiago — how many km/day is realistic for a first-timer?"),
    ("persona_seed_091", "Xoan", "Santiago de Compostela, Spain", 42.8782, -8.5448, "travel",
     "Walked the Camino Frances last year, 20-25km/day was sustainable for me as a first-timer."),
    ("persona_seed_092", "Wen", "Singapore", 1.3521, 103.8198, "travel",
     "Planning a 10-day trip to Vietnam, torn between north-to-south or just picking one region — thoughts?"),
    ("persona_seed_093", "Mai", "Hanoi, Vietnam", 21.0278, 105.8342, "travel",
     "Did north-to-south Vietnam in 10 days once, wouldn't recommend — pick one region and go deep instead."),
    ("persona_seed_094", "Harper", "Melbourne, Australia", -37.8136, 144.9631, "travel",
     "Anyone else just booked a flight somewhere on a whim without telling anyone yet?"),
    ("persona_seed_095", "Sota", "Fukuoka, Japan", 33.5904, 130.4017, "travel",
     "First time doing a work-and-travel visa in Australia — any advice on which city to base out of?"),
    ("persona_seed_096", "Aina", "Osaka, Japan", 34.6937, 135.5023, "travel",
     "Did a work-and-travel year in Australia, based out of Melbourne — happy to share what worked."),
    ("persona_seed_097", "Oliver", "London, UK", 51.5074, -0.1278, "travel",
     "Trying to plan a family trip to Kenya for a safari — is self-driving realistic or should we book a guide?"),

    # Theme 5 — Jobs & Career Opportunities (14 more)
    ("persona_seed_098", "Freya", "Bristol, UK", 51.4545, -2.5879, "jobs",
     "Product manager, 4 years experience, looking for remote-first roles in climate tech specifically."),
    ("persona_seed_099", "Bram", "Amsterdam, Netherlands", 52.3676, 4.9041, "jobs",
     "Hiring a product manager for our climate-tech startup, fully remote, EU timezone preferred."),
    ("persona_seed_100", "Aleksy", "Krakow, Poland", 50.0647, 19.9450, "jobs",
     "Laid off from a DevOps role last week — is Kubernetes still the safest bet to specialize in right now?"),
    ("persona_seed_101", "Jonas", "Berlin, Germany", 52.5200, 13.4050, "jobs",
     "DevOps lead for 6 years, Kubernetes is still very much in demand — happy to talk through the market."),
    ("persona_seed_102", "Diego", "San Francisco, USA", 37.7749, -122.4194, "jobs",
     "Hiring a growth marketer for an early-stage B2B SaaS, remote, US hours."),
    ("persona_seed_103", "Morgan", "Denver, USA", 39.7392, -104.9903, "jobs",
     "Growth marketer, 3 years in B2B SaaS, actively looking for my next role."),
    ("persona_seed_104", "Priya", "Seattle, USA", 47.6062, -122.3321, "jobs",
     "Thinking about leaving big tech for a startup — is the pay cut as brutal as people say?"),
    ("persona_seed_105", "Wyatt", "San Jose, USA", 37.3382, -121.8863, "jobs",
     "Left big tech for a Series A startup last year. The pay cut was real but so was the equity upside — depends on the company."),
    ("persona_seed_106", "Zanele", "Cape Town, South Africa", -33.9249, 18.4241, "jobs",
     "Freelance UX writer, portfolio ready, looking for contract work in fintech specifically."),
    ("persona_seed_107", "Pieter", "Cape Town, South Africa", -33.9249, 18.4241, "jobs",
     "Our fintech startup needs a freelance UX writer for a 2-month contract, remote."),
    ("persona_seed_108", "Nate", "Chicago, USA", 41.8781, -87.6298, "jobs",
     "First job out of college was a rough fit — how long is too long to stay before it looks bad on a resume?"),
    ("persona_seed_109", "Denise", "Chicago, USA", 41.8781, -87.6298, "jobs",
     "Been hiring for 10 years, honestly nobody cares about a short first job if you can explain it well."),
    ("persona_seed_110", "Andrei", "Bucharest, Romania", 44.4268, 26.1025, "jobs",
     "QA engineer, manual + automation testing, open to relocating anywhere in the EU for the right role."),
    ("persona_seed_111", "Sean", "Dublin, Ireland", 53.3498, -6.2603, "jobs",
     "Hiring a QA engineer, automation-heavy, willing to sponsor relocation within the EU."),

    # Theme 6 — Events & Moments (15 more, mostly NOW)
    ("persona_seed_112", "Trevor", "San Francisco, USA", 37.7749, -122.4194, "events",
     "Anyone else at the tech meetup in the coworking space downtown right now?"),
    ("persona_seed_113", "Ashley", "San Francisco, USA", 37.7749, -122.4194, "events",
     "Running a small tech meetup tonight downtown, still a few walk-in spots."),
    ("persona_seed_114", "Poppy", "London, UK", 51.5074, -0.1278, "events",
     "Watching the Wimbledon final alone and it's a crime — anyone want to co-watch remotely?"),
    ("persona_seed_115", "Marcus", "Los Angeles, USA", 34.0522, -118.2437, "events",
     "Free for a pickup basketball game this evening if anyone's around the usual court."),
    ("persona_seed_116", "Willow", "Portland, USA", 45.5152, -122.6784, "events",
     "At the farmers market right now, anyone else here and want to grab a coffee after?"),
    ("persona_seed_117", "Tyler", "Austin, USA", 30.2672, -97.7431, "events",
     "Concert just got rained out, anyone nearby also stranded and want to find shelter together?"),
    ("persona_seed_118", "Rhea", "Mumbai, India", 19.0760, 72.8777, "events",
     "Hosting a rooftop watch party for the finals tonight, couple spots left."),
    ("persona_seed_119", "Sofie", "Berlin, Germany", 52.5200, 13.4050, "events",
     "New in town for a conference, anyone want to grab dinner tonight instead of eating alone at the hotel?"),
    ("persona_seed_120", "Marcus", "Boston, USA", 42.3601, -71.0589, "events",
     "Marathon's tomorrow morning, anyone else too nervous to sleep right now?"),
    ("persona_seed_121", "Bianca", "Manila, Philippines", 14.5995, 120.9842, "events",
     "Power just went out in my whole neighborhood, anyone else nearby also sitting in the dark?"),
    ("persona_seed_122", "Reggie", "New Orleans, USA", 29.9511, -90.0715, "events",
     "Free tickets to tonight's jazz show fell into my lap, anyone want the extra?"),
    ("persona_seed_123", "Achieng", "Nairobi, Kenya", -1.2921, 36.8219, "events",
     "Local election results coming in tonight, anyone want to watch together and talk through it?"),
    ("persona_seed_124", "Jin", "Seoul, South Korea", 37.5665, 126.9780, "events",
     "Karaoke night just started at the usual spot, come through if you're free."),
    ("persona_seed_125", "Priya", "Toronto, Canada", 43.6532, -79.3832, "events",
     "First snow of the season just started falling, stepping outside to enjoy it if anyone wants to join."),
    ("persona_seed_126", "Sahil", "Bangalore, India", 12.9716, 77.5946, "events",
     "Anyone else pulling an all-nighter for the hackathon demo right now?"),

    # Theme 7 — Casual Social & Shared Interests (14 more)
    ("persona_seed_127", "Devon", "Chicago, USA", 41.8781, -87.6298, "casual",
     "Hot take: pineapple on pizza is actually fine and you're all just being dramatic."),
    ("persona_seed_128", "Emi", "Osaka, Japan", 34.6937, 135.5023, "casual",
     "Deep in a Studio Ghibli rewatch, would love to talk about which one is secretly the saddest."),
    ("persona_seed_129", "Rangi", "Wellington, New Zealand", -41.2865, 174.7762, "casual",
     "Three chapters into a very long fantasy series and already emotionally compromised, need someone to spiral with."),
    ("persona_seed_130", "Zoe", "Melbourne, Australia", -37.8136, 144.9631, "casual",
     "Learning to make sourdough and my starter keeps dying — need someone to tell me what I'm doing wrong."),
    ("persona_seed_131", "Hamish", "Melbourne, Australia", -37.8136, 144.9631, "casual",
     "Sourdough baker for years, happy to troubleshoot a struggling starter."),
    ("persona_seed_132", "Orla", "Dublin, Ireland", 53.3498, -6.2603, "casual",
     "Convinced the office coffee machine is sentient and judging my choices."),
    ("persona_seed_133", "Hana", "Seoul, South Korea", 37.5665, 126.9780, "casual",
     "Just finished a video game that wrecked me emotionally, need to talk about the ending with someone who's played it."),
    ("persona_seed_134", "Ararat", "Yerevan, Armenia", 40.1792, 44.4991, "casual",
     "Chess improvement plateaued around 1200 rating, need someone to review a few of my games."),
    ("persona_seed_135", "Lusine", "Yerevan, Armenia", 40.1792, 44.4991, "casual",
     "Chess coach, happy to review a couple of games for anyone stuck around intermediate level."),
    ("persona_seed_136", "Aisha", "Toronto, Canada", 43.6532, -79.3832, "casual",
     "Unpopular opinion: most 'best of' movie lists are just recency bias in a trench coat."),
    ("persona_seed_137", "Fraser", "Edinburgh, UK", 55.9533, -3.1883, "casual",
     "Trying to get into birdwatching, feels silly to start alone — anyone want to be a beginner with me?"),
    ("persona_seed_138", "Trisha", "Manila, Philippines", 14.5995, 120.9842, "casual",
     "Rewatching the same 6 sitcoms on a loop instead of trying anything new, no regrets."),
    ("persona_seed_139", "Xin", "Singapore", 1.3521, 103.8198, "casual",
     "Terrible at small talk at networking events, need tips from someone who's actually good at it."),
    ("persona_seed_140", "Aditya", "Singapore", 1.3521, 103.8198, "casual",
     "Naturally good at working a room, happy to share what actually works over a coffee chat."),
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
