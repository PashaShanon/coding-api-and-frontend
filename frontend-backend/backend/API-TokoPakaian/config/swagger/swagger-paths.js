// file name: config/swagger/swagger-paths.js
// file content begin
module.exports = {
  '/': {
    get: {
      summary: 'Get API information',
      description: 'Returns basic information about the API',
      tags: ['System'],
      responses: {
        200: {
          description: 'API information retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  version: { type: 'string' },
                  author: { type: 'string' },
                  documentation: { type: 'string' },
                  endpoints: { type: 'object' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  },

  '/health': {
    get: {
      summary: 'Health check',
      description: 'Check API and database health status',
      tags: ['System'],
      responses: {
        200: {
          description: 'System is healthy',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  timestamp: { type: 'string' },
                  database: { type: 'string' },
                  uptime: { type: 'number' }
                }
              }
            }
          }
        },
        500: {
          description: 'System health check failed'
        }
      }
    }
  },

  '/api/auth/login': {
    post: {
      summary: 'User login',
      description: 'Authenticate user and return JWT tokens',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginResponse' }
            }
          }
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/api/auth/refresh': {
    post: {
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      refreshToken: { type: 'string' },
                      tokenType: { type: 'string' },
                      expiresIn: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { description: 'Invalid or expired refresh token' }
      }
    }
  },

  '/api/auth/me': {
    get: {
      summary: 'Get current user profile',
      description: 'Returns the profile of the currently authenticated user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  },

  '/api/auth/logout': {
    post: {
      summary: 'User logout',
      description: 'Logout the current user (token invalidation)',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/api/categories': {
    get: {
      summary: 'Get all categories',
      description: 'Retrieve list of all product categories',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Categories retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Category' }
                  }
                }
              }
            }
          }
        },
        401: { $ref: '#/components/responses/UnauthorizedError' }
      }
    },

    post: {
      summary: 'Create new category',
      description: 'Create a new product category (Admin only)',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Pakaian Pria' },
                description: { type: 'string', example: 'Kategori untuk pakaian pria' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Category created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: { $ref: '#/components/schemas/Category' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  },

  '/api/categories/{id}': {
    get: {
      summary: 'Get category by ID',
      description: 'Retrieve a specific category by its ID',
      tags: ['Categories'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'integer' },
          description: 'Category ID'
        }
      ],
      responses: {
        200: {
          description: 'Category retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: { $ref: '#/components/schemas/Category' }
                }
              }
            }
          }
        },
        404: { $ref: '#/components/responses/NotFoundError' }
      }
    }
  },

  '/api/products': {
    get: {
      summary: 'Get all products with pagination',
      description: 'Retrieve paginated list of products with optional search and filtering',
      tags: ['Products'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1 },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100 },
          description: 'Number of items per page'
        },
        {
          in: 'query',
          name: 'search',
          schema: { type: 'string' },
          description: 'Search term for product name'
        },
        {
          in: 'query',
          name: 'category_id',
          schema: { type: 'integer' },
          description: 'Filter by category ID'
        }
      ],
      responses: {
        200: {
          description: 'Products retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      products: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' }
                      },
                      pagination: {
                        type: 'object',
                        properties: {
                          page: { type: 'integer' },
                          limit: { type: 'integer' },
                          total: { type: 'integer' },
                          totalPages: { type: 'integer' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/transactions': {
    post: {
      summary: 'Create new transaction',
      description: 'Create a new sales transaction (Kasir only)',
      tags: ['Transactions'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items', 'payment_method'],
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['product_id', 'quantity'],
                    properties: {
                      product_id: { type: 'integer' },
                      quantity: { type: 'integer', minimum: 1 }
                    }
                  }
                },
                payment_method: {
                  type: 'string',
                  enum: ['cash', 'credit_card', 'debit_card', 'transfer']
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Transaction created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      transaction_code: { type: 'string' },
                      total_amount: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },

  '/api/users/register': {
    post: {
      summary: 'Register new user',
      description: 'Register a new user account (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                name: { type: 'string', example: 'John Doe' },
                email: { type: 'string', format: 'email', example: 'john@example.com' },
                password: { type: 'string', format: 'password', example: 'password123' },
                role: { type: 'string', enum: ['admin', 'kasir'], default: 'kasir' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string' },
                  message: { type: 'string' },
                  data: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/UnauthorizedError' }
      }
    }
  }
};
// file content end