// Package migrations — embed SQL files untuk provisioning programatik.
//
// Hanya file *.up.sql di root package ini yang di-embed.
// File *.down.sql dan subfolder (platform/) TIDAK ter-embed.
//
// Untuk migration platform DB (cross-tenant), gunakan subpackage:
//
//	import platformmig "…/backend/migrations/platform"
//	platformmig.UpMigrations
package migrations

import "embed"

//go:embed *.up.sql
var UpMigrations embed.FS
