# **API Toko Pakaian - Complete Documentation**

## **Overview**
API untuk sistem manajemen toko pakaian dengan Express.js, PostgreSQL, dan JWT authentication. Dilengkapi dengan dokumentasi Swagger UI interaktif dan testing suite.

## **Quick Start**

### **Installation & Setup**
```bash
# 1. Install dependencies
npm install

# 2. Setup database & demo data
npm run setup

# 3. Start server
npm start

# 4. Open documentation
npm run swagger
```

### **Access Points**
- **API Base**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## **Authentication**

### **Demo Accounts**
```
Admin:  admin@demo.com  / admin123
Kasir:  kasir@demo.com  / kasir123
```

### **JWT Flow**
1. **Login** → Dapatkan access & refresh token
2. **Use Token** → Header: `Authorization: Bearer YOUR_TOKEN`
3. **Refresh** → Ketika access token expired (15 menit)

## **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Current user profile

### **Users** (Admin only)
- `GET /api/users/profile` - User profile
- `POST /api/users/register` - Register new user
- `PUT /api/users/deactivate-user` - Deactivate user

### **Categories** (Admin for CUD, All for Read)
- `GET /api/categories` - All categories
- `GET /api/categories/:id` - Category by ID
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### **Products** (Admin for CUD, All for Read)
- `GET /api/products` - All products (with pagination)
- `GET /api/products/:id` - Product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### **Transactions** (Admin/Kasir only)
- `GET /api/transactions` - All transactions
- `GET /api/transactions/:id` - Transaction by ID
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction

## **Usage Examples**

### **Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"admin123"}'
```

### **Create Product**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kemeja Formal",
    "description": "Kemeja formal berkualitas",
    "price": 150000,
    "stock": 25,
    "category_id": 1
  }'
```

### **Create Transaction**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product_id": 1, "quantity": 2}],
    "payment_method": "cash"
  }'
```

## **Development**

### **Available Scripts**
```bash
npm start           # Production server
npm run dev         # Development server (nodemon)
npm run setup       # Setup database & demo data
npm test            # Run API tests
npm run test:full   # Setup + run tests
npm run swagger     # Open Swagger UI
```

### **Environment Variables**
```env
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=toko_online

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

## **Database Schema**

### **Tables**
- **users** - User accounts dengan role-based access
- **categories** - Product categories
- **products** - Product catalog dengan stock management
- **transactions** - Sales transactions
- **transaction_items** - Transaction line items

### **Default Data**
- **3 Users**: 1 Admin, 2 Kasir
- **7 Categories**: Kemeja, Kaos, Celana, Dress, Jaket, Rok, Aksesoris
- **24 Products**: Berbagai produk dengan stock
- **Sample Transactions**: Data transaksi contoh

## **Testing**

### **Test Coverage**
- **18/19 tests passed** (94.7% success rate)
- Authentication flow testing
- CRUD operations untuk semua endpoints
- Input validation & error handling

### **Run Tests**
```bash
npm test
```

## **Security Features**

- **JWT Authentication** dengan access & refresh tokens
- **Password Hashing** dengan bcrypt (salt rounds: 12)
- **Rate Limiting** (100 requests per 15 minutes)
- **CORS Protection** dengan configurable origins
- **Security Headers** via Helmet
- **Input Validation** pada semua endpoints
- **SQL Injection Protection** dengan parameterized queries
- **Role-based Access Control** (Admin/Kasir)

## **Swagger Documentation**

### **cara menggunakan**
1. **Login**: contoh `/api/auth/login`
2. **Authorize**: Click button → Enter `Bearer YOUR_TOKEN`
3. **Test Endpoints**: semua end point sekarang dapat diakses

### **Features**
- JWT Bearer authentication
- Schema validation

## **Production Deployment**
- none :(

### **Environment**
```env
NODE_ENV=production
PORT=80
DB_HOST=your_production_db
JWT_ACCESS_SECRET=strong_production_secret
JWT_REFRESH_SECRET=strong_production_refresh_secret
CLIENT_URL=https://yourdomain.com
```

### **Response Format**
```json
{
  "status": "success",
  "message": "Operation completed",
  "data": { /* response data */ }
}
```

### **Error Format**
```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### **Pagination Format**
```json
{
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

## **Troubleshooting**

1. **server tidak mau berjalan?**: Check port 3000 availability
2. **Database errors?**: Verify PostgreSQL is running
3. **Token errors?**: Check JWT secrets in .env file
4. **Permission errors?**: Verify user role and endpoint access

---

## **Quick Summary**
```bash
# Complete workflow
npm install && npm run setup && npm start

# Test everything
npm run test:full

# Access documentation
npm run swagger
```

## **glaze to heishou pack**3