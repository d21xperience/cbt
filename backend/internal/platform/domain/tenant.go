package domain

import "time"

// Tenant — representasi satu sekolah di platform
type Tenant struct {
	TenantID      string    `json:"tenant_id"`
	NPSN          string    `json:"npsn"`
	Subdomain     string    `json:"subdomain"`
	SchoolName    string    `json:"school_name"`
	ContactEmail  string    `json:"contact_email,omitempty"`
	ContactPhone  string    `json:"contact_phone,omitempty"`
	Address       string    `json:"address,omitempty"`
	IsActive      bool      `json:"is_active"`
	IsSuspended   bool      `json:"is_suspended"`
	SuspendReason string    `json:"suspended_reason,omitempty"`
	DBPath        string    `json:"db_path"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PlatformUser — super admin / staff pusat
type PlatformUser struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Role         string    `json:"role"`
	FullName     string    `json:"full_name,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

// Subscription — billing per tenant
type Subscription struct {
	ID         int64     `json:"id"`
	TenantID   string    `json:"tenant_id"`
	Plan       string    `json:"plan"`
	ValidFrom  time.Time `json:"valid_from"`
	ValidUntil time.Time `json:"valid_until"`
	IsActive   bool      `json:"is_active"`
	PriceIDR   int64     `json:"price_idr"`
	Notes      string    `json:"notes,omitempty"`
}

// Audit entry
type AuditEntry struct {
	ID         int64     `json:"id"`
	ActorID    string    `json:"actor_id"`
	Action     string    `json:"action"`
	TargetType string    `json:"target_type,omitempty"`
	TargetID   string    `json:"target_id,omitempty"`
	Details    string    `json:"details,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// DTO untuk resolver
type TenantResolution struct {
	TenantID    string
	Subdomain   string
	DBPath      string
	IsActive    bool
	IsSuspended bool
}
