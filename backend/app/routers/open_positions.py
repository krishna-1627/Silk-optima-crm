from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.open_position import OpenPosition
from app.models.user import User
from app.schemas.open_position import OpenPositionCreate, OpenPositionRead

router = APIRouter(prefix="/open-positions", tags=["open-positions"])


@router.post("", response_model=OpenPositionRead, status_code=status.HTTP_201_CREATED)
def create_open_position(
    payload: OpenPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    position = OpenPosition(**payload.model_dump())
    db.add(position)
    db.commit()
    db.refresh(position)
    return position


@router.get("", response_model=list[OpenPositionRead])
def list_open_positions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(OpenPosition).all()


@router.get("/{position_id}", response_model=OpenPositionRead)
def get_open_position(position_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    position = db.query(OpenPosition).filter(OpenPosition.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Open position not found")
    return position


@router.put("/{position_id}", response_model=OpenPositionRead)
def update_open_position(
    position_id: int,
    payload: OpenPositionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    position = db.query(OpenPosition).filter(OpenPosition.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Open position not found")

    for field, value in payload.model_dump().items():
        setattr(position, field, value)

    db.commit()
    db.refresh(position)
    return position


@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_open_position(
    position_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    position = db.query(OpenPosition).filter(OpenPosition.id == position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Open position not found")

    db.delete(position)
    db.commit()
    return None
