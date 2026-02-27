from fastapi import APIRouter, Query
from typing import List, Optional
from pydantic import BaseModel
from ..services.recommendation_engine import get_personalized_recommendations

router = APIRouter()


class Recommendation(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    image: str
    category: str
    rating: float
    reviewCount: int


class RecommendationRequest(BaseModel):
    purchase_history: Optional[List[str]] = None
    interests: Optional[List[str]] = None


@router.get("/recommendations", response_model=List[Recommendation])
async def get_recommendations(
    purchase_history: Optional[str] = Query(None, description="Comma-separated list of purchased product IDs"),
    interests: Optional[str] = Query(None, description="Comma-separated list of category interests")
):
    """
    Get personalized product recommendations based on purchase history and interests.
    
    Query Parameters:
    - purchase_history: Comma-separated product IDs (e.g., "1,3,4")
    - interests: Comma-separated categories (e.g., "men,footwear")
    
    Example:
    /api/recommendations?purchase_history=1,3&interests=men,footwear
    """
    # Parse query parameters
    purchase_ids = None
    if purchase_history:
        purchase_ids = [pid.strip() for pid in purchase_history.split(",") if pid.strip()]
    
    interest_list = None
    if interests:
        interest_list = [cat.strip() for cat in interests.split(",") if cat.strip()]
    
    # Get personalized recommendations
    recommended_products = get_personalized_recommendations(
        purchase_history=purchase_ids,
        interests=interest_list,
        limit=5
    )
    
    # Format response
    recommendations = []
    for product in recommended_products:
        recommendations.append({
            "id": product["id"],
            "name": product["name"],
            "brand": product["brand"],
            "price": product["price"],
            "image": product["image"],
            "category": product["category"].capitalize(),
            "rating": product.get("rating", 4.0),
            "reviewCount": product.get("reviewCount", 0)
        })
    
    return recommendations


@router.post("/recommendations", response_model=List[Recommendation])
async def get_recommendations_post(request: RecommendationRequest):
    """
    Get personalized product recommendations via POST request.
    
    Body Parameters:
    - purchase_history: List of purchased product IDs
    - interests: List of category interests
    """
    recommended_products = get_personalized_recommendations(
        purchase_history=request.purchase_history,
        interests=request.interests,
        limit=5
    )
    
    recommendations = []
    for product in recommended_products:
        recommendations.append({
            "id": product["id"],
            "name": product["name"],
            "brand": product["brand"],
            "price": product["price"],
            "image": product["image"],
            "category": product["category"].capitalize(),
            "rating": product.get("rating", 4.0),
            "reviewCount": product.get("reviewCount", 0)
        })
    
    return recommendations
