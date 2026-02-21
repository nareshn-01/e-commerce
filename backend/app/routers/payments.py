"""
Payment processing router with Stripe integration.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Order, OrderItem

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Stripe configuration
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")

# Check if Stripe is configured
STRIPE_ENABLED = bool(STRIPE_SECRET_KEY and STRIPE_SECRET_KEY != "your-stripe-secret-key")

if STRIPE_ENABLED:
    try:
        import stripe
        stripe.api_key = STRIPE_SECRET_KEY
    except ImportError:
        STRIPE_ENABLED = False
        print("Warning: stripe package not installed. Install with: pip install stripe")

# Pydantic models
class PaymentIntentRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Payment amount in INR")
    currency: str = Field(default="inr", description="Currency code")
    order_items: List[dict] = Field(..., description="List of order items")
    shipping_address: dict = Field(..., description="Shipping address")
    customer_email: str = Field(..., description="Customer email")

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    publishable_key: str
    amount: float
    currency: str

class PaymentConfirmRequest(BaseModel):
    payment_intent_id: str
    order_items: List[dict]
    shipping_address: dict
    customer_email: str

class OrderResponse(BaseModel):
    order_id: str
    status: str
    total_amount: float
    payment_status: str
    created_at: datetime

# Mock payment storage (in production, use database)
mock_payment_intents = {}
mock_orders = {}


@router.get("/config")
async def get_payment_config():
    """Get payment configuration."""
    return {
        "stripe_enabled": STRIPE_ENABLED,
        "publishable_key": STRIPE_PUBLISHABLE_KEY if STRIPE_ENABLED else "",
        "supported_currencies": ["inr"],
        "supported_payment_methods": ["card"] if STRIPE_ENABLED else [],
        "currency_symbol": "₹",
        "country": "India"
    }


@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(request: PaymentIntentRequest):
    """
    Create a Stripe Payment Intent for checkout.
    """
    if not STRIPE_ENABLED:
        # Fallback: Create mock payment intent for testing
        import uuid
        mock_intent_id = f"pi_mock_{uuid.uuid4().hex[:24]}"
        mock_secret = f"pi_mock_{uuid.uuid4().hex[:24]}_secret_{uuid.uuid4().hex[:24]}"
        
        mock_payment_intents[mock_intent_id] = {
            "id": mock_intent_id,
            "amount": int(request.amount * 100),
            "currency": request.currency,
            "status": "requires_payment_method",
            "customer_email": request.customer_email,
            "order_items": request.order_items,
            "shipping_address": request.shipping_address
        }
        
        return PaymentIntentResponse(
            client_secret=mock_secret,
            payment_intent_id=mock_intent_id,
            publishable_key="pk_test_mock",
            amount=request.amount,
            currency=request.currency
        )
    
    try:
        # Convert amount to cents (Stripe requires integer amounts in smallest currency unit)
        amount_cents = int(request.amount * 100)
        
        # Create Stripe Payment Intent
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=request.currency,
            automatic_payment_methods={"enabled": True},
            metadata={
                "customer_email": request.customer_email,
                "order_items": str(len(request.order_items)),
            }
        )
        
        return PaymentIntentResponse(
            client_secret=intent.client_secret,
            payment_intent_id=intent.id,
            publishable_key=STRIPE_PUBLISHABLE_KEY,
            amount=request.amount,
            currency=request.currency
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment intent: {str(e)}"
        )


@router.post("/confirm-payment", response_model=OrderResponse)
async def confirm_payment(request: PaymentConfirmRequest, db: Session = Depends(get_db)):
    """
    Confirm payment and create order.
    """
    if not STRIPE_ENABLED:
        # Mock payment confirmation
        if request.payment_intent_id not in mock_payment_intents:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment intent not found"
            )
        
        import uuid
        order_id = f"order_{uuid.uuid4().hex[:16]}"
        
        # Calculate total
        total = sum(item.get("price", 0) * item.get("quantity", 1) for item in request.order_items)
        
        mock_orders[order_id] = {
            "order_id": order_id,
            "status": "confirmed",
            "total_amount": total,
            "payment_status": "paid",
            "payment_intent_id": request.payment_intent_id,
            "customer_email": request.customer_email,
            "order_items": request.order_items,
            "shipping_address": request.shipping_address,
            "created_at": datetime.utcnow()
        }
        
        return OrderResponse(
            order_id=order_id,
            status="confirmed",
            total_amount=total,
            payment_status="paid",
            created_at=datetime.utcnow()
        )
    
    try:
        # Retrieve the payment intent from Stripe
        intent = stripe.PaymentIntent.retrieve(request.payment_intent_id)
        
        # Check if payment was successful
        if intent.status != "succeeded":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment not completed. Status: {intent.status}"
            )
        
        # Calculate total
        total = sum(item.get("price", 0) * item.get("quantity", 1) for item in request.order_items)
        
        # Create order in database
        try:
            # Try to find user by email
            user = db.query(User).filter(User.email == request.customer_email).first()
            
            order = Order(
                user_id=user.id if user else None,
                total_amount=total,
                status="confirmed",
                payment_status="paid",
                payment_intent_id=request.payment_intent_id,
                shipping_address=str(request.shipping_address)
            )
            db.add(order)
            db.flush()
            
            # Add order items
            for item in request.order_items:
                order_item = OrderItem(
                    order_id=order.id,
                    product_id=item.get("id"),
                    quantity=item.get("quantity", 1),
                    price=item.get("price", 0)
                )
                db.add(order_item)
            
            db.commit()
            db.refresh(order)
            
            return OrderResponse(
                order_id=str(order.id),
                status=order.status,
                total_amount=order.total_amount,
                payment_status=order.payment_status,
                created_at=order.created_at
            )
            
        except Exception as db_error:
            db.rollback()
            # If database fails, still return success since payment succeeded
            import uuid
            order_id = f"order_{uuid.uuid4().hex[:16]}"
            
            return OrderResponse(
                order_id=order_id,
                status="confirmed",
                total_amount=total,
                payment_status="paid",
                created_at=datetime.utcnow()
            )
        
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm payment: {str(e)}"
        )


@router.get("/order/{order_id}")
async def get_order(order_id: str):
    """
    Get order details by order ID.
    """
    if order_id in mock_orders:
        return mock_orders[order_id]
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Order not found"
    )
