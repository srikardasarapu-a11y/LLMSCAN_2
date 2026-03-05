"""SQLite database setup using SQLAlchemy async engine."""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Float, Text, DateTime, Integer
from datetime import datetime, timezone
import json

DATABASE_URL = "sqlite+aiosqlite:///./scans.db"

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class ScanResultDB(Base):
    __tablename__ = "scan_results"

    id = Column(String, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    classification = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    token_shifts_json = Column(Text, nullable=False)
    layer_shifts_json = Column(Text, nullable=False)
    tokens_json = Column(Text, nullable=False)
    culprit_layer_idx = Column(Integer, nullable=False, default=0)
    started_layer_idx = Column(Integer, nullable=False, default=0)
    layer_stats_json = Column(Text, nullable=False, default="[]")
    kl_divergence = Column(Float, nullable=False, default=0.0)
    logit_difference = Column(Float, nullable=False, default=0.0)
    token_flip_rate = Column(Float, nullable=False, default=0.0)
    contribution = Column(String, nullable=False, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def token_shifts(self):
        return json.loads(self.token_shifts_json)

    @property
    def layer_shifts(self):
        return json.loads(self.layer_shifts_json)

    @property
    def tokens(self):
        return json.loads(self.tokens_json)

    @property
    def layer_stats(self):
        return json.loads(self.layer_stats_json)


async def init_db():
    """Create all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session():
    """Dependency to get an async DB session."""
    async with async_session() as session:
        yield session
