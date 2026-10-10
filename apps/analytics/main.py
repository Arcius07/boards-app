from datetime import date, datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from auth import current_user_id
from db import get_db

app = FastAPI(title="Boards Analytics")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["Authorization"],
)

WEEKS = 8


class ListCount(BaseModel):
    board: str
    list: str
    cards: int


class Summary(BaseModel):
    total_cards: int
    overdue_cards: int
    by_list: list[ListCount]


class WeekCount(BaseModel):
    week: date
    completed: int


class WeekCycle(BaseModel):
    week: date
    avg_days: float | None
    completed: int


class CycleTime(BaseModel):
    average_days: float | None
    by_week: list[WeekCycle]


def last_weeks(n: int) -> list[date]:
    # Postgres date_trunc('week') starts weeks on Monday, so we do the same.
    today = datetime.utcnow().date()
    this_monday = today - timedelta(days=today.weekday())
    return [this_monday - timedelta(weeks=i) for i in range(n - 1, -1, -1)]


async def require_member(db: AsyncSession, workspace_id: str, user_id: str):
    result = await db.execute(
        text('SELECT 1 FROM "WorkspaceMember" WHERE "workspaceId" = :w AND "userId" = :u'),
        {"w": workspace_id, "u": user_id},
    )
    if result.first() is None:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/analytics/workspaces/{workspace_id}/summary", response_model=Summary)
async def summary(
    workspace_id: str,
    user_id: str = Depends(current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await require_member(db, workspace_id, user_id)

    rows = await db.execute(
        text(
            """
            SELECT b.name AS board, l.name AS list, COUNT(c.id) AS cards
            FROM "Board" b
            JOIN "List" l ON l."boardId" = b.id
            LEFT JOIN "Card" c ON c."listId" = l.id
            WHERE b."workspaceId" = :w
            GROUP BY b.id, b.name, l.id, l.name, l.position
            ORDER BY b.name, l.position
            """
        ),
        {"w": workspace_id},
    )
    by_list = [ListCount(board=r.board, list=r.list, cards=r.cards) for r in rows]

    overdue = await db.execute(
        text(
            """
            SELECT COUNT(c.id) AS n
            FROM "Card" c
            JOIN "List" l ON l.id = c."listId"
            JOIN "Board" b ON b.id = l."boardId"
            WHERE b."workspaceId" = :w
              AND c."dueDate" IS NOT NULL
              AND c."dueDate" < (NOW() AT TIME ZONE 'UTC')
              AND l.name <> 'Done'
            """
        ),
        {"w": workspace_id},
    )

    return Summary(
        total_cards=sum(item.cards for item in by_list),
        overdue_cards=overdue.scalar_one(),
        by_list=by_list,
    )


@app.get("/analytics/workspaces/{workspace_id}/velocity", response_model=list[WeekCount])
async def velocity(
    workspace_id: str,
    user_id: str = Depends(current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await require_member(db, workspace_id, user_id)

    weeks = last_weeks(WEEKS)
    rows = await db.execute(
        text(
            """
            SELECT date_trunc('week', c."completedAt") AS week, COUNT(*) AS completed
            FROM "Card" c
            JOIN "List" l ON l.id = c."listId"
            JOIN "Board" b ON b.id = l."boardId"
            WHERE b."workspaceId" = :w
              AND c."completedAt" IS NOT NULL
              AND c."completedAt" >= :start
            GROUP BY week
            ORDER BY week
            """
        ),
        {"w": workspace_id, "start": datetime.combine(weeks[0], datetime.min.time())},
    )
    found = {r.week.date(): r.completed for r in rows}

    # Fill weeks with no completions so the chart shows honest zeros.
    return [WeekCount(week=w, completed=found.get(w, 0)) for w in weeks]


@app.get("/analytics/workspaces/{workspace_id}/cycle-time", response_model=CycleTime)
async def cycle_time(
    workspace_id: str,
    user_id: str = Depends(current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await require_member(db, workspace_id, user_id)

    weeks = last_weeks(WEEKS)
    rows = await db.execute(
        text(
            """
            SELECT date_trunc('week', c."completedAt") AS week,
                   AVG(EXTRACT(EPOCH FROM (c."completedAt" - c."createdAt")) / 86400.0) AS avg_days,
                   COUNT(*) AS completed
            FROM "Card" c
            JOIN "List" l ON l.id = c."listId"
            JOIN "Board" b ON b.id = l."boardId"
            WHERE b."workspaceId" = :w
              AND c."completedAt" IS NOT NULL
              AND c."completedAt" >= :start
            GROUP BY week
            ORDER BY week
            """
        ),
        {"w": workspace_id, "start": datetime.combine(weeks[0], datetime.min.time())},
    )
    found = {r.week.date(): r for r in rows}

    overall = await db.execute(
        text(
            """
            SELECT AVG(EXTRACT(EPOCH FROM (c."completedAt" - c."createdAt")) / 86400.0) AS avg_days
            FROM "Card" c
            JOIN "List" l ON l.id = c."listId"
            JOIN "Board" b ON b.id = l."boardId"
            WHERE b."workspaceId" = :w AND c."completedAt" IS NOT NULL
            """
        ),
        {"w": workspace_id},
    )
    avg = overall.scalar_one()

    by_week = []
    for w in weeks:
        r = found.get(w)
        by_week.append(
            WeekCycle(
                week=w,
                avg_days=round(float(r.avg_days), 1) if r else None,
                completed=r.completed if r else 0,
            )
        )

    return CycleTime(
        average_days=round(float(avg), 1) if avg is not None else None,
        by_week=by_week,
    )