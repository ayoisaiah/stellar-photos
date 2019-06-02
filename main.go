package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/ayoisaiah/stellar-photos-server/routes"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

func main() {
	err := godotenv.Load()

	if err != nil {
		log.Println("File .env not found, reading configuration from ENV")
	}

	port := fmt.Sprintf(":%v", os.Getenv("PORT"))

	mux := routes.NewRouter()

	handler := cors.Default().Handler(mux)

	log.Fatal(http.ListenAndServe(port, handler))
}
