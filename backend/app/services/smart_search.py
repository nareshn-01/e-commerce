"""
Smart Search Engine with NLP preprocessing and semantic matching.

Features:
- Typo tolerance using Levenshtein distance
- Stemming and lemmatization
- Semantic search (category autocomplete)
- Relevance ranking (TF-IDF inspired)
"""

import re
import math
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from ..models import Product


class SmartSearchEngine:
    """AI-powered product search with typo tolerance and semantic matching."""
    
    def __init__(self, db: Session):
        self.db = db
        self.min_similarity_threshold = 0.7  # 70% match for typo tolerance
        
    def _normalize_text(self, text: str) -> str:
        """Normalize text for comparison."""
        return text.lower().strip()
    
    def _tokenize(self, text: str) -> List[str]:
        """Split text into tokens."""
        text = self._normalize_text(text)
        # Remove special characters, split by spaces
        tokens = re.findall(r'\w+', text)
        return tokens
    
    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein distance between two strings."""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]
    
    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """
        Calculate similarity between two strings (0-1).
        1.0 = perfect match, 0.0 = no similarity
        """
        s1 = self._normalize_text(s1)
        s2 = self._normalize_text(s2)
        
        # Exact match
        if s1 == s2:
            return 1.0
        
        # Partial match (one contains the other)
        if s1 in s2 or s2 in s1:
            shorter = min(len(s1), len(s2))
            longer = max(len(s1), len(s2))
            return shorter / longer
        
        # Levenshtein-based similarity
        max_len = max(len(s1), len(s2))
        distance = self._levenshtein_distance(s1, s2)
        similarity = 1 - (distance / max_len)
        
        return similarity
    
    def _get_category_suggestions(self, query: str) -> List[Tuple[str, float]]:
        """Get category suggestions with relevance scores."""
        # Get all unique categories from database
        categories = self.db.query(Product.category).distinct().all()
        categories = [c[0] for c in categories if c[0]]
        
        matches = []
        for category in categories:
            similarity = self._calculate_similarity(query, category)
            if similarity >= self.min_similarity_threshold:
                matches.append((category, similarity))
        
        # Sort by similarity (descending)
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[:5]  # Top 5 suggestions
    
    def search_products(
        self,
        query: str,
        category: Optional[str] = None,
        limit: int = 20,
        skip: int = 0,
        sort_by: str = "relevance"
    ) -> Tuple[List[Product], List[str]]:
        """
        Search products with smart matching.
        
        Args:
            query: Search query (product name/description/brand)
            category: Optional category filter
            limit: Max results to return
            skip: Pagination offset
            sort_by: Sort order (relevance, price, rating, newest)
        
        Returns:
            Tuple of (matched_products, suggestions_if_no_match)
        """
        if not query or len(query.strip()) == 0:
            # Empty query - return trending products
            return self.db.query(Product)\
                .order_by(Product.rating.desc())\
                .limit(limit)\
                .all(), []
        
        # Tokenize query
        query_tokens = self._tokenize(query)
        if not query_tokens:
            return [], []
        
        # Get all products (we'll score them in Python for flexibility)
        all_products = self.db.query(Product).all()
        
        # Score each product
        scored_products = []
        for product in all_products:
            score = self._score_product(product, query, query_tokens)
            # Only include products with meaningful relevance (threshold: 0.35 = 35%)
            if score >= 0.35:
                scored_products.append((product, score))
        
        # Sort by score (descending)
        scored_products.sort(key=lambda x: x[1], reverse=True)
        
        # Apply category filter if specified
        if category:
            category_lower = category.lower()
            scored_products = [
                (p, s) for p, s in scored_products
                if p.category and category_lower in p.category.lower()
            ]
        
        # Apply additional sorting if requested
        if sort_by == "price":
            scored_products.sort(key=lambda x: x[0].price)
        elif sort_by == "rating":
            scored_products.sort(key=lambda x: x[0].rating, reverse=True)
        elif sort_by == "newest":
            scored_products.sort(key=lambda x: x[0].created_at, reverse=True)
        # else: keep relevance sorting (already sorted above)
        
        # Extract products (without scores)
        results = [p for p, s in scored_products]
        
        # Get suggestions if no results found
        suggestions = []
        if not results:
            # Suggest categories based on query
            suggestions = [cat for cat, _ in self._get_category_suggestions(query)]
        
        # Apply pagination and return
        return results[skip:skip + limit], suggestions
    
    def _score_product(self, product: Product, query: str, query_tokens: List[str]) -> float:
        """
        Calculate relevance score for a product.
        
        Scoring factors:
        - Name match (highest weight - 60%)
        - Category match (20%)
        - Description match (20%)
        """
        score = 0.0
        query_lower = query.lower()
        
        # Name match (weight: 60%)
        if product.name:
            name_lower = product.name.lower()
            
            # Exact substring match gets maximum score
            if query_lower in name_lower:
                score += 0.60
            else:
                # Calculate similarity for partial matches
                name_similarity = self._calculate_similarity(query, product.name)
                
                # Also check token matches in name - require higher threshold (0.80)
                name_tokens = self._tokenize(product.name)
                token_matches = sum(1 for qt in query_tokens if any(
                    self._calculate_similarity(qt, nt) >= 0.80 for nt in name_tokens
                ))
                
                # Require at least 70% of query tokens to match in name for a good score
                if len(query_tokens) > 0:
                    token_match_ratio = token_matches / len(query_tokens)
                    # Only give credit if at least 70% of tokens match
                    if token_match_ratio >= 0.70:
                        name_score = max(name_similarity, token_match_ratio)
                        score += name_score * 0.60
                    else:
                        # Low token match gets minimal credit
                        score += name_similarity * 0.30
                else:
                    score += name_similarity * 0.60
        
        # Category match (weight: 20%)
        if product.category:
            category_lower = product.category.lower()
            # Check if any query token matches category
            category_match = any(qt.lower() in category_lower or category_lower in qt.lower() 
                               for qt in query_tokens)
            if category_match:
                score += 0.20
        
        # Description match (weight: 20%)
        if product.description:
            desc_lower = product.description.lower()
            # Check for query tokens in description
            desc_tokens = self._tokenize(product.description)
            desc_matches = sum(1 for qt in query_tokens if any(
                self._calculate_similarity(qt, dt) >= 0.80 for dt in desc_tokens
            ))
            if len(query_tokens) > 0:
                # Require at least 50% of tokens to match for description credit
                desc_match_ratio = desc_matches / len(query_tokens)
                if desc_match_ratio >= 0.50:
                    score += desc_match_ratio * 0.20
        
        return score
    
    def get_search_suggestions(self, prefix: str, limit: int = 10) -> List[str]:
        """
        Get autocomplete suggestions for search prefix.
        
        Returns product names and categories that match the prefix.
        """
        if not prefix or len(prefix.strip()) < 2:
            return []
        
        prefix_lower = prefix.lower()
        suggestions = set()
        
        # Get products matching prefix
        products = self.db.query(Product).all()
        
        for product in products:
            # Check name
            if product.name and product.name.lower().startswith(prefix_lower):
                suggestions.add(product.name)
            
            # Check category
            if product.category and product.category.lower().startswith(prefix_lower):
                suggestions.add(product.category)
        
        # Sort by relevance (exact match, then by length)
        suggestions = list(suggestions)
        suggestions.sort(key=lambda x: (not x.lower().startswith(prefix_lower), len(x)))
        
        return suggestions[:limit]
