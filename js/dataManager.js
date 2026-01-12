/**
 * dataManager.js
 * Handles User Data (Login, Signup, Ranking) using LocalStorage.
 * Simulates a backend database.
 */

const STORAGE_KEY = "fruitCatcherUsers";

class DataManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = null;
    }

    // Load users from LocalStorage
    loadUsers() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    // Save users to LocalStorage
    saveUsers() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.users));
    }

    // Register a new user
    signup(username, password) {
        if (this.users.find(u => u.username === username)) {
            return { success: false, message: "Username already exists." };
        }

        const newUser = {
            username: username,
            password: password,
            bestScore: 0,
            joinDate: new Date().toLocaleDateString()
        };

        this.users.push(newUser);
        this.saveUsers();
        return { success: true, message: "Signup successful! Please login." };
    }

    // Login user
    login(username, password) {
        const user = this.users.find(u => u.username === username && u.password === password);
        if (user) {
            this.currentUser = user;
            // Persist session slightly by remembering last user? (Optional)
            // For now, simple object reference.
            return { success: true, user: user };
        }
        return { success: false, message: "Invalid username or password." };
    }

    // Logout
    logout() {
        this.currentUser = null;
    }

    // Update Score
    updateScore(score) {
        if (!this.currentUser) return false;

        if (score > this.currentUser.bestScore) {
            this.currentUser.bestScore = score;
            this.saveUsers(); // Save updated score
            return true; // New High Score!
        }
        return false;
    }

    // Get Rankings (Top 5)
    getRankings() {
        // Sort copy of users array
        const sorted = [...this.users].sort((a, b) => b.bestScore - a.bestScore);
        return sorted.slice(0, 5).map(u => ({
            username: u.username,
            score: u.bestScore
        }));
    }
}

// Export singleton
window.dataManager = new DataManager();
