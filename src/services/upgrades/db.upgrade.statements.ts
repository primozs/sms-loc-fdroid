export const DbUpgradeStatements = [
  {
    toVersion: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contactId TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        IMAGE TEXT,
        active INTEGER DEFAULT 1
        );`,
    ],
  },
  {
    toVersion: 2,
    statements: ['ALTER TABLE contacts RENAME COLUMN IMAGE to image;'],
  },
  {
    toVersion: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        ts INTEGER NOT NULL, 
        contactId TEXT NOT NULL,
        address TEXT NOT NULL,  
        active INTEGER DEFAULT 1      
        );`,

      `CREATE TABLE IF NOT EXISTS responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contactId TEXT NOT NULL,
        address TEXT NOT NULL,
        lon REAL NOT NULL,
        lat REAL NOT NULL, 
        ts INTEGER NOT NULL, 
        alt_m INTEGER,
        v_kmh INTEGER, 
        acc_m INTEGER, 
        bat_p INTEGER, 
        active INTEGER DEFAULT 1
      );`,

      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL, 
        message TEXT NOT NULL,          
        data TEXT,
        active INTEGER DEFAULT 1
      );`,
    ],
  },
  {
    toVersion: 4,
    statements: ['ALTER TABLE responses ADD COLUMN message TEXT;'],
  },
  {
    toVersion: 5,
    // dummy
    statements: ['SELECT * FROM responses LIMIT 1;'],
  },
  {
    toVersion: 6,
    statements: [
      `ALTER TABLE responses ADD COLUMN type TEXT NOT NULL DEFAULT "received";`,
    ],
  },
];
