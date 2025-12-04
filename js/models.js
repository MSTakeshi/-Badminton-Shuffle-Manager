/**
 * Data Models
 */

class Club {
    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.createdAt = new Date().toISOString();
        this.lastPlayedAt = null;
        this.players = [];
        this.sessions = [];
        this.settings = {
            defaultCourts: 2
        };
    }
}

class Player {
    constructor(name, level = 5) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.level = level; // 1-10
        this.active = true; // For soft delete or temporary inactive
        this.isSelected = false; // For session participation
        this.stats = {
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0
        };
    }
}
