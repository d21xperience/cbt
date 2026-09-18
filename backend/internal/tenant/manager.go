package tenant

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"path/filepath"
	"sync"
	"time"
)

var (
	ErrTenantDBOpenFailed = errors.New("tenant_db_open_failed")
	ErrTenantDBNotFound   = errors.New("tenant_db_file_not_found")
)

// Manager — central manager untuk tenant SQLite databases.
// - Lazy open: buka saat pertama diakses
// - LRU cache: batasi max handle terbuka
// - Idle eviction: tutup handle yang idle > idleTTL
type Manager struct {
	mu      sync.RWMutex
	entries map[string]*entry
	maxOpen int
	idleTTL time.Duration
	stopCh  chan struct{}
	wg      sync.WaitGroup
}

type entry struct {
	db       *sql.DB
	lastUsed time.Time
	path     string
}

func NewManager(maxOpen int, idleTTL time.Duration) *Manager {
	if maxOpen <= 0 {
		maxOpen = 20
	}
	if idleTTL <= 0 {
		idleTTL = 30 * time.Minute
	}

	m := &Manager{
		entries: make(map[string]*entry),
		maxOpen: maxOpen,
		idleTTL: idleTTL,
		stopCh:  make(chan struct{}),
	}

	// Background reaper — evict idle handles
	m.wg.Add(1)
	go m.reaper()

	log.Printf("[TENANT_MGR] Initialized (maxOpen=%d, idleTTL=%v)", maxOpen, idleTTL)
	return m
}

// Get — buka atau ambil handle tenant DB
func (m *Manager) Get(ctx context.Context, tenantID, dbPath string) (*sql.DB, error) {
	// Fast path: existing
	m.mu.RLock()
	if e, ok := m.entries[tenantID]; ok {
		e.lastUsed = time.Now()
		db := e.db
		m.mu.RUnlock()
		return db, nil
	}
	m.mu.RUnlock()

	// Slow path: open + maybe evict
	m.mu.Lock()
	defer m.mu.Unlock()

	// Double-check (another goroutine might have opened)
	if e, ok := m.entries[tenantID]; ok {
		e.lastUsed = time.Now()
		return e.db, nil
	}

	// Evict if over capacity
	if len(m.entries) >= m.maxOpen {
		m.evictLRU()
	}

	// Open new
	db, err := openTenantDB(dbPath)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrTenantDBOpenFailed, err)
	}

	m.entries[tenantID] = &entry{
		db:       db,
		lastUsed: time.Now(),
		path:     dbPath,
	}
	log.Printf("[TENANT_MGR] Opened tenant %s (total=%d)", tenantID, len(m.entries))
	return db, nil
}

// evictLRU — tutup entry paling lama tidak dipakai. Dipanggil dengan m.mu.Lock().
func (m *Manager) evictLRU() {
	var oldestID string
	var oldestTime time.Time
	for id, e := range m.entries {
		if oldestID == "" || e.lastUsed.Before(oldestTime) {
			oldestID = id
			oldestTime = e.lastUsed
		}
	}
	if oldestID == "" {
		return
	}
	if err := m.entries[oldestID].db.Close(); err != nil {
		log.Printf("[TENANT_MGR] Close %s error: %v", oldestID, err)
	}
	delete(m.entries, oldestID)
	log.Printf("[TENANT_MGR] Evicted tenant %s (idle=%v)", oldestID, time.Since(oldestTime))
}

// reaper — periodically evict idle handles
func (m *Manager) reaper() {
	defer m.wg.Done()
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
			m.evictIdle()
		}
	}
}

func (m *Manager) evictIdle() {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	for id, e := range m.entries {
		if now.Sub(e.lastUsed) > m.idleTTL {
			if err := e.db.Close(); err != nil {
				log.Printf("[TENANT_MGR] Reaper close %s: %v", id, err)
			}
			delete(m.entries, id)
			log.Printf("[TENANT_MGR] Reaper evicted %s", id)
		}
	}
}

// Stats — untuk monitoring
func (m *Manager) Stats() map[string]any {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ids := make([]string, 0, len(m.entries))
	for id := range m.entries {
		ids = append(ids, id)
	}
	return map[string]any{
		"open_count": len(m.entries),
		"max_open":   m.maxOpen,
		"idle_ttl":   m.idleTTL.String(),
		"tenants":    ids,
	}
}

// CloseAll — shutdown hook
func (m *Manager) CloseAll() {
	close(m.stopCh)
	m.wg.Wait()

	m.mu.Lock()
	defer m.mu.Unlock()
	for id, e := range m.entries {
		_ = e.db.Close()
		log.Printf("[TENANT_MGR] Closed %s", id)
	}
	m.entries = make(map[string]*entry)
}

// ============ openTenantDB ============

func openTenantDB(dbPath string) (*sql.DB, error) {
	// Validate path — prevent directory traversal
	abs, err := filepath.Abs(dbPath)
	if err != nil {
		return nil, err
	}
	_ = abs // sanity

	db, err := sql.Open("sqlite3", dbPath+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, err
	}

	// Per-tenant PRAGMA — smaller than single-tenant config
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA cache_size=-16000;", // 16 MB (dari 64 MB)
		"PRAGMA temp_store=MEMORY;",
		"PRAGMA mmap_size=67108864;", // 64 MB (dari 256 MB)
		"PRAGMA foreign_keys=ON;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			log.Printf("[TENANT_MGR] PRAGMA warn %s: %v", p, err)
		}
	}

	// Single connection per tenant (SQLite best practice)
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	return db, nil
}
