// User context management for tracking interests and purchase history

const STORAGE_KEYS = {
  PURCHASE_HISTORY: 'ecommerce_purchase_history',
  INTERESTS: 'ecommerce_interests',
  USER_ID: 'ecommerce_user_id',
} as const;

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
}

export function getPurchaseHistory(): string[] {
  if (typeof window === 'undefined') return [];
  
  const history = localStorage.getItem(STORAGE_KEYS.PURCHASE_HISTORY);
  return history ? JSON.parse(history) : [];
}

export function addPurchase(productId: string): void {
  if (typeof window === 'undefined') return;
  
  const history = getPurchaseHistory();
  if (!history.includes(productId)) {
    history.push(productId);
    localStorage.setItem(STORAGE_KEYS.PURCHASE_HISTORY, JSON.stringify(history));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('userContextChanged'));
  }
}

export function getInterests(): string[] {
  if (typeof window === 'undefined') return [];
  
  const interests = localStorage.getItem(STORAGE_KEYS.INTERESTS);
  return interests ? JSON.parse(interests) : [];
}

export function setInterests(interests: string[]): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEYS.INTERESTS, JSON.stringify(interests));
}

export function addInterest(category: string): void {
  if (typeof window === 'undefined') return;
  
  const interests = getInterests();
  if (!interests.includes(category.toLowerCase())) {
    interests.push(category.toLowerCase());
    setInterests(interests);
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('userContextChanged'));
  }
}

// Track view as interest (when user views a product category)
export function trackCategoryView(category: string): void {
  addInterest(category.toLowerCase());
}

// Track purchase (call when user purchases a product)
export function trackPurchase(productId: string, category?: string): void {
  addPurchase(productId);
  if (category) {
    addInterest(category.toLowerCase());
  }
}
