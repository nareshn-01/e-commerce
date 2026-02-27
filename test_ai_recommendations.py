#!/usr/bin/env python
"""
Test script to verify AI recommendations based on gender, location, and body type
"""

import json
from backend.app.routers.assistant import get_ai_style_recommendations

def test_recommendations():
    """Test AI recommendations for different scenarios"""
    
    test_cases = [
        {
            "name": "Athletic Man - Tropical Climate",
            "gender": "man",
            "body_type": "athletic",
            "skin_tone": "medium",
            "location": "tropical",
        },
        {
            "name": "Curvy Woman - Urban",
            "gender": "woman",
            "body_type": "curvy",
            "skin_tone": "dark",
            "location": "urban",
        },
        {
            "name": "Lean Person - Cold Climate",
            "gender": "other",
            "body_type": "lean",
            "skin_tone": "light",
            "location": "cold",
        },
        {
            "name": "Pear Shape - Casual",
            "gender": "woman",
            "body_type": "pear",
            "skin_tone": "medium",
            "location": "casual",
        },
        {
            "name": "Rectangle Body - Temperate",
            "gender": "man",
            "body_type": "rectangle",
            "skin_tone": "deep",
            "location": "temperate",
        },
    ]
    
    print("=" * 80)
    print("AI OUTFIT CHECKER - PERSONALIZED RECOMMENDATIONS TEST")
    print("=" * 80)
    
    for test in test_cases:
        print(f"\n📋 {test['name']}")
        print("-" * 80)
        
        recs = get_ai_style_recommendations(
            gender=test["gender"],
            body_type=test["body_type"],
            skin_tone=test["skin_tone"],
            location=test["location"],
            limit=5
        )
        
        for i, rec in enumerate(recs, 1):
            print(f"\n   {i}. {rec['style']}")
            print(f"      → {rec['reason']}")
    
    print("\n" + "=" * 80)
    print("✓ AI Recommendations Test Complete!")
    print("=" * 80)
    print("\nKey Features:")
    print("  • Personalized based on detected gender")
    print("  • Tailored for specific body types")
    print("  • Climate-aware recommendations")
    print("  • No real product dependencies")
    print("  • Pure AI-generated style advice")

if __name__ == "__main__":
    test_recommendations()
