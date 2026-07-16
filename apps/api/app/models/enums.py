from typing import Literal

Kind = Literal["NOW", "OPEN", "PROFILE"]
Intent = Literal[
    "need", "offer", "question", "experience", "goal", "opinion", "moment", "other"
]
Visibility = Literal["worldwide", "country", "region"]
ContactIntent = Literal["just_sharing", "open_to_conversation", "actively_looking"]
Status = Literal["active", "resolved", "expired", "blocked"]
