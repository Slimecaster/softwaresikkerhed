const express = require("express");
const { createUser, getUserById, getAllUsers } = require("./userdb");
const { hashPassword, verifyPassword, generateToken, verifyToken } = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Middleware to verify token
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Access token required" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(403).json({ error: "Invalid or expired token" });

    req.user = decoded;
    next();
}

// Register endpoint
app.post("/api/auth/register", async (req, res) => {
    try {
        const { person_id, first_name, last_name, email, password } = req.body;

        // Validate input
        if (!person_id || !first_name || !email || !password) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if user already exists
        if (getUserById(person_id)) {
            return res.status(409).json({ error: "User already exists" });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = createUser({
            person_id,
            first_name,
            last_name: last_name || "",
            email,
            password_hash: hashedPassword,
            enabled: true,
            created_at: new Date().toISOString()
        });

        // Generate token
        const token = generateToken(person_id);

        res.status(201).json({
            message: "User registered successfully",
            user: {
                person_id: user.person_id,
                first_name: user.first_name,
                email: user.email
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login endpoint
app.post("/api/auth/login", async (req, res) => {
    try {
        const { person_id, password } = req.body;

        // Validate input
        if (!person_id || !password) {
            return res.status(400).json({ error: "Missing person_id or password" });
        }

        // Find user
        const user = getUserById(person_id);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Check if user is enabled
        if (!user.enabled) {
            return res.status(403).json({ error: "User account is disabled" });
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Generate token
        const token = generateToken(person_id);

        res.json({
            message: "Login successful",
            user: {
                person_id: user.person_id,
                first_name: user.first_name,
                email: user.email
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected endpoint - Get current user
app.get("/api/auth/me", authenticateToken, (req, res) => {
    try {
        const user = getUserById(req.user.person_id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            person_id: user.person_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            enabled: user.enabled
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected endpoint - Get all users (admin-like functionality)
app.get("/api/users", authenticateToken, (req, res) => {
    try {
        const users = getAllUsers().map(u => ({
            person_id: u.person_id,
            first_name: u.first_name,
            last_name: u.last_name,
            email: u.email,
            enabled: u.enabled
        }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Authentication server running on http://localhost:${PORT}`);
});

module.exports = app;
