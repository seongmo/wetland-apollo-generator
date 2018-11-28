const path = require('path');

module.exports = {
  stores: {
    defaultStore: {
      client: 'sqlite3',
      connection: {
        filename: "./mydb.sqlite"
      }
    }
  },
  entityPath: path.resolve(process.cwd(), 'entities')
};