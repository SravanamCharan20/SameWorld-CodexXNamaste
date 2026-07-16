from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.mongo import get_db
from app.envelope import ok
from app.models.persona import serialize_persona

router = APIRouter()


class PersonaLoginRequest(BaseModel):
    persona_id: str


@router.get("/personas")
async def list_personas():
    cursor = get_db().personas.find().sort("display_name", 1)
    personas = [serialize_persona(doc) async for doc in cursor]
    return ok(personas)


@router.get("/personas/{persona_id}")
async def get_persona(persona_id: str):
    persona = await get_db().personas.find_one({"_id": persona_id})
    if not persona:
        raise HTTPException(status_code=404, detail="Unknown persona_id")
    return ok(serialize_persona(persona))


@router.post("/auth/persona-login")
async def persona_login(body: PersonaLoginRequest):
    persona = await get_db().personas.find_one({"_id": body.persona_id})
    if not persona:
        raise HTTPException(status_code=404, detail="Unknown persona_id")
    return ok(serialize_persona(persona))
