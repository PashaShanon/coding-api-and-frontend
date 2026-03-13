require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const pool = require('./database/pool');
const swaggerUi = require('swagger-ui-express');
const specs = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper for colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m"
};

const log = {
  success: (msg) => console.log(`${colors.green}✔ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✖ ${msg}${colors.reset}`),
  box: (lines) => {
    const width = Math.max(...lines.map(l => l.replace(/\x1b\[\d+m/g, '').length)) + 4;
    const border = `${colors.gray}┌${'─'.repeat(width)}┐${colors.reset}`;
    const bottom = `${colors.gray}└${'─'.repeat(width)}┘${colors.reset}`;
    console.log(`\n${border}`);
    lines.forEach(line => {
      const plain = line.replace(/\x1b\[\d+m/g, '');
      const padding = ' '.repeat(width - plain.length - 2);
      console.log(`${colors.gray}│${colors.reset} ${line}${padding} ${colors.gray}│${colors.reset}`);
    });
    console.log(`${bottom}\n`);
  }
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 1000, // maksimal 1000 request per windowMs
  message: {
    status: 'error',
    message: 'Terlalu banyak request dari IP yang sama.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString();
  const method = `${colors.cyan}${req.method}${colors.reset}`;
  console.log(`${colors.gray}[${time}]${colors.reset} ${method} ${req.path}`);
  next();
});

// Security middleware
app.use(helmet());

// Database connection test
pool.query('SELECT NOW()')
  .then(result => {
    log.success(`PostgreSQL Connected: ${colors.gray}${result.rows[0].now}${colors.reset}`);
  })
  .catch(err => {
    log.error(`PostgreSQL Connection Failed: ${colors.yellow}${err.message}${colors.reset}`);
  });

// Supabase Connection Test (SDK)
const supabase = require('./database/supabase');
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase.from('products').select('count', { count: 'exact', head: true })
    .then(({ error }) => {
      if (error) {
        if (error.message && error.message.includes('requested path is invalid')) {
          log.info('Supabase SDK: Reached root but path restricted (Common if not using real products table)');
        } else {
          log.warn(`Supabase SDK Warning: ${error.message}`);
        }
      } else {
        log.success('Supabase SDK Connection: OK');
      }
    })
    .catch(err => {
      if (err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
        log.info('Supabase SDK: Unreachable (Network/DNS). Will use Local fallback.');
      } else {
        log.error(`Supabase SDK Error: ${err.message}`);
      }
    });
} else {
  log.info('Supabase SDK not configured');
}

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Toko Pakaian API Documentation'
}));

// Routes - menggunakan prefix /api
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/users', require('./routes/users'));

app.get('/', (req, res) => {
  res.json({
    message: 'Toko Pakaian API - UKT Project',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1');
    res.json({
      status: 'OK',
      server: "backend waving",
      timestamp: new Date().toISOString(),
      database: 'Connected',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  log.error(`${req.method} ${req.path} - ${err.message}`);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n${colors.yellow}Stopping server...${colors.reset}`);
  await pool.end();
  process.exit(0);
});

app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV !== 'production';
  const url = `http://localhost:${PORT}`;

  log.box([
    `${colors.bright}${colors.cyan}TOKO PAKAIAN API${colors.reset}`,
    `${colors.gray}Environment: ${colors.reset}${process.env.NODE_ENV || 'development'}`,
    `${colors.gray}Port:        ${colors.reset}${PORT}`,
    ``,
    `${colors.bright}Endpoints:${colors.reset}`,
    `  ${colors.cyan}Swagger UI:  ${colors.reset}${url}/api-docs`,
    `  ${colors.cyan}Health Check:${colors.reset}${url}/health`,
    `  ${colors.cyan}API Root:    ${colors.reset}${url}/`,
    ``,
    `${colors.bright}Accounts:${colors.reset}`,
    `  ${colors.green}Admin:${colors.reset} admin@demo.com ${colors.gray}/ admin123${colors.reset}`,
    `  ${colors.green}Kasir:${colors.reset} kasir@demo.com ${colors.gray}/ kasir123${colors.reset}`
  ]);
});