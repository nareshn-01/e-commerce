"""
Training data management API
Upload and manage training images for outfit checker
"""

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from pathlib import Path

from ..services.model_training.outfit_model import get_outfit_training_model

logger = logging.getLogger(__name__)
router = APIRouter()

TRAINING_DATA_DIR = "data/training_data/outfit_examples"


class TrainingExample(BaseModel):
    image_name: str
    outcome: str  # poor, good, excellent
    notes: Optional[str] = None


class ModelStatus(BaseModel):
    is_trained: bool
    training_count: int
    model_info: dict


class TrainingResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/training/upload-example", response_model=TrainingResponse)
async def upload_training_example(
    result_image: UploadFile = File(...),
    person_image: Optional[UploadFile] = None,
    cloth_image: Optional[UploadFile] = None,
    outcome: str = Form(...),
    notes: str = Form("")
):
    """
    Upload a training example for outfit checker
    """
    try:
        Path(TRAINING_DATA_DIR).mkdir(parents=True, exist_ok=True)

        # Save result image
        result_path = os.path.join(TRAINING_DATA_DIR, f"result_{result_image.filename}")
        with open(result_path, "wb") as f:
            f.write(await result_image.read())

        person_path = ""
        cloth_path = ""

        # Save person image if provided
        if person_image:
            person_path = os.path.join(TRAINING_DATA_DIR, f"person_{person_image.filename}")
            with open(person_path, "wb") as f:
                f.write(await person_image.read())

        # Save cloth image if provided
        if cloth_image:
            cloth_path = os.path.join(TRAINING_DATA_DIR, f"cloth_{cloth_image.filename}")
            with open(cloth_path, "wb") as f:
                f.write(await cloth_image.read())

        # Add to model training data
        model = get_outfit_training_model()
        success = model.add_training_image(
            image_path=result_path,
            person_image=person_path,
            cloth_image=cloth_path,
            outcome=outcome,
            notes=notes
        )

        if not success:
            raise HTTPException(status_code=400, detail="Failed to add training example")

        return {
            "success": True,
            "message": f"Training example added successfully (outcome: {outcome})",
            "data": {
                "result_image": result_path,
                "person_image": person_path,
                "cloth_image": cloth_path
            }
        }

    except Exception as e:
        logger.error(f"Failed to upload training example: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/training/train", response_model=TrainingResponse)
async def train_model():
    """
    Train the outfit checker model with collected examples
    """
    try:
        model = get_outfit_training_model()
        success = model.train()

        if success:
            info = model.get_model_info()
            return {
                "success": True,
                "message": f"Model trained successfully with {info['training_examples']} examples",
                "data": info
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Training failed - ensure you have at least 3 examples"
            )

    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/status", response_model=ModelStatus)
async def get_training_status():
    """
    Get current model training status
    """
    try:
        model = get_outfit_training_model()
        info = model.get_model_info()

        return {
            "is_trained": info["is_trained"],
            "training_count": info["training_examples"],
            "model_info": info["model_params"]
        }

    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/training/reset", response_model=TrainingResponse)
async def reset_training():
    """
    Reset training data and model
    """
    try:
        import shutil
        if os.path.exists(TRAINING_DATA_DIR):
            shutil.rmtree(TRAINING_DATA_DIR)
            Path(TRAINING_DATA_DIR).mkdir(parents=True, exist_ok=True)

        checkpoint_dir = "data/model_checkpoints"
        if os.path.exists(checkpoint_dir):
            shutil.rmtree(checkpoint_dir)
            Path(checkpoint_dir).mkdir(parents=True, exist_ok=True)

        # Reset global model
        import sys
        if "backend.app.services.model_training.outfit_model" in sys.modules:
            sys.modules["backend.app.services.model_training.outfit_model"]._outfit_model = None

        return {
            "success": True,
            "message": "Training data and model reset successfully"
        }

    except Exception as e:
        logger.error(f"Reset error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
