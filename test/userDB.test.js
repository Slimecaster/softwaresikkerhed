const fs = require("fs");
const path = require("path");
const {
    createUser,
    getUserById,
    getAllUsers,
    updateUser,
    disableUser
} = require("../src/userdb");

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
    // Restore originalen efter test-run
    fs.writeFileSync(dbPath, originalDbContent);
});


beforeEach(() => {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2));
});

//
test("GIVEN empty database WHEN creating user THEN user can be read back by id (C + R)", () => {
    //Given
    const created = createUser({ person_id: 10, first_name: "Eva", enabled: true });
    //When
    const fetched = getUserById(10);
    //Then
    expect(fetched).toEqual(created);
});

test("GIVEN multiple users WHEN reading all users THEN returns correct count (R)", () => {
    //Given
    createUser({ person_id: 11, first_name: "A", enabled: true });
    createUser({ person_id: 12, first_name: "B", enabled: true });
    //When
    const users = getAllUsers();
    //Then
    expect(users.length).toBe(2);
});

test("GIVEN existing user WHEN updating last_name THEN change is persisted (U)", () => {
    //Given
    createUser({ person_id: 13, first_name: "Niels", last_name: "Old", enabled: true });
    //When
    updateUser(13, { last_name: "New" });
    const user = getUserById(13);
    //Then
    expect(user.last_name).toBe("New");
});

test("GIVEN missing user WHEN updating THEN returns null (U negative)", () => {
    //Given + When
    const result = updateUser(999, { last_name: "Nope" });
    //Then
    expect(result).toBeNull();
});

test("GIVEN existing user WHEN disabling user THEN user is soft-deleted (D = disable)", () => {
    //Given
    createUser({ person_id: 14, enabled: true });
    //When
    disableUser(14);
    const user = getUserById(14);
    //Then
    expect(user.enabled).toBe(false);
});

