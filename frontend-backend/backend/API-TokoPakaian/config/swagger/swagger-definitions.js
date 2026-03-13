// file name: config/swagger/swagger-definitions.js
// file content begin
module.exports = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
  schemas: {
    User: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        id: { type: 'integer', description: 'User ID' },
        name: { type: 'string', description: 'Full name of the user' },
        email: { type: 'string', format: 'email', description: 'User email address' },
        password: { type: 'string', format: 'password', description: 'User password (min 6 characters)' },
        role: { type: 'string', enum: ['admin', 'kasir'], description: 'User role' },
        is_active: { type: 'boolean', description: 'User account status' },
        created_at: { type: 'string', format: 'date-time', description: 'Account creation timestamp' },
        updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
      }
    },
    LoginRequest: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@demo.com' },
        password: { type: 'string', format: 'password', example: 'admin123' }
      }
    },
    LoginResponse: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/User' },
            accessToken: { type: 'string', description: 'JWT Access Token' },
            refreshToken: { type: 'string', description: 'JWT Refresh Token' },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'string', example: '15m' }
          }
        }
      }
    },
    Category: {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer', description: 'Category ID' },
        name: { type: 'string', description: 'Category name' },
        description: { type: 'string', description: 'Category description' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    },
    Product: {
      type: 'object',
      required: ['name', 'description', 'price', 'stock', 'category_id'],
      properties: {
        id: { type: 'integer', description: 'Product ID' },
        name: { type: 'string', description: 'Product name' },
        description: { type: 'string', description: 'Product description' },
        price: { type: 'number', format: 'float', description: 'Product price' },
        stock: { type: 'integer', description: 'Product stock quantity' },
        category_id: { type: 'integer', description: 'Category ID' },
        category_name: { type: 'string', description: 'Category name (from join)' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    },
    Transaction: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Transaction ID' },
        transaction_code: { type: 'string', description: 'Unique transaction code' },
        user_id: { type: 'integer', description: 'Cashier user ID' },
        cashier_name: { type: 'string', description: 'Cashier name' },
        total_amount: { type: 'number', format: 'float', description: 'Total transaction amount' },
        payment_method: { type: 'string', enum: ['cash', 'credit_card', 'debit_card', 'transfer'], description: 'Payment method' },
        status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], description: 'Transaction status' },
        created_at: { type: 'string', format: 'date-time' },
        items: {
          type: 'array',
          items: { $ref: '#/components/schemas/TransactionItem' }
        }
      }
    },
    TransactionItem: {
      type: 'object',
      required: ['product_id', 'quantity'],
      properties: {
        id: { type: 'integer', description: 'Transaction item ID' },
        transaction_id: { type: 'integer', description: 'Transaction ID' },
        product_id: { type: 'integer', description: 'Product ID' },
        product_name: { type: 'string', description: 'Product name' },
        quantity: { type: 'integer', description: 'Product quantity' },
        price: { type: 'number', format: 'float', description: 'Product price at time of transaction' },
        subtotal: { type: 'number', format: 'float', description: 'Quantity × Price' }
      }
    },
    Error: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        message: { type: 'string', example: 'Error message description' },
        code: { type: 'string', example: 'ERROR_CODE' },
        errors: { type: 'array', items: { type: 'string' } },
        stack: { type: 'string', description: 'Error stack trace (development only)' }
      }
    },
    Success: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        message: { type: 'string', example: 'Operation completed successfully' },
        data: { type: 'object', description: 'Response data' }
      }
    }
  },
  responses: {
    UnauthorizedError: {
      description: 'Access token is missing or invalid',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          example: {
            status: 'error',
            message: 'Access token is required',
            code: 'TOKEN_REQUIRED'
          }
        }
      }
    },
    ValidationError: {
      description: 'Validation failed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          example: {
            status: 'error',
            message: 'Validation failed',
            errors: ['Name is required', 'Email must be valid'],
            code: 'VALIDATION_ERROR'
          }
        }
      }
    },
    NotFoundError: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Error' },
          example: {
            status: 'error',
            message: 'Resource not found',
            code: 'NOT_FOUND'
          }
        }
      }
    }
  }
};
// file content end