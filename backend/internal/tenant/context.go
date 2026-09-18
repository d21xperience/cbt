package tenant

import "context"

// contextKey — unexported type untuk prevent collision
type contextKey int

const (
	tenantIDKey contextKey = iota
	tenantDBPathKey
	tenantSubdomainKey
)

// TenantInfo — info tenant yang di-resolve dari request
type TenantInfo struct {
	TenantID  string
	Subdomain string
	DBPath    string
}

// WithTenantInfo — set tenant info ke context
func WithTenantInfo(ctx context.Context, info *TenantInfo) context.Context {
	ctx = context.WithValue(ctx, tenantIDKey, info.TenantID)
	ctx = context.WithValue(ctx, tenantDBPathKey, info.DBPath)
	ctx = context.WithValue(ctx, tenantSubdomainKey, info.Subdomain)
	return ctx
}

// FromContext — extract tenant info. Return zero value kalau tidak ada.
func FromContext(ctx context.Context) *TenantInfo {
	if ctx == nil {
		return nil
	}
	info := &TenantInfo{}
	if v, ok := ctx.Value(tenantIDKey).(string); ok {
		info.TenantID = v
	}
	if v, ok := ctx.Value(tenantDBPathKey).(string); ok {
		info.DBPath = v
	}
	if v, ok := ctx.Value(tenantSubdomainKey).(string); ok {
		info.Subdomain = v
	}
	if info.TenantID == "" {
		return nil
	}
	return info
}

// MustFromContext — panic kalau tidak ada tenant (untuk internal assertion)
func MustFromContext(ctx context.Context) *TenantInfo {
	info := FromContext(ctx)
	if info == nil {
		panic("tenant info missing from context")
	}
	return info
}
