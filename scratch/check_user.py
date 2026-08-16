import asyncio
from src.db.database import AsyncSessionLocal
from sqlalchemy import select
from src.db.models.identity.user import User
from src.core.security import hash_password

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Name: {u.full_name}")
            # Set password to 'password123' for testing
            u.hashed_password = hash_password("password123")
            db.add(u)
        await db.commit()
        print("Updated all user passwords to 'password123' successfully!")

if __name__ == "__main__":
    asyncio.run(main())
