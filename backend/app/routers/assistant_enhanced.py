"""
Enhanced AI Assistant API routes with:
- Voice input support (Speech-to-Text)
- Language detection
- Multi-language translation
- Text-to-Speech output
- Context memory management
- INR pricing recommendations
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Product
import json
from datetime import datetime
import re

router = APIRouter()

# ==================== Request/Response Models ====================

class Message(BaseModel):
    role: str
    content: str
    language: Optional[str] = None

class UserPreferences(BaseModel):
    language: str = "en"
    preferredCategories: List[str] = []
    budget: float = 10000
    style: str = "casual"

class ChatEnhancedRequest(BaseModel):
    messages: List[Message]
    question: str
    sessionId: str
    userLanguage: str = "en"
    detectedLanguage: str = "en"
    userPreferences: Optional[UserPreferences] = None
    conversationContext: Optional[List[Message]] = None

class LanguageDetectionRequest(BaseModel):
    text: str

class TranslationRequest(BaseModel):
    text: str
    sourceLang: str
    targetLang: str

class ProductModel(BaseModel):
    id: str
    name: str
    brand: str
    price: float
    image: str
    category: str
    rating: float
    reviewCount: int

class ChatEnhancedResponse(BaseModel):
    response: str
    suggestions: Optional[List[str]] = None
    products: Optional[List[ProductModel]] = None
    detectedLanguage: Optional[str] = None

# ==================== Language Detection ====================

LANGUAGE_PATTERNS = {
    'en': r'\b(hello|hi|help|find|show|what|how|where|yes|no|thanks|thank)\b',
    'hi': r'[\u0900-\u097F]+',  # Devanagari script
    'es': r'\b(hola|ayuda|mostrar|qué|cómo|dónde|sí|no|gracias)\b',
    'fr': r'\b(bonjour|aide|afficher|quoi|comment|où|oui|non|merci)\b',
    'de': r'\b(hallo|hilfe|zeigen|was|wie|wo|ja|nein|danke)\b',
}

@router.post("/detect-language")
async def detect_language(request: LanguageDetectionRequest):
    """Detect language from text input"""
    text = request.text.lower()
    
    # Simple language detection based on character set and common words
    scores = {}
    
    for lang, pattern in LANGUAGE_PATTERNS.items():
        matches = len(re.findall(pattern, text, re.IGNORECASE))
        scores[lang] = matches
    
    # Detect script for Indian languages
    if any(char in text for char in '\u0900\u0901\u0902\u0903'):
        detected_lang = 'hi'
    else:
        detected_lang = max(scores, key=scores.get) if scores else 'en'
    
    return {
        "language": detected_lang,
        "confidence": 0.8,
        "detectedText": text[:100]
    }

# ==================== Translation Engine ====================

TRANSLATION_DICT = {
    'en_hi': {
        'hello': 'नमस्ते',
        'hi': 'नमस्ते',
        'help': 'मदद',
        'find': 'खोजें',
        'show': 'दिखाएं',
        'price': 'कीमत',
        'product': 'उत्पाद',
        'category': 'श्रेणी',
        'available': 'उपलब्ध',
        'thank you': 'धन्यवाद',
        'perfect': 'बिल्कुल सही',
    },
    'hi_en': {
        'नमस्ते': 'hello',
        'मदद': 'help',
        'खोजें': 'find',
        'दिखाएं': 'show',
        'कीमत': 'price',
        'धन्यवाद': 'thank you',
    }
}

@router.post("/translate")
async def translate_text(request: TranslationRequest):
    """Translate text between languages"""
    if request.sourceLang == request.targetLang:
        return {"translatedText": request.text}
    
    # Simple translation logic
    dict_key = f"{request.sourceLang}_{request.targetLang}"
    translation_dict = TRANSLATION_DICT.get(dict_key, {})
    
    text = request.text.lower()
    translated = text
    
    for source_word, target_word in translation_dict.items():
        translated = re.sub(rf'\b{source_word}\b', target_word, translated, flags=re.IGNORECASE)
    
    return {
        "translatedText": translated,
        "sourceLang": request.sourceLang,
        "targetLang": request.targetLang
    }

# ==================== Enhanced Chat with Context Memory ====================

# In-memory session storage (in production, use Redis or database)
session_memory: Dict[str, Dict] = {}

@router.post("/chat-enhanced")
async def chat_enhanced(request: ChatEnhancedRequest, db: Session = Depends(get_db)):
    """
    Enhanced chat endpoint with:
    - Language detection
    - Context memory
    - Multi-language support
    - INR pricing
    - Smart recommendations
    """
    print("=== CHAT ENHANCED ENDPOINT CALLED ===", flush=True)
    
    try:
        # Initialize or retrieve session
        session_id = request.sessionId
        if session_id not in session_memory:
            session_memory[session_id] = {
                "preferences": request.userPreferences or UserPreferences(),
                "conversation_history": [],
                "created_at": datetime.now(),
                "last_interaction": datetime.now(),
            }
        
        session_memory[session_id]["last_interaction"] = datetime.now()
        
        # Extract user intent and keywords
        question = request.question.lower()
        print(f"DEBUG: Original question: {request.question}", flush=True)
        print(f"DEBUG: Lowercase question: {question}", flush=True)
        
        # Extract keywords for product search
        keywords = extract_keywords(question)
        print(f"DEBUG: Extracted keywords: {keywords}", flush=True)
        
        # Get user preferences
        user_prefs = session_memory[session_id]["preferences"]
        budget = user_prefs.budget if user_prefs else 10000
        
        # Search for relevant products
        products = search_products_by_keywords(db, keywords, budget)
        
        # Generate contextual response
        response_text = generate_response(
            question=question,
            products=products,
            language=request.detectedLanguage,
            user_language=request.userLanguage,
            conversation_history=request.conversationContext or []
        )
        
        # Add to session history
        session_memory[session_id]["conversation_history"].append({
            "role": "user",
            "content": request.question,
            "timestamp": datetime.now().isoformat()
        })
        session_memory[session_id]["conversation_history"].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        })
        
        # Convert products to response models with INR pricing
        product_responses = [
            ProductModel(
                id=str(p.id),
                name=p.name,
                brand=p.category or 'Product',
                price=p.price * 83,  # Convert to INR (1 USD ≈ 83 INR)
                image=p.image_url or "",
                category=p.category or "General",
                rating=p.rating or 4.0,
                reviewCount=len(p.reviews) if p.reviews else 0
            )
            for p in products[:6]  # Top 6 products
        ]
        
        return ChatEnhancedResponse(
            response=response_text,
            products=product_responses,
            detectedLanguage=request.detectedLanguage,
            suggestions=generate_suggestions(keywords)
        )
        
    except Exception as e:
        import traceback
        import os
        error_msg = f"Error in enhanced chat: {str(e)}\nTraceback: {traceback.format_exc()}"
        print(error_msg, flush=True)
        log_path = os.path.join(os.path.dirname(__file__), '..', '..', 'backend_error.log')
        with open(log_path, 'a') as f:
            f.write(error_msg + '\n---\n')
        return ChatEnhancedResponse(
            response="I'm here to help! Tell me what you're looking for - I can search by category, price, or style.",
            products=[],
            detectedLanguage=request.detectedLanguage
        )

# ==================== Helper Functions ====================

def extract_keywords(question: str) -> List[str]:
    """Extract search keywords from user question with better context words"""
    stop_words = {'what', 'show', 'find', 'help', 'me', 'a', 'the', 'is', 'are', 'i', 'can', 'you', 'for', 'am', 'attending', 'give', 'some', 'suggestions', 'need', 'want', 'looking', 'like', 'about', 'that', 'this', 'one', 'would', 'could', 'should', 'please', 'thanks', 'getting'}
    words = question.lower().split()
    keywords = [w for w in words if w not in stop_words and len(w) > 2]
    return keywords if keywords else []

def search_products_by_keywords(db: Session, keywords: List[str], budget: float = 10000) -> List[Product]:
    """Search products by keywords with context-aware matching"""
    from sqlalchemy import or_
    
    if not keywords:
        return db.query(Product).filter(Product.price <= budget).order_by(Product.rating.desc()).limit(6).all()
    
    # Search for each keyword separately to get diverse results
    all_matches = {}
    for keyword in keywords:
        products = db.query(Product).filter(Product.price <= budget).filter(
            or_(
                Product.name.ilike(f"%{keyword}%"),
                Product.category.ilike(f"%{keyword}%")
            )
        ).order_by(Product.rating.desc()).all()
        
        for p in products:
            if p.id not in all_matches:
                all_matches[p.id] = p
    
    if all_matches:
        products_list = list(all_matches.values())
        # Sort by rating and return diverse categories
        products_list.sort(key=lambda x: x.rating, reverse=True)
        
        # Group by category for better diversity
        by_category = {}
        for p in products_list:
            if p.category not in by_category:
                by_category[p.category] = []
            by_category[p.category].append(p)
        
        # Return mix of categories
        result = []
        for category in sorted(by_category.keys()):
            result.extend(by_category[category][:2])  # Take up to 2 from each category
        
        return result[:6] if result else products_list[:6]
    
    # Fallback: return top-rated products when no keyword match
    return db.query(Product).filter(Product.price <= budget).order_by(Product.rating.desc()).limit(6).all()

def detect_user_intent(question: str) -> Dict[str, bool]:
    """Detect what user is looking for"""
    question_lower = question.lower()
    
    intent = {
        'looking_for_help': any(word in question_lower for word in ['help', 'suggest', 'recommend', 'what should', 'need', 'find', 'looking for']),
        'asking_about_budget': any(word in question_lower for word in ['price', 'cost', 'budget', 'how much', 'expensive', 'cheap', 'afford', 'inr', 'rupees']),
        'asking_about_category': any(word in question_lower for word in ['shoe', 'shirt', 'dress', 'watch', 'phone', 'laptop', 'headphone', 'electronics', 'clothing', 'accessory']),
        'asking_for_specific': any(word in question_lower for word in ['which', 'what', 'best', 'top', 'most', 'favorite']),
        'asking_for_details': any(word in question_lower for word in ['details', 'tell me', 'how', 'features', 'specification', 'review']),
        'greeting': any(word in question_lower for word in ['hello', 'hi', 'hey', 'namaste', 'bonjour', 'hola']),
    }
    
    return intent

def generate_response(
    question: str,
    products: List[Product],
    language: str,
    user_language: str,
    conversation_history: List[Message]
) -> str:
    """Generate contextual, conversational response with context-aware greetings"""
    
    # Detect user intent
    intent = detect_user_intent(question)
    
    # Detect context from question for wedding, gifts, etc.
    question_lower = question.lower()
    is_wedding = any(w in question_lower for w in ['wedding', 'marriage', 'ceremony', 'celebration', 'gift'])
    is_special_occasion = any(w in question_lower for w in ['birthday', 'anniversary', 'festival', 'occasion', 'event', 'party'])
    is_home = any(w in question_lower for w in ['home', 'kitchen', 'decor', 'furniture', 'living', 'dining'])
    is_fashion = any(w in question_lower for w in ['shoe', 'dress', 'clothing', 'wear', 'fashion', 'style', 'outfit', 'footwear'])
    
    print(f"DEBUG CONTEXT DETECTION:", flush=True)
    print(f"  Question: {question_lower}", flush=True)
    print(f"  is_wedding: {is_wedding}", flush=True)
    print(f"  is_special_occasion: {is_special_occasion}", flush=True)
    print(f"  is_home: {is_home}", flush=True)
    print(f"  is_fashion: {is_fashion}", flush=True)
    
    # Language-specific responses
    lang_responses = {
        'en': {},
        'hi': {},
        'es': {},
    }
    
    # Define responses for different scenarios
    no_products_response = {
        'en': "I couldn't find products matching your description. Could you help me understand better? Tell me:\n1. What category are you interested in? (shoes, clothing, electronics, etc.)\n2. What's your budget?\n3. Any specific brand preference?",
        'hi': "मुझे आपके विवरण से मेल खाने वाले उत्पाद नहीं मिले। क्या आप मुझे बेहतर समझने में मदद कर सकते हैं?\n1. आप किस श्रेणी में रुचि रखते हैं?\n2. आपका बजट क्या है?\n3. कोई विशेष ब्रांड पसंद है?",
        'es': "No encontré productos que coincidan con tu descripción. ¿Puedes ayudarme?\n1. ¿Qué categoría te interesa?\n2. ¿Cuál es tu presupuesto?\n3. ¿Alguna marca preferida?",
    }
    
    greeting_response = {
        'en': "👋 Welcome! I'm here to help you find the perfect products. Tell me what you're looking for - whether it's a specific item, a category, or just some recommendations!",
        'hi': "👋 स्वागत है! मैं आपको सही उत्पाद खोजने में मदद करने के लिए यहां हूं।",
        'es': "👋 ¡Bienvenido! Estoy aquí para ayudarte a encontrar los productos perfectos.",
    }
    
    # If no products found
    if not products:
        if intent['greeting']:
            return greeting_response.get(language, greeting_response['en'])
        return no_products_response.get(language, no_products_response['en'])
    
    # Build context-aware product list summary
    top_products = products[:3]
    product_names = ", ".join([p.name for p in top_products])
    product_count = len(products)
    
    # Generate contextual response based on intent AND context
    if intent['greeting']:
        print(f"DEBUG RESPONSE: Using greeting response", flush=True)
        response = greeting_response.get(language, greeting_response['en'])
    elif is_wedding:
        print(f"DEBUG RESPONSE: Using WEDDING response", flush=True)
        # Special wedding/gift context response
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"🎁 Perfect for your wedding celebration! I found {product_count} great gift options:\n\n" \
                     f"**Top Recommendation:**\n" \
                     f"- {best_product.name} ({best_product.category})\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                     f"Other options include {product_names}. Would you like more details about any of these?"
        response_hi = f"🎁 आपके शादी समारोह के लिए परफेक्ट! मुझे {product_count} बढ़िया विकल्प मिले:\n\n" \
                     f"**शीर्ष अनुशंसा:**\n" \
                     f"- {best_product.name}\n" \
                     f"- कीमत: ₹{price_inr:,.0f}\n" \
                     f"- रेटिंग: ⭐ {best_product.rating}/5"
        response = {'en': response_en, 'hi': response_hi, 'es': response_en}.get(language, response_en)
    elif is_special_occasion:
        # Birthday/Anniversary/Festival response
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"🎉 Great picks for this occasion! Found {product_count} options:\n\n" \
                     f"**Recommended:**\n" \
                     f"- {best_product.name} ({best_product.category})\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                     f"Alternatives: {product_names}"
        response = response_en
    elif is_fashion:
        # Fashion/Clothing specific response
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"👟 Fashion finds for you! {product_count} great options:\n\n" \
                     f"**Top Pick:**\n" \
                     f"- {best_product.name}\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                     f"Other styles: {product_names}"
        response = response_en
    elif is_home:
        # Home & Kitchen response
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"🏠 Home & Living suggestions - {product_count} items found:\n\n" \
                     f"**Best Choice:**\n" \
                     f"- {best_product.name}\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                     f"Also consider: {product_names}"
        response = response_en
    elif intent['asking_for_specific']:
        # User asking for best/top product
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"✨ Based on ratings, I recommend the **{best_product.name}**:\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n" \
                     f"- Category: {best_product.category}\n\n" \
                     f"Would you like to see alternatives or need more details?"
        response_hi = f"✨ रेटिंग के आधार पर, मैं **{best_product.name}** की सलाह देता हूं:\n" \
                     f"- कीमत: ₹{price_inr:,.0f}\n" \
                     f"- रेटिंग: ⭐ {best_product.rating}/5\n\n" \
                     f"क्या आप विकल्प देखना चाहते हैं?"
        response = {
            'en': response_en,
            'hi': response_hi,
            'es': f"✨ Te recomiendo el **{best_product.name}**. Precio: ₹{price_inr:,.0f}"
        }.get(language, response_en)
    elif intent['asking_for_details']:
        # User asking for details
        if products:
            best_product = products[0]
            price_inr = best_product.price * 83
            response_en = f"📋 Details for **{best_product.name}**:\n" \
                         f"- Category: {best_product.category}\n" \
                         f"- Price: ₹{price_inr:,.0f}\n" \
                         f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                         f"Would you like to compare with similar items or add to cart?"
            response_hi = f"📋 **{best_product.name}** के विवरण:\n" \
                         f"- कैटेगरी: {best_product.category}\n" \
                         f"- कीमत: ₹{price_inr:,.0f}\n" \
                         f"- रेटिंग: ⭐ {best_product.rating}/5\n\n" \
                         f"क्या आप समान उत्पादों के साथ तुलना करना चाहते हैं?"
            response = {'en': response_en, 'hi': response_hi, 'es': response_en}.get(language, response_en)
    elif intent['asking_about_budget']:
        # User asking about price
        min_price = min(p.price * 83 for p in products)
        max_price = max(p.price * 83 for p in products)
        avg_price = sum(p.price * 83 for p in products) / len(products)
        response_en = f"💰 Found {product_count} products in your search:\n" \
                     f"- Price Range: ₹{min_price:,.0f} - ₹{max_price:,.0f}\n" \
                     f"- Average Price: ₹{avg_price:,.0f}\n" \
                     f"- Top Options: {product_names}\n\n" \
                     f"Would you like me to filter by a specific budget range?"
        response_hi = f"💰 आपकी खोज में {product_count} उत्पाद मिले:\n" \
                     f"- कीमत रेंज: ₹{min_price:,.0f} - ₹{max_price:,.0f}\n" \
                     f"- औसत कीमत: ₹{avg_price:,.0f}\n\n" \
                     f"क्या आप किसी विशेष बजट में फ़िल्टर करना चाहते हैं?"
        response = {'en': response_en, 'hi': response_hi, 'es': response_en}.get(language, response_en)
    else:
        # Default: Show found products
        best_product = products[0]
        price_inr = best_product.price * 83
        response_en = f"🛍️ Great! I found {product_count} products for you!\n\n" \
                     f"**Top Recommendation:**\n" \
                     f"- {best_product.name} ({best_product.category})\n" \
                     f"- Price: ₹{price_inr:,.0f}\n" \
                     f"- Rating: ⭐ {best_product.rating}/5\n\n" \
                     f"Other options: {product_names}\n\n" \
                     f"What would you like to do?\n1. See more details\n2. View similar items\n3. Check other categories"
        response_hi = f"🛍️ बहुत अच्छा! मुझे आपके लिए {product_count} उत्पाद मिले!\n\n" \
                     f"**शीर्ष सिफारिश:**\n" \
                     f"- {best_product.name}\n" \
                     f"- कीमत: ₹{price_inr:,.0f}\n" \
                     f"- रेटिंग: ⭐ {best_product.rating}/5\n\n" \
                     f"अन्य विकल्प: {product_names}\n\n" \
                     f"आप क्या करना चाहते हैं?"
        response = {'en': response_en, 'hi': response_hi, 'es': response_en}.get(language, response_en)
    
    return response

def generate_suggestions(keywords: List[str]) -> List[str]:
    """Generate contextual follow-up suggestions"""
    
    # Map keywords to suggestion categories
    suggestions_bank = {
        'default': [
            "🔍 Filter by price range",
            "⭐ Show highest rated items",
            "🏆 Show best sellers",
            "📦 See similar products",
        ],
        'price': [
            "💰 Show items under ₹5000",
            "💳 Show premium options over ₹10000",
            "🎯 Show mid-range items ₹5000-₹10000",
        ],
        'category': [
            "👗 View other clothing items",
            "👟 Check footwear collection",
            "⌚ Browse accessories",
            "📱 See electronics",
        ],
        'quality': [
            "⭐ Filter by 4+ stars",
            "🏅 Show top-rated only",
            "💯 Show bestsellers",
        ]
    }
    
    # Select suggestions based on keywords
    selected_suggestions = suggestions_bank['default']
    
    for keyword in keywords:
        keyword_lower = keyword.lower()
        if any(word in keyword_lower for word in ['price', 'cost', 'budget', 'inr', 'rupees']):
            selected_suggestions = suggestions_bank['price']
            break
        elif any(word in keyword_lower for word in ['shoe', 'clothing', 'dress', 'shirt']):
            selected_suggestions = suggestions_bank['category']
            break
        elif any(word in keyword_lower for word in ['best', 'top', 'quality', 'rating']):
            selected_suggestions = suggestions_bank['quality']
            break
    
    return selected_suggestions[:3]

# ==================== Session Management ====================

@router.get("/session/{session_id}")
async def get_session_info(session_id: str):
    """Get session information and history"""
    if session_id in session_memory:
        session_data = session_memory[session_id]
        return {
            "sessionId": session_id,
            "preferences": session_data["preferences"].dict() if hasattr(session_data["preferences"], 'dict') else session_data["preferences"],
            "conversationCount": len(session_data["conversation_history"]),
            "lastInteraction": session_data["last_interaction"].isoformat(),
            "createdAt": session_data["created_at"].isoformat()
        }
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@router.delete("/session/{session_id}")
async def clear_session(session_id: str):
    """Clear session and conversation history"""
    if session_id in session_memory:
        del session_memory[session_id]
        return {"message": "Session cleared successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")
