#!/usr/bin/env python3
"""
Simple test for the outfit checker API endpoint
"""

import requests
import base64
import json
from PIL import Image
import io

API_URL = "http://localhost:8000"

def create_test_image():
    """Create a simple test image"""
    img = Image.new('RGB', (300, 400), color='white')
    # Add some colors to simulate an outfit
    pixels = img.load()
    # Skin tone area
    for x in range(75, 225):
        for y in range(25, 125):
            pixels[x, y] = (228, 183, 165)
    # Blue shirt area
    for x in range(50, 250):
        for y in range(125, 250):
            pixels[x, y] = (50, 100, 200)
    # Black pants area
    for x in range(100, 200):
        for y in range(250, 375):
            pixels[x, y] = (30, 30, 30)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

def test_outfit_endpoint():
    """Test the analyze-outfit endpoint"""
    print("\n🧪 Testing AI Outfit Checker API\n")
    
    # Create test image
    print("1️⃣  Creating test image...")
    test_image = create_test_image()
    print("   ✅ Test image created")
    
    # Prepare request
    print("\n2️⃣  Calling API endpoint...")
    payload = {
        "image": test_image,
        "product": {
            "name": "Classic Blue Denim Jacket",
            "brand": "Test Brand",
            "image": "https://example.com/jacket.jpg",
            "category": "Fashion"
        }
    }
    
    try:
        response = requests.post(
            f"{API_URL}/api/assistant/analyze-outfit",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            print("   ✅ API call successful!")
            
            data = response.json()
            print("\n📊 Analysis Results:")
            print(f"   Match Score: {data.get('matchScore')}%")
            print(f"   Color Harmony: {data.get('colorHarmony')}")
            print(f"   Style Match: {data.get('styleMatch')}")
            print(f"   Detected Gender: {data.get('detectedGender')}")
            print(f"   Body Type: {data.get('detectedBodyType')}")
            print(f"   Skin Tone: {data.get('skinTone')}")
            print(f"   Dominant Colors: {data.get('dominantColors')}")
            print(f"\n   Suggestions:")
            for i, suggestion in enumerate(data.get('suggestions', []), 1):
                print(f"      {i}. {suggestion}")
            
            if data.get('previewImage'):
                print(f"\n   ✅ Preview image generated")
            else:
                print(f"\n   ⚠️  No preview image generated")
            
            print("\n✅ ALL TESTS PASSED!")
            return True
        else:
            print(f"   ❌ API error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("\n" + "="*60)
    print("AI OUTFIT CHECKER - API TEST")
    print("="*60)
    print("\nMake sure backend is running on http://localhost:8000")
    print("-"*60)
    
    success = test_outfit_endpoint()
    
    if not success:
        print("\n❌ TEST FAILED")
        exit(1)
    
    print("\n" + "="*60)
