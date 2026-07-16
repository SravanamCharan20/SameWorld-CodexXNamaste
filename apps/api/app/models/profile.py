from pydantic import BaseModel, Field

from app.models.enums import ContactIntent, Visibility


class ProfileUpsert(BaseModel):
    bio: str = Field(min_length=1, max_length=2000)
    tags: list[str] = Field(default_factory=list)
    links: list[str] = Field(default_factory=list)
    visibility: Visibility = "worldwide"
    contact_intent: ContactIntent = "open_to_conversation"
