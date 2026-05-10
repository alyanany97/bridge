from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel


class GeoPoint(BaseModel):
    lat: float
    lng: float


class ItemBase(BaseModel):
    name: str
    quantity: int


class OfferItem(ItemBase):
    size: Optional[str] = None
    condition: Optional[str] = None
    expires_estimate: Optional[str] = None


class NeedItem(ItemBase):
    urgency: Optional[Literal["low", "medium", "high"]] = None


class CreatePostBody(BaseModel):
    kind: Literal["offer", "need"]
    category: Literal["food", "clothing", "mixed"]
    items: list[dict]
    description: str
    photo_url: str
    location: GeoPoint


class ItemClaim(BaseModel):
    index: int
    quantity: int


class ClaimPostBody(BaseModel):
    matching_post_id: Optional[str] = None
    item_claims: Optional[list[ItemClaim]] = None  # None = claim all at full qty


class ParsePhotoBody(BaseModel):
    photo_url: str
    kind: Literal["offer", "need"]
