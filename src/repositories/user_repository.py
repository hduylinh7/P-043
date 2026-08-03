from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.identity.user import User


class UserRepository:
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        """Fetch user by email address."""
        stmt = select(User).where(User.email == email.lower().strip())
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: str) -> User | None:
        """Fetch user by primary key ID."""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_user(
        db: AsyncSession,
        email: str,
        hashed_password: str | None = None,
        full_name: str = "",
        is_verified: bool = False,
    ) -> User:
        """Create and persist new User instance."""
        user = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            full_name=full_name.strip(),
            is_active=True,
            is_verified=is_verified,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def mark_user_verified(db: AsyncSession, user_id: str) -> User | None:
        """Update user verification status to True."""
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None
        user.is_verified = True
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_password(
        db: AsyncSession,
        user_id: str,
        new_hashed_password: str,
    ) -> User | None:
        """Update user password hash."""
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            return None
        user.hashed_password = new_hashed_password
        await db.commit()
        await db.refresh(user)
        return user
