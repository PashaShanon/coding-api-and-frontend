// file name: config/swagger/swagger-config.js
// file content begin
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Toko Pakaian API',
    version: '1.0.0',
    description: 'API Documentation untuk Sistem Manajemen Toko Pakaian - UKT Project',
    contact: {
      name: 'Student Project',
      email: 'admin@demo.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Development Server'
    },
    {
      url: process.env.CLIENT_URL || 'http://localhost:3000/api',
      description: 'Production Server'
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and token management'
    },
    {
      name: 'Users',
      description: 'User management endpoints'
    },
    {
      name: 'Categories',
      description: 'Product categories management'
    },
    {
      name: 'Products',
      description: 'Products management'
    },
    {
      name: 'Transactions',
      description: 'Sales transactions management'
    },
    {
      name: 'System',
      description: 'System information and health checks'
    }
  ],
  security: [
    {
      bearerAuth: []
    }
  ]
};
// file content end