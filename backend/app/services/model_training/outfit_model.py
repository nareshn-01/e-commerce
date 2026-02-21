"""
Outfit Checker Model Training
Uses training images to improve outfit matching and preview generation
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np
from PIL import Image
import pickle

logger = logging.getLogger(__name__)

TRAINING_DATA_DIR = "data/training_data/outfit_examples"
MODEL_CHECKPOINT_DIR = "data/model_checkpoints"


class OutfitTrainingModel:
    """
    Train and improve outfit checker using example images
    """

    def __init__(self):
        self.training_data = []
        self.model_params = {}
        self.is_trained = False
        self._ensure_dirs()

    def _ensure_dirs(self):
        """Create necessary directories"""
        Path(TRAINING_DATA_DIR).mkdir(parents=True, exist_ok=True)
        Path(MODEL_CHECKPOINT_DIR).mkdir(parents=True, exist_ok=True)

    def add_training_image(
        self,
        image_path: str,
        person_image: str,
        cloth_image: str,
        outcome: str,
        notes: str = ""
    ) -> bool:
        """
        Add a training example
        
        Args:
            image_path: Path to the result/preview image
            person_image: Path to person image used
            cloth_image: Path to clothing image used
            outcome: Quality rating (poor/good/excellent)
            notes: Additional notes about the training example
            
        Returns:
            True if successful
        """
        try:
            training_example = {
                "result_image": image_path,
                "person_image": person_image,
                "cloth_image": cloth_image,
                "outcome": outcome,
                "notes": notes,
                "image_features": self._extract_features(image_path)
            }

            self.training_data.append(training_example)
            logger.info(f"Added training example: {outcome}")
            return True
        except Exception as e:
            logger.error(f"Failed to add training image: {e}")
            return False

    def _extract_features(self, image_path: str) -> Dict:
        """Extract features from image for training"""
        try:
            if not os.path.exists(image_path):
                return {}

            img = Image.open(image_path)
            img_array = np.array(img)

            features = {
                "shape": img.size,
                "mode": img.mode,
                "mean_brightness": float(np.mean(img_array)),
                "std_brightness": float(np.std(img_array)),
                "color_channels": len(img.getbands()),
                "histogram": self._compute_histogram(img_array)
            }

            return features
        except Exception as e:
            logger.error(f"Failed to extract features: {e}")
            return {}

    def _compute_histogram(self, img_array: np.ndarray) -> List[float]:
        """Compute histogram of image"""
        try:
            hist, _ = np.histogram(img_array.flatten(), bins=256, range=(0, 256))
            return (hist / hist.sum()).tolist()[:16]  # 16 bins summary
        except Exception:
            return []

    def train(self) -> bool:
        """
        Train the model on collected examples
        """
        if len(self.training_data) < 3:
            logger.warning("Need at least 3 training examples to train")
            return False

        try:
            logger.info(f"Training on {len(self.training_data)} examples...")

            # Analyze outcomes
            outcomes = {}
            for example in self.training_data:
                outcome = example.get("outcome", "unknown")
                outcomes[outcome] = outcomes.get(outcome, 0) + 1

            self.model_params = {
                "training_count": len(self.training_data),
                "outcome_distribution": outcomes,
                "trained_at": str(Path.cwd())
            }

            # Extract common patterns from good examples
            good_examples = [ex for ex in self.training_data if ex["outcome"] in ["good", "excellent"]]
            if good_examples:
                features_list = [ex["image_features"] for ex in good_examples if ex["image_features"]]
                if features_list:
                    mean_brightness = np.mean([f.get("mean_brightness", 128) for f in features_list])
                    self.model_params["target_brightness"] = float(mean_brightness)

            self.is_trained = True
            logger.info("Model training complete!")
            self.save_checkpoint()
            return True

        except Exception as e:
            logger.error(f"Training failed: {e}")
            return False

    def save_checkpoint(self) -> bool:
        """Save trained model to checkpoint"""
        try:
            checkpoint_path = os.path.join(
                MODEL_CHECKPOINT_DIR,
                "outfit_model_checkpoint.pkl"
            )
            with open(checkpoint_path, "wb") as f:
                pickle.dump({
                    "training_data": self.training_data,
                    "model_params": self.model_params,
                    "is_trained": self.is_trained
                }, f)

            logger.info(f"Model saved to {checkpoint_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")
            return False

    def load_checkpoint(self) -> bool:
        """Load trained model from checkpoint"""
        try:
            checkpoint_path = os.path.join(
                MODEL_CHECKPOINT_DIR,
                "outfit_model_checkpoint.pkl"
            )
            if not os.path.exists(checkpoint_path):
                logger.warning("No checkpoint found")
                return False

            with open(checkpoint_path, "rb") as f:
                data = pickle.load(f)
                self.training_data = data.get("training_data", [])
                self.model_params = data.get("model_params", {})
                self.is_trained = data.get("is_trained", False)

            logger.info("Model loaded from checkpoint")
            return True
        except Exception as e:
            logger.error(f"Failed to load checkpoint: {e}")
            return False

    def get_model_info(self) -> Dict:
        """Get current model information"""
        return {
            "is_trained": self.is_trained,
            "training_examples": len(self.training_data),
            "model_params": self.model_params,
            "checkpoint_dir": MODEL_CHECKPOINT_DIR
        }


# Global model instance
_outfit_model = None


def get_outfit_training_model() -> OutfitTrainingModel:
    """Get outfit training model instance"""
    global _outfit_model
    if _outfit_model is None:
        _outfit_model = OutfitTrainingModel()
        _outfit_model.load_checkpoint()  # Load if exists
    return _outfit_model
