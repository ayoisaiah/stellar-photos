package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/ayoisaiah/stellar-photos-server/routes"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	port := fmt.Sprintf(":%v", os.Getenv("PORT"))

	mux := routes.NewRouter()

	log.Fatal(http.ListenAndServe(port, mux))
}
