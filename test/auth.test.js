const request = require("supertest");
const fs = require("fs");
const path = require("path");
const app = require("../src/server");
const { verifyToken } = require("../src/auth");

const dbPath = path.join(__dirname, "../db/users.json");

let originalDbContent;

beforeAll(() => {
    if (fs.existsSync(dbPath)) {
        originalDbContent = fs.readFileSync(dbPath, "utf-8");
    } else {
        originalDbContent = JSON.stringify({ users: [] }, null, 2);
    }
});

afterAll(() => {
    fs.writeFileSync(dbPath, originalDbContent);
});

beforeEach(() => {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2));
});

describe("Authentication Tests", () => {
    test("GIVEN no existing user WHEN registering with valid data THEN user is created and token is returned", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 100,
                first_name: "John",
                last_name: "Doe",
                email: "john@example.com",
                password: "SecurePassword123"
            });

        expect(response.status).toBe(201);
        expect(response.body.user.email).toBe("john@example.com");
        expect(response.body.token).toBeDefined();
        expect(verifyToken(response.body.token)).not.toBeNull();
    });

    test("GIVEN existing user WHEN registering with same person_id THEN returns conflict error", async () => {
        // First registration
        await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 101,
                first_name: "Jane",
                email: "jane@example.com",
                password: "Password123"
            });

        // Second registration with same ID
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 101,
                first_name: "Another",
                email: "another@example.com",
                password: "Password456"
            });

        expect(response.status).toBe(409);
        expect(response.body.error).toBe("User already exists");
    });

    test("GIVEN registration WHEN missing required fields THEN returns validation error", async () => {
        const response = await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 102,
                first_name: "Test"
                // Missing email and password
            });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("Missing required fields");
    });

    test("GIVEN registered user WHEN logging in with correct password THEN returns token", async () => {
        // Register
        await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 103,
                first_name: "Auth",
                email: "auth@example.com",
                password: "CorrectPassword123"
            });

        // Login
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                person_id: 103,
                password: "CorrectPassword123"
            });

        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
        expect(verifyToken(response.body.token)).not.toBeNull();
    });

    test("GIVEN registered user WHEN logging in with wrong password THEN returns unauthorized error", async () => {
        // Register
        await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 104,
                first_name: "Test",
                email: "test@example.com",
                password: "CorrectPassword123"
            });

        // Login with wrong password
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                person_id: 104,
                password: "WrongPassword"
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("Invalid credentials");
    });

    test("GIVEN non-existent user WHEN logging in THEN returns unauthorized error", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                person_id: 999,
                password: "SomePassword"
            });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe("Invalid credentials");
    });

    test("GIVEN valid token WHEN accessing protected route THEN returns user data", async () => {
        // Register and get token
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 105,
                first_name: "Protected",
                email: "protected@example.com",
                password: "Password123"
            });

        const token = registerResponse.body.token;

        // Access protected route
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.person_id).toBe(105);
        expect(response.body.email).toBe("protected@example.com");
    });

    test("GIVEN no token WHEN accessing protected route THEN returns 401 unauthorized", async () => {
        const response = await request(app)
            .get("/api/auth/me");

        expect(response.status).toBe(401);
    });

    test("GIVEN invalid token WHEN accessing protected route THEN returns 403 forbidden", async () => {
        const response = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer invalid.token.here");

        expect(response.status).toBe(403);
    });

    test("GIVEN disabled user WHEN attempting login THEN returns forbidden error", async () => {
        // Register
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                person_id: 106,
                first_name: "Disabled",
                email: "disabled@example.com",
                password: "Password123"
            });

        const token = registerResponse.body.token;

        // Disable user via protected endpoint (or direct DB manipulation in real scenario)
        // For now, we'll test by modifying the database directly
        const { updateUser } = require("../src/userdb");
        updateUser(106, { enabled: false });

        // Try to login
        const response = await request(app)
            .post("/api/auth/login")
            .send({
                person_id: 106,
                password: "Password123"
            });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe("User account is disabled");
    });
});
