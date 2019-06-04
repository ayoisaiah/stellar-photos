package utils

import (
	"net/http"
)

// InternalServerError sends http.InternalServerError to client
func InternalServerError(w http.ResponseWriter) {
	w.WriteHeader(http.StatusInternalServerError)
	w.Write([]byte("Internal server error"))
}
