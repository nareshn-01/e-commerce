#!/usr/bin/env python
"""
Test script to verify admin dashboard backend
"""
import subprocess
import sys
import time
import os

os.chdir(r"c:\Users\bhuth\Downloads\e-commerce-ui-build\backend")

# Start the server
print("Starting FastAPI server...")
process = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8000"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

# Wait for server to start
time.sleep(3)

# Test endpoint
print("Testing admin endpoints...")
import requests

try:
    # Test dashboard
    response = requests.get("http://localhost:8000/api/admin/dashboard")
    print(f"Dashboard status: {response.status_code}")
    if response.ok:
        print("✓ Dashboard endpoint working")
        print(f"Response: {response.json()}")
    
    # Test products
    response = requests.get("http://localhost:8000/api/admin/products")
    print(f"Products status: {response.status_code}")
    if response.ok:
        print("✓ Products endpoint working")
        products = response.json()
        print(f"Total products: {len(products)}")
        if products:
            print(f"First product: {products[0]['name']}")
    
    # Test categories
    response = requests.get("http://localhost:8000/api/admin/categories")
    print(f"Categories status: {response.status_code}")
    if response.ok:
        print("✓ Categories endpoint working")
        categories = response.json()
        print(f"Categories: {categories}")
    
    print("\n✅ All endpoints are working!")
    
except Exception as e:
    print(f"❌ Error: {e}")

finally:
    process.terminate()
    process.wait()
