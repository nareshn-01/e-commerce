"""
Public Products API - For frontend use (no auth required)
Includes recommendations and smart search
"""

from fastapi import APIRouter, Query, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import Product
from ..services.ai_recommendations import get_personalized_recommendations
from ..services.smart_search import SmartSearchEngine
from datetime import datetime

router = APIRouter(prefix="/api/products", tags=["products"])


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    category: Optional[str] = None
    image_url: Optional[str] = None
    rating: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get a single product by ID (public endpoint)."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"error": "Product not found"}, 404
    return product


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("rating", regex="^(rating|price|new)$"),
    db: Session = Depends(get_db)
):
    """
    Get products with filtering and sorting.
    
    Query parameters:
    - skip: Number of products to skip (pagination)
    - limit: Number of products to return
    - category: Filter by category
    - search: Search in product name/description
    - sort_by: Sort by rating, price, or newest
    """
    query = db.query(Product)
    
    # Filter by category
    if category:
        query = query.filter(Product.category.ilike(f"%{category}%"))
    
    # Search
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.description.ilike(f"%{search}%"))
        )
    
    # Sort
    if sort_by == "price":
        query = query.order_by(Product.price)
    elif sort_by == "new":
        query = query.order_by(Product.created_at.desc())
    else:  # rating (default)
        query = query.order_by(Product.rating.desc())
    
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/recommendations/for-you", response_model=List[ProductResponse])
async def get_recommendations_for_user(
    viewed_products: Optional[str] = Query(None, description="Comma-separated product IDs viewed"),
    interests: Optional[str] = Query(None, description="Comma-separated categories of interest"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get personalized product recommendations.
    
    Uses AI to combine:
    - User browsing history
    - Category interests
    - Trending products
    
    Query parameters:
    - viewed_products: Comma-separated IDs of products user viewed (e.g., "1,3,5")
    - interests: Comma-separated category names (e.g., "Electronics,Mobile")
    - limit: Number of recommendations (default: 5, max: 20)
    
    Example:
    GET /api/products/recommendations/for-you?viewed_products=1,2&interests=Electronics&limit=8
    """
    # Parse inputs
    user_history = None
    if viewed_products:
        try:
            user_history = [int(pid.strip()) for pid in viewed_products.split(",") if pid.strip()]
        except ValueError:
            user_history = None
    
    user_interests = None
    if interests:
        user_interests = [cat.strip() for cat in interests.split(",") if cat.strip()]
    
    # Get recommendations
    recommended_products = get_personalized_recommendations(
        user_history=user_history,
        user_interests=user_interests,
        db=db,
        limit=limit
    )
    
    return recommended_products


@router.get("/{product_id}/similar", response_model=List[ProductResponse])
async def get_similar_products(
    product_id: int,
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get products similar to a given product.
    Uses category, price, and rating similarity.
    """
    from ..services.ai_recommendations import get_content_based_recommendations
    
    similar_products = get_content_based_recommendations(
        str(product_id),
        db,
        limit=limit
    )
    
    return similar_products


class SearchResponse(BaseModel):
    """Response model for search results with suggestions."""
    results: List[ProductResponse]
    suggestions: List[str] = []
    total_count: int = 0
    

@router.get("/search/smart", response_model=SearchResponse)
async def smart_search(
    query: str = Query(..., min_length=1, description="Search query"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    limit: int = Query(20, ge=1, le=100, description="Max results"),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    sort_by: Optional[str] = Query("relevance", regex="^(relevance|price|rating|newest)$"),
    db: Session = Depends(get_db)
):
    """
    Smart AI-powered product search with typo tolerance and semantic matching.
    
    Features:
    - Typo tolerance (Levenshtein distance)
    - Semantic search (understands meaning)
    - Category autocomplete
    - Relevance-based ranking
    - Smart suggestions if no matches found
    
    Query parameters:
    - query: Search query (product name, brand, etc.) - REQUIRED
    - category: Optional category filter (e.g., "Electronics")
    - limit: Number of results (1-100, default 20)
    - skip: Pagination offset (default 0)
    - sort_by: Sort order (relevance, price, rating, newest)
    
    Examples:
    GET /api/products/search/smart?query=laptop
    GET /api/products/search/smart?query=iphone&category=Mobile&sort_by=price
    GET /api/products/search/smart?query=shirs&limit=10  (typo tolerant)
    """
    search_engine = SmartSearchEngine(db)
    
    products, suggestions = search_engine.search_products(
        query=query,
        category=category,
        limit=limit,
        skip=skip,
        sort_by=sort_by
    )
    
    # Convert to response model
    product_responses = [
        ProductResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            price=p.price,
            stock=p.stock,
            category=p.category,
            image_url=p.image_url,
            rating=p.rating,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in products
    ]
    
    return SearchResponse(
        results=product_responses,
        suggestions=suggestions,
        total_count=len(product_responses)
    )


@router.get("/search/autocomplete", response_model=List[str])
async def search_autocomplete(
    prefix: str = Query(..., min_length=2, description="Search prefix"),
    limit: int = Query(10, ge=1, le=20, description="Max suggestions"),
    db: Session = Depends(get_db)
):
    """
    Get autocomplete suggestions for search prefix.
    
    Returns product names and categories that start with the given prefix.
    
    Query parameters:
    - prefix: Search prefix (minimum 2 characters) - REQUIRED
    - limit: Number of suggestions (1-20, default 10)
    
    Example:
    GET /api/products/search/autocomplete?prefix=lap&limit=5
    Returns: ["Laptop", "Laptop Pro", "Laptop Stand", "Large Monitor", ...]
    """
    search_engine = SmartSearchEngine(db)
    suggestions = search_engine.get_search_suggestions(prefix, limit)
    return suggestions


@router.post("/search/visual", response_model=List[ProductResponse])
async def visual_search(
    file: UploadFile = File(..., description="Image file to search by"),
    limit: int = Query(12, ge=1, le=50, description="Max results"),
    db: Session = Depends(get_db)
):
    """
    Search for products by uploading an image.
    
    The AI analyzes:
    - Dominant colors
    - Style and category
    - Visual features
    
    And returns visually similar products.
    
    Query parameters:
    - limit: Number of results (1-50, default 12)
    
    Example:
    POST /api/products/search/visual
    Form data: file=<image_file>
    """
    from ..utils.image_preprocessing import base64_to_image
    from ..services.visual_search import VisualSearchEngine
    from PIL import Image
    import io
    
    try:
        # Validate file
        if not file.content_type.startswith('image/'):
            raise ValueError("File must be an image")
        
        # Read and convert to PIL Image
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        image = image.convert('RGB')
        
        # Search
        search_engine = VisualSearchEngine(db)
        similar_products = search_engine.search_by_image(image, limit=limit)
        
        # Convert to response model
        product_responses = [
            ProductResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                price=p.price,
                stock=p.stock,
                category=p.category,
                image_url=p.image_url,
                rating=p.rating,
                created_at=p.created_at,
                updated_at=p.updated_at
            )
            for p in similar_products
        ]
        
        return product_responses
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Visual search failed: {str(e)}")
