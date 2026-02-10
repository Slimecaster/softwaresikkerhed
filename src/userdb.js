const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../db/users.json");

function readDb() {
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function writeDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function createUser(user) {
    const db = readDb();
    db.users.push(user);
    writeDb(db);
    return user;
}

function getUserById(person_id) {
    const db = readDb();
    return db.users.find(u => u.person_id === person_id);
}

function getAllUsers() {
    return readDb().users;
}

function updateUser(person_id, updates) {
    const db = readDb();
    const user = db.users.find(u => u.person_id === person_id);
    if (!user) return null;

    Object.assign(user, updates);
    writeDb(db);
    return user;
}

function disableUser(person_id) {
    return updateUser(person_id, { enabled: false });
}

module.exports = {
    createUser,
    getUserById,
    getAllUsers,
    updateUser,
    disableUser
};
