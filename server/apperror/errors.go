package apperror

import (
	"net/http"
)

var (
	ErrEmptyPhotoID = &Error{
		Detail: "The photo ID must not be empty",
		Status: http.StatusBadRequest,
	}

	ErrEmptySearchKey = &Error{
		Detail: "Search query must not be empty",
		Status: http.StatusBadRequest,
	}

	ErrInvalidSearchPage = &Error{
		Detail: "Search page must be a positive integer",
		Status: http.StatusBadRequest,
	}

	ErrValidateNothing = &Error{
		Detail: "Nothing to validate",
		Status: http.StatusBadRequest,
	}

	ErrInvalidFilter = &Error{
		Detail: "The provided %s does not exist: %s",
		Status: http.StatusBadRequest,
	}

	ErrNotFound = &Error{
		Detail: "404 Not Found",
		Status: http.StatusNotFound,
	}

	ErrImageIDRequired = &Error{
		Detail: "Unsplash image ID is required",
		Status: http.StatusBadRequest,
	}

	ErrAuthCodeRequired = &Error{
		Detail: "Authentication code is required",
		Status: http.StatusBadRequest,
	}

	ErrImageURLRequired = &Error{
		Detail: "Unsplash image URL is required",
		Status: http.StatusBadRequest,
	}

	ErrTokenRequired = &Error{
		Detail: "Save token is required",
		Status: http.StatusBadRequest,
	}

	ErrRefreshTokenRequired = &Error{
		Detail: "Refresh token is required",
		Status: http.StatusBadRequest,
	}
)
