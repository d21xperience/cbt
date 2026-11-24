// Package platformmigrations — embed migration untuk platform DB (cross-tenant).
// Dijalankan ke platform.db, BUKAN ke tenant cbt.db.
package platformmigrations

import "embed"

//go:embed *.up.sql
var UpMigrations embed.FS
