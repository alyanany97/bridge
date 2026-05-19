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
    role: Literal["helper", "needy", "driver", "organization"]
    display_name: Optional[str] = Field(None, max_length=100)
    location: Optional[GeoPoint] = None
    # Organization-specific (required when role == "organization")
    business_name: Optional[str] = Field(None, max_length=200)
    business_type: Optional[Literal[
        "restaurant", "grocery", "retail", "office", "food_bank", "other"
    ]] = None

    @field_validator("business_name")
    @classmethod
    def org_requires_business_name(cls, v, info):
        if info.data.get("role") == "organization" and not v:
            raise ValueError("business_name is required for organizations")
        return v


class UpdateProfileBody(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=300)
    location: Optional[GeoPoint] = None
    # Driver-specific
    vehicle_type: Optional[Literal["walking", "bike", "car", "van"]] = None
    # Organization-specific
    business_name: Optional[str] = Field(None, max_length=200)
    business_type: Optional[Literal[
        "restaurant", "grocery", "retail", "office", "food_bank", "other"
    ]] = None
    website: Optional[str] = Field(None, max_length=200)

    @field_validator("website")
    @classmethod
    def website_must_be_https(cls, v: Optional[str]) -> Optional[str]:
        if v and not (v.startswith("https://") or v.startswith("http://")):
            raise ValueError("website must be a valid URL")
        return v


class ResolveReportBody(BaseModel):
    action: Literal["resolve", "dismiss"]
    note: Optional[str] = Field(None, max_length=500)


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


class ReportBody(BaseModel):
    target_type: Literal["post", "user", "message"]
    target_id: str = Field(..., min_length=1, max_length=128)
    reason: Literal["spam", "inappropriate", "offensive", "fake", "other"]
    details: Optional[str] = Field(None, max_length=500)

    @field_validator("details")
    @classmethod
    def strip_details(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
