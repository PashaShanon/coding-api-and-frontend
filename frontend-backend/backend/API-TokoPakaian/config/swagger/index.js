// file name: config/swagger/index.js
// file content begin
const swaggerConfig = require('./swagger-config');
const swaggerDefinitions = require('./swagger-definitions');
const swaggerPaths = require('./swagger-paths');

const specs = {
  ...swaggerConfig,
  components: {
    ...swaggerDefinitions
  },
  paths: {
    ...swaggerPaths
  }
};

module.exports = specs;
// file content end