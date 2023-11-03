package middleware

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

type ErrorHandler func(w http.ResponseWriter, r *http.Request) error

func (fn ErrorHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	err := fn(w, r)
	if err == nil {
		return
	}

	utils.HandleError(r.Context(), w, err)
}
