package main

import (
  "net/http"
  "github.com/joho/godotenv"
  "log"
  "os"
  "fmt"
)

func main() {
  err := godotenv.Load()

  if err != nil {
    log.Fatal("Error loading .env file")
  }

  port := fmt.Sprintf(":%v", os.Getenv("PORT"))

  mux := newRouter()

  log.Fatal(http.ListenAndServe(port, mux))
}
