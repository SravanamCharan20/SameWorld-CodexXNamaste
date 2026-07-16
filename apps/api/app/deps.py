from fastapi import Header, HTTPException

from app.db.mongo import get_db


async def get_current_persona_id(x_persona_id: str = Header(...)) -> str:
    persona = await get_db().personas.find_one({"_id": x_persona_id})
    if not persona:
        raise HTTPException(status_code=401, detail="Unknown persona_id")
    return x_persona_id
