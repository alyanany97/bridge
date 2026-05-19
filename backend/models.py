from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class ItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    quantity: int = Field(..., ge=1, le=999)


class OfferItem(ItemBase):
    size: Optional[str] = Field(None, max_length=50)
    condition: Optional[str] = Field(None, max_length=50)
    expires_estimate: Optional[str] = Field(None, max_length=100)


class NeedItem(ItemBase):
    urgency: Optional[Literal["low", "medium", "high"]] = None


class CreatePostBody(BaseModel):
    kind: Literal["offer", "need"]
    category: Literal["food", "clothing", "mixed"]
    items: list[dict] = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=2000)
    photo_url: str = Field(..., min_length=1, max_length=2048)
    location: GeoPoint

    @field_validator("photo_url")
    @classmethod
    def photo_url_must_be_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("photo_url must use HTTPS")
        return v

    @field_validator("items")
    @classmethod
    def items_must_have_names(cls, v: list[dict]) -> list[dict]:
        for item in v:
            if not isinstance(item.get("name"), str) or not item["name"].strip():
                raise ValueError("Every item must have a non-empty name")
            if not isinstance(item.get("quantity"), int) or item["quantity"] < 1:
                raise ValueError("Every item must have a quantity >= 1")
        return v

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        return v.strip()


class ItemClaim(BaseModel):
    index: int = Field(..., ge=0)
    quantity: int = Field(..., ge=1, le=999)


class ClaimPostBody(BaseModel):
    matching_post_id: Optional[str] = None
    item_claims: Optional[list[ItemClaim]] = Field(None, max_length=50)


class ParsePhotoBody(BaseModel):
    photo_url: str = Field(..., min_length=1, max_length=2048)
    kind: Literal["offer", "need"]

    @field_validator("photo_url")
    @classmethod
    def photo_url_must_be_https(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("photo_url must use HTTPS")
        return v


class SetRoleBody(BaseModel):
    role: Literal["helper", "needy", "driver"]
    display_name: Optional[str] = Field(None, max_length=100)
    location: Optional[GeoPoint] = None


class RegisterFcmTokenBody(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)


class RemoveFcmTokenBody(BaseModel):
    token: str = Field(..., min_length=10, max_length=512)


class RateMatchBody(BaseModel):
    rated_uid: str = Field(..., min_length=1)
    stars: int = Field(..., ge=1, le=5)
    comment: str = Field("", max_length=500)

    @field_validator("comment")
    @classmethod
    def strip_comment(cls, v: str) -> str:
        return v.strip()


class CancelMatchBody(BaseModel):
    reason: Optional[str] = Field(None, max_length=200)
