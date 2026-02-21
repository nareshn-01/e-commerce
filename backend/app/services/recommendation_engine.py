"""
Recommendation engine service for personalized product recommendations.
"""

# Sample product database (in a real app, this would come from a database)
PRODUCTS = [
    {
        "id": "1",
        "name": "Slim Fit Cotton Shirt",
        "brand": "Roadster",
        "price": 29.99,
        "image": "/blue-cotton-shirt-men.jpg",
        "category": "men",
        "rating": 4.2,
        "reviewCount": 1243,
    },
    {
        "id": "2",
        "name": "Floral Print Maxi Dress",
        "brand": "MANGO",
        "price": 59.99,
        "image": "/floral-maxi-dress-women.jpg",
        "category": "women",
        "rating": 4.5,
        "reviewCount": 856,
    },
    {
        "id": "3",
        "name": "Classic Denim Jacket",
        "brand": "Levi's",
        "price": 79.99,
        "image": "/denim-jacket-blue.jpg",
        "category": "men",
        "rating": 4.7,
        "reviewCount": 2341,
    },
    {
        "id": "4",
        "name": "Running Sneakers",
        "brand": "Nike",
        "price": 119.99,
        "image": "/running-sneakers-nike.jpg",
        "category": "footwear",
        "rating": 4.6,
        "reviewCount": 3421,
    },
    {
        "id": "5",
        "name": "Casual Summer Shorts",
        "brand": "H&M",
        "price": 34.99,
        "image": "/casual-shorts-mens.jpg",
        "category": "men",
        "rating": 4.1,
        "reviewCount": 567,
    },
    {
        "id": "6",
        "name": "Elegant Blazer",
        "brand": "Zara",
        "price": 99.99,
        "image": "/elegant-blazer-women.jpg",
        "category": "women",
        "rating": 4.8,
        "reviewCount": 1876,
    },
    {
        "id": "7",
        "name": "Vintage Leather Belt",
        "brand": "Coach",
        "price": 49.99,
        "image": "/leather-belt-vintage.jpg",
        "category": "accessories",
        "rating": 4.4,
        "reviewCount": 892,
    },
    {
        "id": "8",
        "name": "Canvas Backpack",
        "brand": "Fjallraven",
        "price": 89.99,
        "image": "/canvas-backpack-khaki.jpg",
        "category": "accessories",
        "rating": 4.9,
        "reviewCount": 5234,
    },
    {
        "id": "9",
        "name": "Wool Winter Coat",
        "brand": "Canada Goose",
        "price": 349.99,
        "image": "/wool-winter-coat.jpg",
        "category": "women",
        "rating": 4.7,
        "reviewCount": 2134,
    },
    {
        "id": "10",
        "name": "Casual Chinos",
        "brand": "Dockers",
        "price": 54.99,
        "image": "/casual-chinos-khaki.jpg",
        "category": "men",
        "rating": 4.3,
        "reviewCount": 1456,
    },
]


def get_personalized_recommendations(
    purchase_history=None, interests=None, limit=5
):
    """
    Get personalized product recommendations based on purchase history and interests.
    
    Args:
        purchase_history: List of product IDs previously purchased
        interests: List of category interests (e.g., ['men', 'footwear'])
        limit: Maximum number of recommendations to return
    
    Returns:
        List of recommended products
    """
    recommendations = []
    
    # Convert to sets for easier operations
    purchased_ids = set(purchase_history) if purchase_history else set()
    interest_categories = set(interests) if interests else set()
    
    # If user has interests, prioritize matching products
    if interest_categories:
        for product in PRODUCTS:
            if (
                product["id"] not in purchased_ids
                and product["category"] in interest_categories
            ):
                recommendations.append(product)
    
    # Fill remaining recommendations with top-rated products
    if len(recommendations) < limit:
        for product in PRODUCTS:
            if (
                product["id"] not in purchased_ids
                and product not in recommendations
            ):
                recommendations.append(product)
    
    # Sort by rating and limit results
    recommendations.sort(key=lambda x: x["rating"], reverse=True)
    return recommendations[:limit]
