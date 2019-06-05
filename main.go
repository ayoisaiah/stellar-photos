package main

import (
	"log"
	"net/http"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/routes"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

// init is invoked before main()
func init() {
	// loads values from .env into the system
	if err := godotenv.Load(); err != nil {
		log.Println("File .env not found, reading configuration from ENV")
	}
}

func main() {
	// This will crash the program if one of the required Env values is not set
	conf := config.New()

	port := ":" + conf.Port

	mux := routes.NewRouter()

	handler := cors.Default().Handler(mux)

	log.Fatal(http.ListenAndServe(port, handler))
}
