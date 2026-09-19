// Package migrations — embed SQL files untuk provisioning programatik.
package migrations

import "embed"

//go:embed *.up.sql
var UpMigrations embed.FS
