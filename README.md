# Diff It! - MySQL/MariaDB Schema Diff Tool

**Diff It!** is a powerful web-based tool for comparing MySQL/MariaDB database schemas and generating migration SQL scripts to synchronize databases.

## Features

- **Multi-Database Support**: Compare schemas between two different MySQL/MariaDB databases
- **Comprehensive Analysis**: Detects differences in:
  - Tables (structure, engine, charset, collation)
  - Columns (type, nullability, defaults, charset)
  - Primary Keys
  - Unique Keys & Indexes
  - Foreign Keys (with ON UPDATE/DELETE rules)
  - Views & Triggers
  - Check Constraints (MySQL 8+)
- **Safe SQL Generation**: Produces executable SQL scripts with proper operation ordering
- **Clean Output**: Handles MySQL internal markers like `DEFAULT_GENERATED`
- **User-Friendly Interface**: Modern React UI with Tailwind CSS
- **Real-time Validation**: Connection testing before schema inspection
- **Export Options**: Download or copy generated SQL scripts

## Technology Stack

### Backend
- **Node.js** with **TypeScript**
- **Fastify** - Fast and low overhead web framework
- **mysql2** - MySQL client with promise support
- **dotenv** - Environment configuration

### Frontend
- **React 18** with **TypeScript**
- **Vite** - Next generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework

## Prerequisites

- Node.js 18+ 
- npm or yarn
- MySQL 5.7+ / MySQL 8.x / MariaDB 10.x+
- Access to two MySQL/MariaDB databases to compare

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/DiffIt.git
cd DiffIt
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your preferred settings
nano .env
```

**Backend .env Configuration:**

```env
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install

# Create .env file from example
cp .env.example .env

# Edit .env to point to your backend
nano .env
```

**Frontend .env Configuration:**

```env
VITE_API_URL=http://localhost:3001
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend will start on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will start on `http://localhost:5173`

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm run preview
```

### Docker Deployment

```bash
docker-compose up -d
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

## Usage

1. **Connect to Databases**
   - Enter connection details for your Primary (source) database
   - Enter connection details for your Secondary (target) database
   - Click "Test Connection" to verify both connections

2. **Select Databases**
   - Choose the specific database from the Primary server
   - Choose the specific database from the Secondary server

3. **Compare Schemas**
   - Click "Compare" to analyze differences
   - Review the comparison summary and detailed differences

4. **Generate Migration Script**
   - View the generated SQL script
   - Optionally enable "Include DROP statements" for destructive changes
   - Download or copy the SQL script
   - Execute the script on your Secondary database

## API Endpoints

### `POST /api/test-connection`
Test database connection

**Request:**
```json
{
  "host": "localhost",
  "port": 3306,
  "user": "root",
  "password": "password",
  "ssl": false
}
```

### `POST /api/list-databases`
List all databases (excludes system databases)

### `POST /api/inspect-schema`
Inspect complete schema of a database

**Request:**
```json
{
  "conn": { /* connection config */ },
  "database": "my_database"
}
```

### `POST /api/compare`
Compare two schemas and generate SQL

**Request:**
```json
{
  "primarySchemaJson": { /* schema metadata */ },
  "secondarySchemaJson": { /* schema metadata */ },
  "options": {
    "includeDrops": false
  }
}
```

## Project Structure

```
DiffIt/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Fastify server entry point
│   │   ├── routes/
│   │   │   └── api.routes.ts     # API route definitions
│   │   ├── services/
│   │   │   ├── database.service.ts   # MySQL connection & schema inspection
│   │   │   └── diff.service.ts       # Schema comparison & SQL generation
│   │   └── types/
│   │       └── index.ts          # TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main application component
│   │   ├── components/
│   │   │   ├── ConnectionForm.tsx    # Database connection UI
│   │   │   └── DiffResults.tsx       # Comparison results display
│   │   ├── services/
│   │   │   └── api.service.ts    # Backend API client
│   │   └── types/
│   │       └── index.ts          # TypeScript type definitions
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml
└── README.md
```

## Security Considerations

- **No Authentication**: This tool is designed for local/internal network use
- **Database Credentials**: Never commit `.env` files with real credentials
- **Network Security**: Use behind a firewall or VPN for production environments
- **SQL Execution**: Always review generated SQL before executing
- **SSL Connections**: Enable SSL for remote database connections

## Supported MySQL/MariaDB Features

### Fully Supported
- Table engines (InnoDB, MyISAM, etc.)
- Character sets and collations
- Column data types (all standard types)
- NULL/NOT NULL constraints
- DEFAULT values
- AUTO_INCREMENT
- Primary keys (single and composite)
- Unique keys
- Regular indexes (BTREE, HASH, FULLTEXT, SPATIAL)
- Foreign keys with referential actions
- Check constraints (MySQL 8.0.16+)
- Views
- Triggers

### Known Limitations
- Stored procedures and functions (not included)
- Events (not included)
- Partitioning (not analyzed)
- User privileges (not included)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

### Code Formatting
```bash
# Backend
cd backend
npm run format
npm run lint

# Frontend
cd frontend
npm run format
npm run lint
```

### Type Checking
```bash
# Backend
cd backend
npx tsc --noEmit

# Frontend
cd frontend
npx tsc --noEmit
```

## Troubleshooting

### Connection Issues
- Verify database host, port, and credentials
- Check firewall rules
- Ensure MySQL user has `SELECT` privileges on `INFORMATION_SCHEMA`

### CORS Errors
- Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
- Restart backend after changing `.env`

### Large Schema Timeout
- Increase `connectTimeout` in database.service.ts
- Consider breaking large migrations into smaller chunks

## License

MIT License - see LICENSE file for details

## Author

Levent Bali

## Acknowledgments

- Developed with the assistance of [Claude Code](https://claude.com/claude-code) by Anthropic
- Built with Fastify for high-performance API
- UI powered by React and Tailwind CSS
- MySQL schema inspection via mysql2 library

---

*Built with ❤️ and AI-assisted development*
