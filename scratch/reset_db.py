import asyncio
import os
import shutil
import logging
from sqlalchemy import text
from src.db.database import engine, init_db, db_url
from src.db.base import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reset_database():
    print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    
    # 1. Drop existing schemas/tables
    async with engine.begin() as conn:
        if "postgresql" in db_url:
            print("Dropping PostgreSQL schema 'public'...")
            await conn.execute(text("DROP SCHEMA public CASCADE;"))
            await conn.execute(text("CREATE SCHEMA public;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
            await conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
            print("Schema 'public' recreated cleanly.")
        else:
            print("Dropping all SQLite tables...")
            await conn.run_sync(Base.metadata.drop_all)
            print("SQLite tables dropped.")

    # 2. Re-initialize database tables with main schema
    print("Creating all tables according to latest models...")
    await init_db()
    print("All tables created successfully!")

    # 3. Clean Chroma vector store cache
    chroma_dir = os.path.join(".", "data", "chroma")
    if os.path.exists(chroma_dir):
        try:
            shutil.rmtree(chroma_dir)
            print("Cleared vector cache in ./data/chroma.")
        except Exception as e:
            print(f"Notice: Could not clear ./data/chroma: {e}")

    print("\nDATABASE RESET COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(reset_database())
