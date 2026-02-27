from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============ ERROR RESPONSES ============
class ErrorResponse(BaseModel):
    detail: str
    status_code: int


class ValidationError(BaseModel):
    field: str
    message: str


class ErrorDetail(BaseModel):
    errors: List[ValidationError]
    status_code: int


# ============ USER SCHEMAS ============
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ AUTHENTICATION ============
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


# ============ PRODUCT SCHEMAS ============
class ProductImageBase(BaseModel):
    image_url: str
    alt_text: Optional[str] = None
    display_order: int = 0
    is_primary: bool = False


class ProductImageCreate(ProductImageBase):
    pass


class ProductImageResponse(ProductImageBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    category: Optional[str] = None
    image_url: Optional[str] = None
    rating: float = 0.0


class ProductCreate(ProductBase):
    images: Optional[List[ProductImageCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    rating: Optional[float] = None
    images: Optional[List[ProductImageCreate]] = None


class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    images: List[ProductImageResponse] = []

    class Config:
        from_attributes = True


# ============ ORDER SCHEMAS ============
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase):
    id: int
    price: float

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    pass


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


class OrderResponse(OrderBase):
    id: int
    user_id: int
    total_price: float
    status: str
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True


# ============ WISHLIST SCHEMAS ============
class WishlistItemResponse(BaseModel):
    id: int
    product_id: int
    added_at: datetime

    class Config:
        from_attributes = True


# ============ REVIEW SCHEMAS ============
class ReviewBase(BaseModel):
    rating: int
    comment: Optional[str] = None


class ReviewCreate(ReviewBase):
    product_id: int


class ReviewResponse(ReviewBase):
    id: int
    user_id: int
    product_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
