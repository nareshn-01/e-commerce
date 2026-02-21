"""
Admin router for managing products and application features.
Requires admin authentication.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query, Header
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os

from ..database import get_db
from ..models import Product, User, ProductImage
from ..schemas import ProductResponse, ProductCreate, ProductUpdate, ProductImageCreate
from .auth import verify_token as verify_auth_token


def get_current_admin(
    authorization: str = Header(None),
    token: str = None,
) -> User:
    """
    Verify that the current user is an admin.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_auth_token(token)
    email = payload.get("email") if payload else None

    allowed_emails = [
        value.strip().lower()
        for value in os.getenv("ADMIN_EMAILS", "").split(",")
        if value.strip()
    ]

    if not allowed_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access not configured",
        )

    if not email or email.lower() not in allowed_emails:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access admin functions",
        )

    return payload


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


# ==================== PRODUCT MANAGEMENT ====================

@router.get("/products", response_model=List[ProductResponse])
async def get_all_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get all products with optional filtering.
    Admin endpoint for product management.
    """
    query = db.query(Product)
    
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    """Get a specific product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.post("/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new product with optional multiple images.
    Admin endpoint.
    """
    # Check if product with same name already exists
    existing = db.query(Product).filter(Product.name == product.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this name already exists"
        )
    
    db_product = Product(
        name=product.name,
        description=product.description,
        price=product.price,
        stock=product.stock,
        category=product.category,
        image_url=product.image_url,
        rating=product.rating if product.rating is not None else 0.0,
    )
    
    db.add(db_product)
    db.flush()  # Flush to get the product ID
    
    # Add images if provided
    if product.images:
        for idx, img in enumerate(product.images):
            db_image = ProductImage(
                product_id=db_product.id,
                image_url=img.image_url,
                alt_text=img.alt_text,
                display_order=img.display_order if img.display_order else idx,
                is_primary=img.is_primary or idx == 0,
            )
            db.add(db_image)
    elif product.image_url:
        # Create a primary image from the legacy image_url field
        db_image = ProductImage(
            product_id=db_product.id,
            image_url=product.image_url,
            display_order=0,
            is_primary=True,
        )
        db.add(db_image)
    
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
):
    """
    Update an existing product with optional image updates.
    Admin endpoint.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if new name conflicts with another product
    if product_update.name and product_update.name != db_product.name:
        existing = db.query(Product).filter(
            Product.name == product_update.name
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product with this name already exists"
            )
    
    # Update only provided fields
    update_data = product_update.model_dump(exclude_unset=True, exclude={'images'})
    for key, value in update_data.items():
        setattr(db_product, key, value)
    
    # Handle image updates if provided
    if product_update.images is not None:
        # Delete existing images
        db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()
        
        # Add new images
        for idx, img in enumerate(product_update.images):
            db_image = ProductImage(
                product_id=db_product.id,
                image_url=img.image_url,
                alt_text=img.alt_text,
                display_order=img.display_order if img.display_order else idx,
                is_primary=img.is_primary or idx == 0,
            )
            db.add(db_image)
    
    db_product.updated_at = datetime.utcnow()
    
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a product.
    Admin endpoint.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db.delete(db_product)
    db.commit()
    return None


@router.patch("/products/{product_id}/stock", response_model=ProductResponse)
async def update_product_stock(
    product_id: int,
    stock: int,
    db: Session = Depends(get_db),
):
    """
    Update only the stock quantity of a product.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db_product.stock = stock
    db_product.updated_at = datetime.utcnow()
    
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


# ==================== PRODUCT IMAGES ====================

@router.post("/products/{product_id}/images", status_code=status.HTTP_201_CREATED)
async def add_product_image(
    product_id: int,
    image: ProductImageCreate,
    db: Session = Depends(get_db),
):
    """
    Add a new image to a product.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    db_image = ProductImage(
        product_id=product_id,
        image_url=image.image_url,
        alt_text=image.alt_text,
        display_order=image.display_order,
        is_primary=image.is_primary,
    )
    
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    return db_image


@router.get("/products/{product_id}/images")
async def get_product_images(
    product_id: int,
    db: Session = Depends(get_db),
):
    """
    Get all images for a product.
    """
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    images = db.query(ProductImage).filter(
        ProductImage.product_id == product_id
    ).order_by(ProductImage.display_order).all()
    
    return images


@router.delete("/products/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete a specific image from a product.
    """
    db_image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not db_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    db.delete(db_image)
    db.commit()
    return None


@router.patch("/products/{product_id}/images/{image_id}")
async def update_product_image(
    product_id: int,
    image_id: int,
    image_update: ProductImageCreate,
    db: Session = Depends(get_db),
):
    """
    Update image details (alt text, display order, primary status).
    """
    db_image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()
    
    if not db_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    db_image.alt_text = image_update.alt_text or db_image.alt_text
    db_image.display_order = image_update.display_order
    db_image.is_primary = image_update.is_primary
    
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    
    return db_image


# ==================== STATISTICS ====================

@router.get("/stats/products")
async def get_product_stats(db: Session = Depends(get_db)):
    """Get product statistics."""
    total_products = db.query(Product).count()
    categories = db.query(Product.category).distinct().count()
    avg_price = db.query(func.avg(Product.price)).scalar() or 0
    low_stock = db.query(Product).filter(Product.stock < 10).count()
    
    return {
        "total_products": total_products,
        "total_categories": categories,
        "average_price": round(float(avg_price), 2),
        "low_stock_count": low_stock,
    }


@router.get("/categories")
async def get_categories(db: Session = Depends(get_db)):
    """Get all unique product categories."""
    categories = db.query(Product.category).distinct().filter(
        Product.category.isnot(None)
    ).all()
    return [cat[0] for cat in categories if cat[0]]


@router.post("/categories/bulk-create")
async def bulk_create_products(
    products: List[ProductCreate],
    db: Session = Depends(get_db),
):
    """
    Bulk create multiple products.
    Admin endpoint for data migration/import.
    """
    created = []
    skipped = []
    
    for product_data in products:
        # Check if product exists
        existing = db.query(Product).filter(
            Product.name == product_data.name
        ).first()
        
        if existing:
            skipped.append({
                "name": product_data.name,
                "reason": "Product already exists"
            })
            continue
        
        db_product = Product(
            name=product_data.name,
            description=product_data.description,
            price=product_data.price,
            stock=product_data.stock,
            category=product_data.category,
            image_url=product_data.image_url,
        )
        
        db.add(db_product)
        created.append(db_product.name)
    
    if created:
        db.commit()
    
    return {
        "created": len(created),
        "skipped": len(skipped),
        "created_products": created,
        "skipped_products": skipped,
    }


@router.get("/dashboard")
async def get_dashboard_data(db: Session = Depends(get_db)):
    """
    Get comprehensive dashboard data for admin.
    """
    total_products = db.query(Product).count()
    categories_list = db.query(Product.category).distinct().filter(
        Product.category.isnot(None)
    ).all()
    categories = len(categories_list)
    avg_price = db.query(Product).with_entities(
        func.avg(Product.price)
    ).scalar() or 0
    low_stock = db.query(Product).filter(Product.stock < 10).count()
    
    # Get products by category
    products_by_category = {}
    for cat in categories_list:
        if cat[0]:
            count = db.query(Product).filter(
                Product.category == cat[0]
            ).count()
            products_by_category[cat[0]] = count
    
    return {
        "stats": {
            "total_products": total_products,
            "total_categories": categories,
            "average_price": round(float(avg_price), 2),
            "low_stock_count": low_stock,
        },
        "products_by_category": products_by_category,
        "timestamp": datetime.utcnow().isoformat(),
    }
