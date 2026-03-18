<?php
/**
 * Database connection and schema setup for LoteamentosPro
 * Uses PDO with SQLite
 */

function getDatabase() {
    static $db = null;
    if ($db === null) {
        $dbPath = __DIR__ . '/../data/database.sqlite';
        $dataDir = dirname($dbPath);
        
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }
        
        $db = new PDO('sqlite:' . $dbPath);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $db->exec('PRAGMA journal_mode=WAL');
        $db->exec('PRAGMA foreign_keys=ON');
        
        // Create tables if they don't exist
        $db->exec("
            CREATE TABLE IF NOT EXISTS loteamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                imageUrl TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS lotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loteamentoId INTEGER,
                name TEXT,
                polygon TEXT,
                area TEXT,
                status TEXT,
                owner TEXT,
                photoUrl TEXT,
                notes TEXT,
                FOREIGN KEY(loteamentoId) REFERENCES loteamentos(id)
            );
            
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loteamentoId INTEGER,
                loteId INTEGER,
                name TEXT,
                email TEXT,
                phone TEXT,
                status TEXT DEFAULT 'Novo',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(loteamentoId) REFERENCES loteamentos(id),
                FOREIGN KEY(loteId) REFERENCES lotes(id)
            );
        ");
        
        // Add columns if they don't exist (migration)
        $columns = [
            ['lotes', 'price', 'REAL DEFAULT 0'],
            ['lotes', 'buyerName', 'TEXT'],
            ['lotes', 'buyerCpf', 'TEXT'],
            ['lotes', 'brokerName', 'TEXT'],
            ['lotes', 'paymentStatus', 'TEXT DEFAULT "pendente"'],
            ['lotes', 'downPayment', 'REAL DEFAULT 0'],
            ['lotes', 'installments', 'INTEGER DEFAULT 1'],
        ];
        
        foreach ($columns as [$table, $column, $definition]) {
            try {
                $db->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
            } catch (PDOException $e) {
                // Column already exists, ignore
            }
        }
    }
    
    return $db;
}
