# 🖥️ Backend Center

> REST API backend for the PokemonCenter application, built with NestJS and TypeScript.

---

## 📖 Description

**Backend Center** is the server-side counterpart to the [PokemonCenter](https://github.com/Zanelidd/PokemonCenter) frontend. It handles authentication, data persistence, and communication with the Pokémon TCG API.

---

## 🚀 Tech Stack

| Category | Technologies |
|---|---|
| Framework | NestJS + TypeScript |
| ORM | Prisma |
| Database | MySQL |
| Authentication | JWT + Argon2 |
| Pokémon API | pokemon-tcg-sdk-typescript |
| Emailing | Nodemailer |
| Validation | class-validator + class-transformer |
| Linting / Formatting | ESLint + Prettier |

---

## 📦 Prerequisites

- **Node.js** >= 18
- A running **MySQL** database
- A **Pokémon TCG** API key — get one at [pokemontcg.io](https://pokemontcg.io/)

---

## ⚙️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/Zanelidd/Backend-Center.git
cd Backend-Center

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.sample .env
# Then fill in the values in .env

# 4. Run Prisma migrations
npx prisma migrate dev
```

---

## 🔐 Environment Variables

Copy `.env.sample` to `.env` and fill in the following values:

```env
APP_PORT=5000
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
TCG_API_KEY=your_pokemon_tcg_api_key
```

| Variable | Description |
|---|---|
| `APP_PORT` | Port the server listens on (default: `5000`) |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port (default: `3306`) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | MySQL database name |
| `TCG_API_KEY` | Pokémon TCG API key |

---

## 🛠️ Available Scripts

```bash
# Start in development mode (watch)
npm run start:dev

# Start in debug mode
npm run start:debug

# Build for production
npm run build

# Start in production mode
npm run start:prod

# Format code
npm run format

# Run the linter
npm run lint
```

---

## 📁 Project Structure

```
Backend-Center/
├── .github/
│   └── workflows/        # CI/CD GitHub Actions
├── prisma/               # Prisma schema and migrations
├── src/                  # Application source code
├── test/                 # Test files
├── .env.sample           # Environment variables template
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database

This project uses **Prisma** as the ORM with a **MySQL** database.

```bash
# Run migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate
```

---

## 📡 Pokémon TCG API

The backend interacts with the [Pokémon TCG API](https://pokemontcg.io/) via the official [`pokemon-tcg-sdk-typescript`](https://github.com/PokemonTCG/pokemon-tcg-sdk-typescript) SDK. An API key must be set in the `TCG_API_KEY` environment variable.

---

## 👤 Author

**Damien Arnaud** — [@Zanelidd](https://github.com/Zanelidd)

---

## 📝 License

This project is personal and experimental. No open-source license has been defined yet.
