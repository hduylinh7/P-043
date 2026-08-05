from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.identity.role import Role
from src.db.models.identity.user import User
from src.db.models.identity.user_role import UserRole
from src.models.auth import UserResponse


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

    @staticmethod
    async def get_user_roles(db: AsyncSession, user_id: str) -> list[str]:
        """Fetch all role names assigned to user."""
        stmt = (
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def assign_role(db: AsyncSession, user_id: str, role_name: str) -> list[str]:
        """Assign role to user if not already assigned."""
        clean_role_name = role_name.lower().strip()

        # 1. Fetch or create Role
        stmt_role = select(Role).where(Role.name == clean_role_name)
        res_role = await db.execute(stmt_role)
        role = res_role.scalar_one_or_none()
        if not role:
            role = Role(name=clean_role_name, description=f"{clean_role_name.capitalize()} role")
            db.add(role)
            await db.flush()

        # 2. Check if UserRole association exists
        stmt_ur = select(UserRole).where(UserRole.user_id == user_id, UserRole.role_id == role.id)
        res_ur = await db.execute(stmt_ur)
        user_role = res_ur.scalar_one_or_none()

        if not user_role:
            user_role = UserRole(user_id=user_id, role_id=role.id)
            db.add(user_role)
            await db.commit()

        return await UserRepository.get_user_roles(db, user_id)

    @staticmethod
    async def build_user_dto(db: AsyncSession, user: User) -> UserResponse:
        """Build UserResponse DTO with populated roles list."""
        roles = await UserRepository.get_user_roles(db, user.id)
        return UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_verified=user.is_verified,
            roles=roles,
        )

