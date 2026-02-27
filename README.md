# E-Commerce Platform

A full-stack e-commerce application with Next.js frontend and FastAPI backend, featuring admin dashboard, product management, virtual try-on, and AI recommendations.

**GitHub Repository:** https://github.com/nareshn-01/e-commerce

## Features

### Frontend (Next.js)
- Modern, responsive UI with Tailwind CSS
- Admin Dashboard for product management
- Product browsing and filtering
- Shopping cart functionality
- Wishlist management
- Virtual try-on capabilities
- AI-powered outfit recommendations
- Product comparison
- User authentication (login/signup)
- Checkout with Stripe payment integration
- Product Q&A and reviews
- AI chat assistant

### Backend (FastAPI)
- RESTful API for product management
- User authentication with JWT tokens
- Admin endpoints for CRUD operations
- Product recommendations engine
- Category management
- Stock tracking
- Rating system
- Database integration with SQLite/PostgreSQL

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (React 18)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **State Management:** React Context API
- **Icons:** Lucide React
- **Payment:** Stripe

### Backend
- **Framework:** FastAPI
- **Database:** SQLite (development) / PostgreSQL (production)
- **Authentication:** JWT
- **Server:** Uvicorn
- **ORM:** SQLAlchemy

## Project Structure

```
e-commerce/
├── app/                          # Next.js app directory
│   ├── admin/                    # Admin dashboard
│   ├── products/                 # Products page
│   ├── cart/                     # Shopping cart
│   ├── checkout/                 # Checkout page
│   └── [other pages]
├── components/                   # React components
│   ├── ui/                       # Shadcn UI components
│   └── [feature components]
├── backend/                      # FastAPI server
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── models.py            # Database models
│   │   ├── schemas.py           # Pydantic schemas
│   │   └── routers/             # API endpoints
│   └── requirements.txt
├── lib/                          # Utility functions and contexts
├── public/                       # Static assets
└── styles/                       # Global styles
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm or pnpm

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nareshn-01/e-commerce.git
   cd e-commerce
   ```

2. **Frontend setup:**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

### Configuration

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Running Locally

1. **Start the backend:**
   ```bash
   cd backend
   python app/main.py
   ```
   Backend will be available at `http://localhost:8000`

2. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```
   Frontend will be available at `http://localhost:3000`

3. **Access the application:**
   - Main site: http://localhost:3000
   - Admin dashboard: http://localhost:3000/admin
   - API docs: http://localhost:8000/docs

## Deployment

### Deploy to Vercel (Recommended for Next.js)

1. **Push to GitHub** ✅ (Already done at https://github.com/nareshn-01/e-commerce)

2. **Create Vercel account:**
   - Go to https://vercel.com
   - Sign up with GitHub

3. **Import project:**
   - Click "Add New..." → "Project"
   - Select your GitHub repository `nareshn-01/e-commerce`
   - Click "Import"

4. **Configure environment variables:**
   - In Vercel project settings → "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_API_URL`: Your FastAPI backend URL
     - `NEXT_PUBLIC_STRIPE_PUBLIC_KEY`: Your Stripe public key

5. **Deploy:**
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

### Deploy Backend (FastAPI)

**Option 1: Railway**
- Visit https://railway.app
- Connect your GitHub repository
- Set root directory to `backend/`
- Add environment variables
- Deploy

**Option 2: Render**
- Visit https://render.com
- Create new Web Service
- Connect GitHub repository
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Option 3: Heroku (if still available)**
- Follow Heroku deployment documentation
- Set root directory to `backend/`

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

### Backend (.env)
```
DATABASE_URL=sqlite:///./ecommerce.db
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
```

## API Endpoints

- `GET /api/products` - List products
- `POST /api/admin/products` - Create product (admin)
- `PUT /api/admin/products/{id}` - Update product (admin)
- `DELETE /api/admin/products/{id}` - Delete product (admin)
- `GET /api/admin/dashboard` - Dashboard stats (admin)
- `GET /api/admin/categories` - Get categories (admin)
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

See full API documentation at `/docs` when backend is running.

## Features Showcase

### Admin Dashboard
- Product CRUD operations
- Inventory management
- Sales analytics
- Category management
- Bulk operations

### User Experience
- Responsive design
- Fast product search
- Smart recommendations
- Virtual try-on simulation
- Wishlist & comparison
- Real-time cart updates

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/nareshn-01/e-commerce/issues
- GitHub Discussions: https://github.com/nareshn-01/e-commerce/discussions

## Deploy Now

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnareshn-01%2Fe-commerce&project-name=e-commerce&repo-name=e-commerce)

## Repository

**GitHub:** https://github.com/nareshn-01/e-commerce

---

Made with ❤️ by Naresh
