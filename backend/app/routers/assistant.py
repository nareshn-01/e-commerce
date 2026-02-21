from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from typing import List, Optional, Dict
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Product
from ..services.image_analyzer import analyze_outfit_match

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


class ProductModel(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    image: str
    category: str
    rating: float
    reviewCount: int


class ChatRequest(BaseModel):
    messages: List[Message]
    question: Optional[str] = None
    interests: Optional[List[str]] = None


class ChatResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None
    products: Optional[List[ProductModel]] = None


class OutfitAnalysisRequest(BaseModel):
    image: str
    product: dict
    location: Optional[str] = None


class OutfitAnalysisResponse(BaseModel):
    matchScore: int
    colorHarmony: str
    styleMatch: str
    suggestions: List[str]
    aiRecommendations: Optional[List[Dict[str, str]]] = None
    previewImage: Optional[str] = None
    detectedGender: Optional[str] = None
    detectedBodyType: Optional[str] = None
    skinTone: Optional[str] = None
    dominantColors: Optional[List[str]] = None


def get_ai_style_recommendations(gender: str, body_type: str, skin_tone: str, location: Optional[str] = None, limit: int = 5) -> List[Dict[str, str]]:
    """
    Generate AI-powered style recommendations based on detected features.
    Returns curated style suggestions, not real product recommendations.
    """
    recommendations = []
    
    # Regional climate and style preferences
    climate_styles = {
        "tropical": ["Lightweight fabrics", "Breathable materials", "Light colors"],
        "temperate": ["Layering pieces", "Mixed fabrics", "Versatile colors"],
        "cold": ["Warm outerwear", "Heavy textures", "Insulating materials"],
        "urban": ["Modern cuts", "Statement pieces", "Monochrome palettes"],
        "casual": ["Comfortable fits", "Relaxed styles", "Neutral tones"],
    }
    
    # Body type specific style recommendations
    body_recommendations = {
        "athletic": {
            "man": [
                {"style": "Fitted V-neck shirts", "reason": "Showcase broad shoulders, elongate torso"},
                {"style": "Straight-fit jeans", "reason": "Balance athletic upper body"},
                {"style": "Structured jackets", "reason": "Complement muscular build without excess bulk"},
                {"style": "Dark wash denim", "reason": "Create sleek, streamlined silhouette"},
                {"style": "Henley shirts", "reason": "Highlight arm definition while remaining professional"}
            ],
            "woman": [
                {"style": "Tailored blazers", "reason": "Emphasize strong shoulders"},
                {"style": "Form-fitting leggings", "reason": "Showcase toned legs"},
                {"style": "Athletic-inspired tops", "reason": "Celebrate muscular definition"},
                {"style": "Structured dresses", "reason": "Work with your defined shape"},
                {"style": "High-waisted bottoms", "reason": "Create balanced proportions"}
            ]
        },
        "curvy": [
            {"style": "Wrap dresses", "reason": "Define waist and flatter curves"},
            {"style": "Ruched fabrics", "reason": "Add dimension and highlight best features"},
            {"style": "Peplum tops", "reason": "Balance proportions beautifully"},
            {"style": "Fit-and-flare silhouettes", "reason": "Accentuate curves elegantly"},
            {"style": "Darker hemlines", "reason": "Ground your proportions"}
        ],
        "lean": [
            {"style": "Oversized blazers", "reason": "Add volume and dimension"},
            {"style": "Layered pieces", "reason": "Create visual texture and depth"},
            {"style": "Cropped tops", "reason": "Elongate your proportions"},
            {"style": "Loose-fit pants", "reason": "Create balanced silhouette"},
            {"style": "Textured fabrics", "reason": "Add visual interest to slim frame"}
        ],
        "pear": [
            {"style": "A-line skirts", "reason": "Balance pear-shaped proportions"},
            {"style": "Bright upper body colors", "reason": "Draw attention upward"},
            {"style": "Detailed tops", "reason": "Highlight your upper frame"},
            {"style": "Wide-leg pants", "reason": "Balance hip and thigh width"},
            {"style": "Pattern play up top", "reason": "Create visual interest above the waist"}
        ],
        "rectangle": [
            {"style": "Belted pieces", "reason": "Create definition at waist"},
            {"style": "Peplum hemlines", "reason": "Add curves and volume"},
            {"style": "Cropped jackets", "reason": "Shorten silhouette proportions"},
            {"style": "Fitted waistlines", "reason": "Create shape and dimension"},
            {"style": "Vertical patterns", "reason": "Elongate your frame"}
        ],
        "stocky": [
            {"style": "Vertical striping", "reason": "Create lengthening effect"},
            {"style": "Monochrome outfits", "reason": "Create seamless, lengthened line"},
            {"style": "Structured fabrics", "reason": "Create polished appearance"},
            {"style": "Longer jackets", "reason": "Balance proportions"},
            {"style": "V-necks and deep necklines", "reason": "Create vertical line through neck"}
        ]
    }
    
    # Get appropriate recommendations
    gender_specific = body_recommendations.get(body_type, {}).get(gender)
    body_specific = body_recommendations.get(body_type, [])
    style_recs = gender_specific if isinstance(gender_specific, list) else body_specific
    
    if not style_recs:
        style_recs = [
            {"style": "Well-fitted basics", "reason": "Foundation for any wardrobe"},
            {"style": "Classic neutral colors", "reason": "Versatile and timeless"},
            {"style": "Quality fabrics", "reason": "Invest in pieces that last"},
            {"style": "Personal style staples", "reason": "Build confidence in your look"},
            {"style": "Tailored fits", "reason": "Proper fit matters most"}
        ]
    
    recommendations = style_recs[:limit]
    
    # Add location-based climate adjustments if provided
    if location:
        location_lower = location.lower()
        for rec in recommendations:
            if any(climate in location_lower for climate in climate_styles.keys()):
                matching_climate = [c for c in climate_styles.keys() if c in location_lower][0]
                climate_note = f" (for {matching_climate} climate)"
                rec["reason"] = rec.get("reason", "") + climate_note
    
    return recommendations


def get_product_recommendations(db: Session, query: str, interests: Optional[List[str]] = None, limit: int = 4) -> List[ProductModel]:
    """Get product recommendations based on search query and interests"""
    
    # Map common terms to categories
    category_map = {
        'men': 'Fashion',
        'men\'s': 'Fashion',
        'women': 'Fashion',
        'women\'s': 'Fashion',
        'kids': 'Fashion',
        'shoes': 'Footwear',
        'boots': 'Footwear',
        'sneakers': 'Footwear',
        'phone': 'Mobile & Accessories',
        'mobile': 'Mobile & Accessories',
        'laptop': 'Electronics',
        'computer': 'Electronics',
        'headphones': 'Electronics',
        'camera': 'Cameras & Photography',
        'beauty': 'Beauty & Personal Care',
        'cosmetics': 'Beauty & Personal Care',
        'sports': 'Sports & Fitness',
        'gaming': 'Gaming',
        'watch': 'Watches',
        'kitchen': 'Home & Kitchen',
        'home': 'Home & Kitchen',
    }
    
    # Detect category from query
    detected_category = None
    query_lower = query.lower()
    
    for keyword, category in category_map.items():
        if keyword in query_lower:
            detected_category = category
            break
    
    # If interests provided, use first one as fallback
    if not detected_category and interests:
        detected_category = interests[0] if isinstance(interests, list) else interests
    
    # Build query
    products_query = db.query(Product)
    
    if detected_category:
        products_query = products_query.filter(Product.category == detected_category)
    
    # Check if there's a price mentioned in query
    max_price = None
    for word in query_lower.split():
        if word.startswith('₹') or word.isdigit():
            try:
                max_price = int(word.strip('₹'))
                break
            except:
                pass
    
    if max_price:
        products_query = products_query.filter(Product.price <= max_price)
    
    # Order by rating
    products = products_query.order_by(Product.rating.desc()).limit(limit).all()
    
    # If no products found, get highest rated products overall
    if not products:
        products = db.query(Product).order_by(Product.rating.desc()).limit(limit).all()
    
    # Convert to response models with review counts
    result = []
    for p in products:
        # Count reviews for this product
        review_count = db.query(func.count("*")).select_entity_from(p.reviews).scalar() if p.reviews else 0
        result.append(ProductModel(
            id=str(p.id),
            name=p.name,
            brand=p.category or 'Unknown',
            price=p.price,
            image=p.image_url or '/placeholder.svg',
            category=p.category,
            rating=float(p.rating) if p.rating else 0,
            reviewCount=review_count
        ))
    
    return result


def should_recommend_products(question: str) -> bool:
    """Determine if the question warrants product recommendations"""
    question_lower = question.lower()
    recommendation_keywords = [
        "recommend", "suggest", "find", "looking for", "want",
        "need", "gift", "trending", "popular", "style", "outfit",
        "match", "budget", "price", "help", "show", "best",
        "affordable", "cheap", "expensive", "products"
    ]
    return any(keyword in question_lower for keyword in recommendation_keywords)


def extract_interests(question: str) -> List[str]:
    """Extract category interests from the user's question"""
    question_lower = question.lower()
    interests = []
    
    # Category mappings
    category_keywords = {
        "Fashion": ["men", "women", "kids", "fashion", "clothes", "dress", "shirt", "pants"],
        "Footwear": ["shoe", "shoes", "sneaker", "boot", "footwear", "sandal"],
        "Electronics": ["phone", "laptop", "computer", "electronics", "gadget", "tech"],
        "Cameras & Photography": ["camera", "photo"],
        "Beauty & Personal Care": ["beauty", "cosmetics", "makeup", "skincare", "perfume"],
        "Sports & Fitness": ["sports", "fitness", "athletic"],
    }
    
    for category, keywords in category_keywords.items():
        if any(keyword in question_lower for keyword in keywords):
            interests.append(category)
    
    return interests


def generate_assistant_response(question: str, products: List[ProductModel]) -> str:
    """Generate a natural assistant response based on the question and products"""
    
    question_lower = question.lower()
    
    # Gift recommendations
    if 'gift' in question_lower:
        if products:
            product_list = "\n".join([f"🎁 **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""Great! I found some wonderful gift options for you:

{product_list}

All of these are highly rated by customers and make excellent gifts! Would you like more options or details about any of these?"""
        return "I'd love to help you find the perfect gift! What's the occasion and your budget? Let me know and I'll find amazing options!"
    
    # Trending products
    elif 'trending' in question_lower or 'popular' in question_lower:
        if products:
            product_list = "\n".join([f"🔥 **{p.name}** - ⭐ {p.rating}/5 ({p.reviewCount} reviews)" for p in products])
            return f"""🔥 Here are the hottest trending products right now:

{product_list}

These items are flying off the shelves! Customers love them. Want to know more about any of these?"""
        return "Right now, people are loving minimalist fashion, tech gadgets, and sustainable products! What interests you most?"
    
    # Men's fashion
    elif 'men' in question_lower and any(word in question_lower for word in ['fashion', 'clothes', 'wear', 'style']):
        if products:
            product_list = "\n".join([f"👔 **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""👔 Perfect! Here are some top men's fashion picks:

{product_list}

Whether you're looking for casual, formal, or sporty styles, we've got you covered. Want to see more options?"""
        return "Men's fashion is my specialty! From casual to formal wear, I can help you find the perfect style. What are you looking for?"
    
    # Women's fashion
    elif 'women' in question_lower and any(word in question_lower for word in ['fashion', 'clothes', 'wear', 'style']):
        if products:
            product_list = "\n".join([f"👗 **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""👗 Wonderful! Here are some fantastic women's fashion options:

{product_list}

From casual to formal, we have styles for every occasion. Which of these catches your eye?"""
        return "Women's fashion is my passion! From everyday wear to special occasions, I can find the perfect piece for you."
    
    # Shoes/Footwear
    elif any(word in question_lower for word in ['shoe', 'boots', 'footwear', 'sneaker']):
        if products:
            product_list = "\n".join([f"👟 **{p.name}** - ₹{p.price:,.0f} | ⭐ {p.rating}/5" for p in products])
            return f"""👟 Great choice! Here are some top footwear options:

{product_list}

We have everything from casual sneakers to formal shoes. All these have excellent customer ratings. What style are you looking for?"""
        return "Footwear is essential! I can help you find the perfect shoes for any occasion and style preference."
    
    # Electronics/Tech
    elif any(word in question_lower for word in ['phone', 'laptop', 'computer', 'electronic', 'gadget', 'tech']):
        if products:
            product_list = "\n".join([f"📱 **{p.name}** - ₹{p.price:,.0f} | ⭐ {p.rating}/5" for p in products])
            return f"""📱 Excellent! Here are some top-rated tech products:

{product_list}

All these gadgets are reliable, feature-rich, and customer favorites. Interested in any of these?"""
        return "Tech enthusiast here! I can help you find the latest and greatest in phones, laptops, and gadgets."
    
    # Budget-friendly/Affordable
    elif any(word in question_lower for word in ['affordable', 'cheap', 'budget', 'under']):
        if products:
            product_list = "\n".join([f"💰 **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""💰 Perfect! Here are some amazing affordable options:

{product_list}

Great quality at great prices! These items offer excellent value for money. Would you like more budget-friendly suggestions?"""
        return "I specialize in finding great products at amazing prices! Tell me your budget and what you're looking for, and I'll find the best deals."
    
    # General help/recommendations
    elif any(word in question_lower for word in ['help', 'recommend', 'suggest', 'find', 'looking for']):
        if products:
            product_list = "\n".join([f"✨ **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""✨ Perfect! I found some great products for you:

{product_list}

These match what you're looking for based on ratings and popularity. Want to explore more options?"""
        return "I'm here to help! Tell me what you're looking for - whether it's a specific category, price range, or style - and I'll find the perfect products for you!"
    
    # Default
    else:
        if products:
            product_list = "\n".join([f"✨ **{p.name}** - ₹{p.price:,.0f}" for p in products])
            return f"""Great! Here are some products I think you'll love:

{product_list}

Want to know more about any of these, or would you like me to find something specific?"""
        return "Hi! I'm your shopping assistant. I can help you find products, get recommendations, find gifts, check trending items, and much more. What can I help you with today?"


def generate_suggestions(question: str) -> List[str]:
    """Generate follow-up suggestions based on the user's question"""
    suggestions = []
    
    if not question:
        return ["Help me find a gift", "What's trending now?", "Show me men's fashion"]
    
    question_lower = question.lower()
    
    # Gift-related suggestions
    if 'gift' in question_lower:
        suggestions.extend(["Under ₹5000", "For men", "For women"])
    
    # Fashion-related suggestions
    elif any(word in question_lower for word in ['fashion', 'clothes', 'style', 'wear']):
        suggestions.extend(["Men's collection", "Women's collection", "New arrivals"])
    
    # Trending/Popular
    elif any(word in question_lower for word in ['trending', 'popular']):
        suggestions.extend(["Best sellers", "Highest rated", "Most reviewed"])
    
    # Electronics/Tech
    elif any(word in question_lower for word in ['phone', 'laptop', 'tech', 'electronic']):
        suggestions.extend(["Latest phones", "Budget gadgets", "Premium options"])
    
    # Price/Budget related
    elif any(word in question_lower for word in ['price', 'budget', 'affordable']):
        suggestions.extend(["Under ₹2000", "₹2000-₹5000", "Premium items"])
    
    # Footwear
    elif any(word in question_lower for word in ['shoe', 'boot', 'sneaker']):
        suggestions.extend(["Men's shoes", "Women's shoes", "Sports footwear"])
    
    # General fallback
    if len(suggestions) < 2:
        suggestions.extend(["Show me more", "Different category", "View bestsellers"])
    
    return suggestions[:3]


@router.post("/assistant/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Chat with the AI assistant for product recommendations and shopping help.
    """
    # Extract the latest user message
    user_message = request.question or ""
    if request.messages:
        # Get the last user message
        for msg in reversed(request.messages):
            if msg.role == "user":
                user_message = msg.content
                break
    
    # Check if we should recommend products
    is_recommendation_request = should_recommend_products(user_message)
    
    # Get recommendations if relevant
    recommended_products = []
    if is_recommendation_request:
        interests = extract_interests(user_message)
        recommended_products = get_product_recommendations(db, user_message, interests, limit=4)
    
    # Generate AI response
    response_text = generate_assistant_response(user_message, recommended_products)
    
    # Generate follow-up suggestions
    suggestions = generate_suggestions(user_message)
    
    return {
        "response": response_text,
        "suggestions": suggestions,
        "products": recommended_products if recommended_products else None
    }


@router.post("/assistant/analyze-outfit", response_model=OutfitAnalysisResponse)
async def analyze_outfit(request: OutfitAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyze how well a product matches with an outfit image.
    """
    try:
        # Call the image analyzer service
        analysis = analyze_outfit_match(
            request.image,
            request.product.get("image", ""),
            request.product
        )

        ai_recs = get_ai_style_recommendations(
            gender=analysis.get("detectedGender", "unknown"),
            body_type=analysis.get("detectedBodyType", "average"),
            skin_tone=analysis.get("skinTone", "medium"),
            location=request.location if hasattr(request, 'location') else None,
            limit=5
        )
        
        return OutfitAnalysisResponse(
            matchScore=analysis["matchScore"],
            colorHarmony=analysis["colorHarmony"],
            styleMatch=analysis["styleMatch"],
            suggestions=analysis["suggestions"],
            aiRecommendations=ai_recs if ai_recs else None,
            previewImage=analysis.get("previewImage"),
            detectedGender=analysis.get("detectedGender"),
            detectedBodyType=analysis.get("detectedBodyType"),
            skinTone=analysis.get("skinTone"),
            dominantColors=analysis.get("dominantColors")
        )
    except Exception as e:
        return OutfitAnalysisResponse(
            matchScore=75,
            colorHarmony="Complementary",
            styleMatch="Good match with casual styles",
            suggestions=[
                "This piece complements your style well",
                "Try pairing with neutral colors",
                "Would work great for casual occasions"
            ],
            aiRecommendations=None,
            previewImage=None,
            detectedGender=None,
            detectedBodyType=None,
            skinTone=None,
            dominantColors=None
        )
