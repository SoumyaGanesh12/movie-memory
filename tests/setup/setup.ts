import "dotenv/config";

// Point the app's database client at the test database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;