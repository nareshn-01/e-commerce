"""
AI Recommendation Engine - Personalized Product Recommendations
Uses:
- Collaborative filtering (similar user preferences)
- Content-based filtering (similar product attributes)
- Browsing history analysis
"""

from typing import List, Set, Optional, Dict
from sqlalchemy.orm import Session


def calculate_product_similarity(product1, product2) -> float:
    """
    Calculate similarity between two products based on:
    - Category match (60%)
    - Price range (30%)
    - Rating (10%)
    """
    score = 0.0
    
    # Category match (most important)
    if hasattr(product1, 'category') and hasattr(product2, 'category'):
        if product1.category == product2.category:
            score += 0.6
    
    # Price similarity (products in similar price range)
    if hasattr(product1, 'price') and hasattr(product2, 'price') and product1.price and product2.price:
        price_ratio = min(product1.price, product2.price) / max(product1.price, product2.price)
        if price_ratio > 0.7:  # Within 70% price range
            score += 0.3
    
    # Rating bonus (high-quality products)
    if hasattr(product1, 'rating') and hasattr(product2, 'rating'):
        if product1.rating >= 4.0 and product2.rating >= 4.0:
            score += 0.1
    
    return score


def get_content_based_recommendations(
    product_id: str,
    db: Session,
    limit: int = 5
) -> List:
    """
    Get recommendations similar to a given product.
    Uses product attributes (category, price, rating).
    """
    from ..models import Product
    
    # Find the reference product
    reference_product = db.query(Product).filter(Product.id == product_id).first()
    if not reference_product:
        return []
    
    # Get all other products
    all_products = db.query(Product).filter(Product.id != product_id).all()
    
    # Calculate similarities
    similarities = []
    for product in all_products:
        similarity_score = calculate_product_similarity(reference_product, product)
        if similarity_score > 0:
            similarities.append((product, similarity_score))
    
    # Sort by similarity and return top results
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [p[0] for p in similarities[:limit]]


def get_collaborative_recommendations(
    user_category_interests: List[str],
    db: Session,
    limit: int = 5,
    exclude_product_ids: Optional[Set[str]] = None
) -> List:
    """
    Get recommendations based on user's category interests.
    Weights by category and rating.
    """
    from ..models import Product
    
    exclude_ids = exclude_product_ids or set()
    
    # Get products in interested categories
    recommendations = []
    for category in user_category_interests:
        products = db.query(Product).filter(
            Product.category == category,
            ~Product.id.in_(exclude_ids)
        ).order_by(Product.rating.desc()).limit(limit).all()
        recommendations.extend(products)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_recs = []
    for product in recommendations:
        if product.id not in seen:
            seen.add(product.id)
            unique_recs.append(product)
    
    return unique_recs[:limit]


def get_trending_products(
    db: Session,
    limit: int = 5,
    exclude_product_ids: Optional[Set[str]] = None
) -> List:
    """
    Get trending/best-rated products.
    Good fallback recommendation.
    """
    from ..models import Product
    
    exclude_ids = exclude_product_ids or set()
    
    products = db.query(Product).filter(
        ~Product.id.in_(exclude_ids)
    ).order_by(
        Product.rating.desc(),
        Product.stock.desc()
    ).limit(limit).all()
    
    return products


def get_personalized_recommendations(
    user_history: Optional[List[int]] = None,
    user_interests: Optional[List[str]] = None,
    db: Session = None,
    limit: int = 5
) -> List:
    """
    Main recommendation function combining multiple strategies.
    
    Strategy:
    1. If user has interests: use collaborative filtering by category
    2. If user has history: find similar products to their purchases
    3. Fallback: show trending/highest-rated products
    
    Args:
        user_history: List of product IDs user has viewed/purchased
        user_interests: List of category names user is interested in
        db: Database session
        limit: Number of recommendations to return
    
    Returns:
        List of recommended products
    """
    if not db:
        return []
    
    recommendations = []
    exclude_ids = set(str(pid) for pid in (user_history or []))
    
    # Strategy 1: Collaborative filtering by interests
    if user_interests and len(user_interests) > 0:
        recs = get_collaborative_recommendations(
            user_interests,
            db,
            limit=limit,
            exclude_product_ids=exclude_ids
        )
        recommendations.extend(recs)
    
    # Strategy 2: Content-based (similar to last viewed product)
    if user_history and len(user_history) > 0 and len(recommendations) < limit:
        last_product_id = str(user_history[-1])
        recs = get_content_based_recommendations(
            last_product_id,
            db,
            limit=limit - len(recommendations)
        )
        recommendations.extend(recs)
    
    # Strategy 3: Trending products (fallback)
    if len(recommendations) < limit:
        current_exclude = exclude_ids.union(set(str(p.id) for p in recommendations))
        recs = get_trending_products(
            db,
            limit=limit - len(recommendations),
            exclude_product_ids=current_exclude
        )
        recommendations.extend(recs)
    
    return recommendations[:limit]
