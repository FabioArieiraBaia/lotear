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
            
            -- Tabela de usuários (gestores e equipe)
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'vendedor',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Tabela de mídia dos lotes (fotos e vídeos YouTube)
            CREATE TABLE IF NOT EXISTS lote_midia (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loteId INTEGER NOT NULL,
                type TEXT NOT NULL, -- 'image', 'youtube'
                url TEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(loteId) REFERENCES lotes(id) ON DELETE CASCADE
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
            ['lotes', 'corretorId', 'INTEGER REFERENCES corretores(id)'],
            ['lotes', 'saleDate', 'DATE'],
            ['lotes', 'totalPaid', 'REAL DEFAULT 0'],
            ['lotes', 'commissionRate', 'REAL'],
            ['comissoes', 'paidAmount', 'REAL DEFAULT 0'],
        ];
        
        foreach ($columns as [$table, $column, $definition]) {
            try {
                $db->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
            } catch (PDOException $e) {
                // Column already exists, ignore
            }
        }
        
        // Create new tables for financial control
        $db->exec("
            CREATE TABLE IF NOT EXISTS corretores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                cpf TEXT,
                creci TEXT,
                commissionRate REAL DEFAULT 0.05,
                active INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS parcelas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loteId INTEGER NOT NULL,
                installmentNumber INTEGER NOT NULL,
                totalInstallments INTEGER NOT NULL,
                amount REAL NOT NULL,
                dueDate DATE,
                status TEXT DEFAULT 'pendente',
                paidAt DATETIME,
                paidAmount REAL DEFAULT 0,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(loteId) REFERENCES lotes(id)
            );
            
            CREATE TABLE IF NOT EXISTS pagamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                loteId INTEGER,
                parcelaId INTEGER,
                corretorId INTEGER,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                paymentMethod TEXT,
                reference TEXT,
                paidAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(loteId) REFERENCES lotes(id),
                FOREIGN KEY(parcelaId) REFERENCES parcelas(id),
                FOREIGN KEY(corretorId) REFERENCES corretores(id)
            );
            
            CREATE TABLE IF NOT EXISTS comissoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                corretorId INTEGER NOT NULL,
                loteId INTEGER NOT NULL,
                saleAmount REAL NOT NULL,
                commissionRate REAL NOT NULL,
                commissionAmount REAL NOT NULL,
                status TEXT DEFAULT 'pendente',
                paidAt DATETIME,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(corretorId) REFERENCES corretores(id),
                FOREIGN KEY(loteId) REFERENCES lotes(id)
            );
            
            CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                permissions TEXT NOT NULL,
                token TEXT,
                active INTEGER DEFAULT 1,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS configuracoes (
                chave TEXT PRIMARY KEY,
                valor TEXT,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
        
        // Create indexes for performance
        $db->exec("
            CREATE INDEX IF NOT EXISTS idx_lotes_loteamentoId ON lotes(loteamentoId);
            CREATE INDEX IF NOT EXISTS idx_lotes_corretorId ON lotes(corretorId);
            CREATE INDEX IF NOT EXISTS idx_lotes_status ON lotes(status);
            CREATE INDEX IF NOT EXISTS idx_parcelas_loteId ON parcelas(loteId);
            CREATE INDEX IF NOT EXISTS idx_parcelas_status ON parcelas(status);
            CREATE INDEX IF NOT EXISTS idx_parcelas_dueDate ON parcelas(dueDate);
            CREATE INDEX IF NOT EXISTS idx_pagamentos_loteId ON pagamentos(loteId);
            CREATE INDEX IF NOT EXISTS idx_pagamentos_parcelaId ON pagamentos(parcelaId);
            CREATE INDEX IF NOT EXISTS idx_comissoes_corretorId ON comissoes(corretorId);
            CREATE INDEX IF NOT EXISTS idx_comissoes_loteId ON comissoes(loteId);
            CREATE INDEX IF NOT EXISTS idx_leads_loteamentoId ON leads(loteamentoId);
            CREATE INDEX IF NOT EXISTS idx_admin_users_token ON admin_users(token);
        ");
    }
    
    return $db;
}
