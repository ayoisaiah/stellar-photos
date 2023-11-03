package apperror

import (
	"net/http"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

var ErrEmptyPhotoID = &utils.HTTPError{
	Detail: "the photo ID must not be empty",
	Status: http.StatusBadRequest,
}
