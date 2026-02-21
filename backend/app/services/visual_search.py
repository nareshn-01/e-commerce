"""
Visual Search Service - Find products by image similarity
Analyzes dominant colors, style, and visual features
"""

import numpy as np
from PIL import Image
from typing import List, Tuple, Dict
from sqlalchemy.orm import Session
from ..models import Product
from .image_analyzer import get_dominant_colors, get_color_name


class VisualSearchEngine:
    """AI-powered visual product search based on image similarity."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def search_by_image(
        self,
        image: Image.Image,
        limit: int = 12,
        color_weight: float = 0.4,
        category_weight: float = 0.6
    ) -> List[Product]:
        """
        Search for products similar to the uploaded image.
        
        Args:
            image: PIL Image object from user upload
            limit: Max results to return
            color_weight: Weight for color matching (0-1)
            category_weight: Weight for category matching (0-1)
        
        Returns:
            List of similar products ranked by relevance
        """
        # Extract features from uploaded image
        image_colors = self._extract_image_features(image)
        image_category = self._detect_category_from_image(image)
        
        # Get all products
        all_products = self.db.query(Product).all()
        
        # Score each product
        scored_products = []
        for product in all_products:
            if not product.image_url:
                continue
            
            score = self._score_product_similarity(
                product,
                image_colors,
                image_category,
                color_weight,
                category_weight
            )
            
            if score > 0.1:  # Minimum threshold
                scored_products.append((product, score))
        
        # Sort by score descending
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Return top products
        return [p for p, s in scored_products[:limit]]
    
    def _extract_image_features(self, image: Image.Image) -> Dict:
        """Extract visual features from image."""
        try:
            # Resize for consistency
            image = image.convert('RGB')
            image.thumbnail((300, 300))
            
            # Get dominant colors
            dominant_colors = get_dominant_colors(image, num_colors=3)
            color_names = [get_color_name(color) for color in dominant_colors]
            
            # Calculate average brightness
            img_array = np.array(image)
            brightness = np.mean(img_array)
            
            # Calculate color variance (saturation indicator)
            hsv = Image.new('RGB', image.size)
            from colorsys import rgb_to_hsv
            saturation = self._calculate_saturation(img_array)
            
            return {
                'colors': dominant_colors,
                'color_names': color_names,
                'brightness': brightness,
                'saturation': saturation,
                'primary_color': dominant_colors[0] if dominant_colors else (128, 128, 128)
            }
        except Exception as e:
            print(f"Error extracting features: {e}")
            return {
                'colors': [(128, 128, 128)],
                'color_names': ['Gray'],
                'brightness': 128,
                'saturation': 0.5,
                'primary_color': (128, 128, 128)
            }
    
    def _calculate_saturation(self, img_array: np.ndarray) -> float:
        """Calculate average saturation of image."""
        try:
            from colorsys import rgb_to_hsv
            
            # Convert RGB to HSV and extract saturation
            pixels = img_array.reshape(-1, 3)
            saturations = []
            
            for pixel in pixels[::100]:  # Sample every 100th pixel for speed
                r, g, b = pixel[0] / 255.0, pixel[1] / 255.0, pixel[2] / 255.0
                h, s, v = rgb_to_hsv(r, g, b)
                saturations.append(s)
            
            return np.mean(saturations) if saturations else 0.5
        except:
            return 0.5
    
    def _detect_category_from_image(self, image: Image.Image) -> str:
        """
        Detect product category from image characteristics.
        Categories: Men Fashion, Women Fashion, Home & Kitchen, Electronics, 
        Beauty & Personal Care, Toys & Games, Sports & Fitness, Footwear
        """
        try:
            img_array = np.array(image.convert('RGB'))
            height, width = img_array.shape[:2]
            aspect_ratio = height / width if width > 0 else 1
            
            # Calculate image properties
            img_brightness = np.mean(img_array)
            img_colors = get_dominant_colors(image, num_colors=3)
            
            # Detect visual features
            metallic_score = self._detect_metallic(img_array)
            circular_score = self._detect_circular_shapes(img_array)
            has_handles = self._detect_handles(img_array)
            texture_score = self._detect_texture(img_array)
            color_variance = np.var(img_array)
            
            # Debug logging
            print(f"DEBUG - Metallic: {metallic_score:.2f}, Circular: {circular_score:.2f}, Texture: {texture_score:.2f}, Brightness: {img_brightness:.1f}, Variance: {color_variance:.0f}")
            
            # 1. TOYS & GAMES - Two types: colorful hard toys OR soft plush toys
            primary_colors_count = self._count_primary_colors(img_colors)
            
            # Type A: Colorful plastic toys (LEGO, action figures)
            if primary_colors_count >= 2 and img_brightness > 130:
                print(f"DEBUG - Detected TOYS (colorful plastic, primary colors: {primary_colors_count})")
                return 'Toys & Games'
            
            # Type B: Plush/stuffed toys (teddy bears, soft toys)
            # High texture (fuzzy), rounded shape, neutral/warm colors
            if texture_score > 0.6 and circular_score > 0.3:
                # Check for warm/neutral colors (brown, beige, pink for plush toys)
                avg_color = tuple(np.mean(img_array.reshape(-1, 3), axis=0).astype(int))
                r, g, b = avg_color
                # Warm colors: red/brown/beige tones (R > G and R > B)
                if r > g and r > b and metallic_score < 0.3:
                    print(f"DEBUG - Detected TOYS (plush/stuffed animal)")
                    return 'Toys & Games'
            
            # Type C: Any toy with moderate color variance and round shape
            if color_variance > 1500 and circular_score > 0.4 and metallic_score < 0.4:
                print(f"DEBUG - Detected TOYS (general toy features)")
                return 'Toys & Games'
            
            # 2. ELECTRONICS - Tech gadgets, phones, laptops (low texture, moderate metallic)
            # Check BEFORE kitchen to avoid misclassification
            if texture_score < 0.5 and metallic_score > 0.2:
                # Electronics have screens, buttons, compact design
                if not has_handles and circular_score < 0.5:
                    print(f"DEBUG - Detected ELECTRONICS")
                    return 'Electronics'
            
            # 3. HOME & KITCHEN - Cookware with handles and round shapes
            # Higher metallic + handles OR very round (pots, pans, cookers)
            if metallic_score > 0.5 and has_handles and circular_score > 0.3:
                print(f"DEBUG - Detected KITCHEN (handles + metallic)")
                return 'Home & Kitchen'
            
            # Kitchen appliances (very metallic + very round like pressure cookers)
            if metallic_score > 0.6 and circular_score > 0.6:
                print(f"DEBUG - Detected KITCHEN (high metallic + circular)")
                return 'Home & Kitchen'
            
            # 4. BEAUTY & PERSONAL CARE - Bottles, cosmetics (smooth, cylindrical)
            if texture_score < 0.4 and metallic_score < 0.5:
                if circular_score > 0.3 or aspect_ratio > 1.5:
                    print(f"DEBUG - Detected BEAUTY")
                    return 'Beauty & Personal Care'
            
            # 5. SPORTS & FITNESS - Balls, equipment (high circularity)
            if circular_score > 0.65:
                print(f"DEBUG - Detected SPORTS (circular)")
                return 'Sports & Fitness'
            
            # 6. FOOTWEAR - Shoes, boots (horizontal shape)
            footwear_score = self._detect_footwear_shape(img_array)
            if footwear_score > 0.5:
                print(f"DEBUG - Detected FOOTWEAR")
                return 'Footwear'
            
            # 7-8. FASHION (Men/Women) - Clothing with texture
            # Analyze different regions for clothing
            top_third = img_array[:height//3, :]
            bottom_third = img_array[2*height//3:, :]
            
            top_colors = get_dominant_colors(Image.fromarray(top_third.astype('uint8')), num_colors=1)
            bottom_colors = get_dominant_colors(Image.fromarray(bottom_third.astype('uint8')), num_colors=1)
            
            # Detect contrasting upper and lower garments (typical of casual wear)
            if top_colors and bottom_colors and texture_score > 0.4:
                top_color = top_colors[0]
                bottom_color = bottom_colors[0]
                color_diff = self._euclidean_distance(top_color, bottom_color)
                
                # High contrast suggests separate top/bottom garments
                if color_diff > 80:
                    if img_brightness < 140:
                        print(f"DEBUG - Detected MEN FASHION")
                        return 'Men Fashion'
                    elif img_brightness > 150:
                        print(f"DEBUG - Detected WOMEN FASHION")
                        return 'Women Fashion'
                    print(f"DEBUG - Detected FASHION (generic)")
                    return 'Men Fashion'
            
            # Fashion based on texture (clothing has texture)
            if texture_score > 0.35:
                if img_brightness < 130:
                    print(f"DEBUG - Detected MEN FASHION (texture + dark)")
                    return 'Men Fashion'
                elif img_brightness > 160:
                    print(f"DEBUG - Detected WOMEN FASHION (texture + bright)")
                    return 'Women Fashion'
                print(f"DEBUG - Detected FASHION (texture)")
                return 'Men Fashion'
            
            # Default based on characteristics
            if metallic_score > 0.4:
                print(f"DEBUG - Default ELECTRONICS (metallic)")
                return 'Electronics'
            
            print(f"DEBUG - Default FASHION")
            return 'Fashion'
        except Exception as e:
            print(f"Category detection error: {e}")
            return 'Fashion'
    
    def _score_product_similarity(
        self,
        product: Product,
        image_colors: Dict,
        image_category: str,
        color_weight: float,
        category_weight: float
    ) -> float:
        """Calculate similarity score between image and product."""
        score = 0.0
        
        # Category similarity (primary weight - now 60%)
        if product.category:
            category_similarity = self._calculate_category_similarity(
                image_category,
                product.category
            )
            score += category_similarity * category_weight
            
            # If category mismatch is too severe, penalize heavily
            if category_similarity < 0.3:
                return 0.0  # Skip products from wrong category
        else:
            score += 0.5 * category_weight  # Neutral score if no category
        
        # Color similarity (secondary weight - now 40%)
        color_similarity = self._calculate_color_similarity(
            image_colors['primary_color'],
            product
        )
        score += color_similarity * color_weight
        
        return score
    
    def _calculate_color_similarity(
        self,
        image_primary_color: Tuple[int, int, int],
        product: Product
    ) -> float:
        """Calculate how similar the product color is to image."""
        try:
            # If no product image, can't match
            if not product.image_url or not product.image_url.startswith('http'):
                return 0.5  # Neutral score
            
            # Compare product name/description color hints
            product_info = (product.name + ' ' + (product.description or '')).lower()
            
            # Common color keywords
            color_keywords = {
                'black': (0, 0, 0),
                'white': (255, 255, 255),
                'red': (255, 0, 0),
                'blue': (0, 0, 255),
                'green': (0, 255, 0),
                'yellow': (255, 255, 0),
                'gray': (128, 128, 128),
                'grey': (128, 128, 128),
                'pink': (255, 192, 203),
                'orange': (255, 165, 0),
                'purple': (128, 0, 128),
                'brown': (165, 42, 42),
                'beige': (245, 245, 220),
            }
            
            # Find colors mentioned in product
            mentioned_colors = []
            for color_name, color_rgb in color_keywords.items():
                if color_name in product_info:
                    mentioned_colors.append(color_rgb)
            
            if not mentioned_colors:
                return 0.6  # Default if no color info
            
            # Calculate distance to image color
            similarities = []
            for color in mentioned_colors:
                distance = self._euclidean_distance(image_primary_color, color)
                similarity = 1.0 / (1.0 + distance / 255.0)
                similarities.append(similarity)
            
            return max(similarities)
        except:
            return 0.5
    
    def _calculate_category_similarity(self, image_category: str, product_category: str) -> float:
        """Calculate category match score for all product categories."""
        if not product_category:
            return 0.2  # Low score if no category info
        
        product_cat_lower = product_category.lower()
        image_cat_lower = image_category.lower()
        
        # Normalize category names (remove &, extra spaces)
        def normalize(cat):
            return cat.replace('&', '').replace('  ', ' ').strip()
        
        product_norm = normalize(product_cat_lower)
        image_norm = normalize(image_cat_lower)
        
        # EXACT MATCH - Highest score
        if image_norm == product_norm or image_cat_lower == product_cat_lower:
            return 1.0
        
        # SAME CATEGORY GROUP matches
        category_groups = {
            'fashion': ['men fashion', 'women fashion', 'fashion', 'clothes'],
            'footwear': ['footwear', 'shoes', 'boots', 'sneakers'],
            'kitchen': ['home kitchen', 'kitchen', 'home', 'kitchen appliances'],
            'electronics': ['electronics', 'gadgets', 'tech', 'electronic'],
            'beauty': ['beauty personal care', 'beauty', 'personal care', 'cosmetics'],
            'toys': ['toys games', 'toys', 'games'],
            'sports': ['sports fitness', 'sports', 'fitness', 'athletic']
        }
        
        # Check if both belong to same group
        for group_name, keywords in category_groups.items():
            image_in_group = any(kw in image_norm for kw in keywords)
            product_in_group = any(kw in product_norm for kw in keywords)
            
            if image_in_group and product_in_group:
                # Same group - high score
                return 0.90
        
        # GENDER-SPECIFIC FASHION matching
        if 'fashion' in image_norm and 'fashion' in product_norm:
            # Same gender within fashion
            if ('men' in image_norm and 'men' in product_norm) or \
               ('women' in image_norm and 'women' in product_norm):
                return 0.95
            # Different gender - severe penalty
            elif ('men' in image_norm and 'women' in product_norm) or \
                 ('women' in image_norm and 'men' in product_norm):
                return 0.05
            # Generic fashion match
            return 0.70
        
        # CROSS-CATEGORY penalties (completely different types)
        major_categories = {
            'fashion': ['fashion', 'men', 'women', 'clothes'],
            'home': ['kitchen', 'home'],
            'tech': ['electronics', 'electronic'],
            'beauty': ['beauty', 'personal care'],
            'play': ['toys', 'games'],
            'active': ['sports', 'fitness']
        }
        
        image_major = None
        product_major = None
        
        for major_name, keywords in major_categories.items():
            if any(kw in image_norm for kw in keywords):
                image_major = major_name
            if any(kw in product_norm for kw in keywords):
                product_major = major_name
        
        # If both identified and different major categories
        if image_major and product_major and image_major != product_major:
            return 0.0  # Hard reject for cross-category mismatch
        
        # PARTIAL MATCHES
        # Check for keyword overlap
        image_words = set(image_norm.split())
        product_words = set(product_norm.split())
        overlap = image_words & product_words
        
        if overlap:
            overlap_ratio = len(overlap) / max(len(image_words), len(product_words))
            return 0.3 + (overlap_ratio * 0.4)  # 0.3 to 0.7 based on overlap
        
        # DEFAULT - Unrelated categories
        return 0.15
    
    def _detect_metallic(self, img_array: np.ndarray) -> float:
        """Detect metallic/shiny surfaces (high brightness, low color variance)."""
        try:
            # Convert to grayscale for brightness analysis
            gray = np.mean(img_array, axis=2)
            
            # High brightness regions indicate shine/metallic
            bright_pixels = np.sum(gray > 200) / (gray.shape[0] * gray.shape[1])
            
            # Low color variance (neutral gray/silver tones) indicates metallic
            color_variance = np.var(img_array)
            
            # Metallic score: combination of brightness and low variance
            metallic_score = (bright_pixels * 0.6) + (1.0 - min(color_variance / 5000.0, 1.0)) * 0.4
            return min(metallic_score, 1.0)
        except:
            return 0.0
    
    def _detect_circular_shapes(self, img_array: np.ndarray) -> float:
        """Detect circular/rounded shapes (pressure cookers, pans, balls, etc.)."""
        try:
            import cv2
            
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return 0.0
            
            circular_matches = 0
            for contour in contours[:10]:  # Check top 10 contours
                area = cv2.contourArea(contour)
                perimeter = cv2.arcLength(contour, True)
                
                if perimeter > 0:
                    circularity = 4 * np.pi * area / (perimeter ** 2)
                    if circularity > 0.6:  # More circular
                        circular_matches += 1
            
            return min(circular_matches / 10.0, 1.0)
        except:
            return 0.0
    
    def _detect_handles(self, img_array: np.ndarray) -> bool:
        """Detect handles/grips (common on kitchen items, pans, pots)."""
        try:
            import cv2
            
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Lines indicate handles/structure
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=30, maxLineGap=10)
            
            # If significant number of lines detected, likely has handles
            return lines is not None and len(lines) > 3
        except:
            return False
    
    def _detect_texture(self, img_array: np.ndarray) -> float:
        """Detect fabric/textile texture (high for clothing, low for smooth surfaces)."""
        try:
            import cv2
            
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Calculate gradient magnitude (texture indicator)
            sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
            sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
            gradient = np.sqrt(sobelx**2 + sobely**2)
            
            # Normalize texture score
            texture_score = np.mean(gradient) / 255.0
            return min(texture_score * 2, 1.0)  # Amplify for better discrimination
        except:
            return 0.5
    
    def _count_primary_colors(self, colors: List[Tuple[int, int, int]]) -> int:
        """Count how many primary/bright colors are present (for toys detection)."""
        primary_count = 0
        for color in colors:
            r, g, b = color
            # Check if color is bright and saturated (primary colors)
            brightness = (r + g + b) / 3
            saturation = max(r, g, b) - min(r, g, b)
            
            if brightness > 120 and saturation > 80:
                primary_count += 1
        
        return primary_count
    
    def _detect_footwear_shape(self, img_array: np.ndarray) -> float:
        """Detect footwear-specific shapes (elongated, curved profile)."""
        try:
            import cv2
            
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            
            # Find contours
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return 0.0
            
            # Get largest contour (likely the main object)
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Get bounding box
            x, y, w, h = cv2.boundingRect(largest_contour)
            aspect_ratio = w / h if h > 0 else 0
            
            # Footwear typically has horizontal aspect ratio (wider than tall)
            # And moderate curve (not perfectly rectangular)
            if 1.5 < aspect_ratio < 3.5:
                return 0.7
            elif 1.2 < aspect_ratio < 1.5:
                return 0.4
            
            return 0.0
        except:
            return 0.0
    
    @staticmethod
    def _euclidean_distance(color1: Tuple[int, int, int], color2: Tuple[int, int, int]) -> float:
        """Calculate Euclidean distance between two RGB colors."""
        return np.sqrt(
            (color1[0] - color2[0]) ** 2 +
            (color1[1] - color2[1]) ** 2 +
            (color1[2] - color2[2]) ** 2
        )
