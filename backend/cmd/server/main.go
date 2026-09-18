// cmd/server/main.go
package main

import (
	"log"

	"cbt-engine-service/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
