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

	ErrBadRequest = &Error{
		Detail: "400 Bad Request",
		Status: http.StatusBadRequest,
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

	ErrInvalidJSONPayload = &Error{
		Detail: "The payload is not a valid JSON string",
		Status: http.StatusInternalServerError,
	}

	ErrSaveToCloudFailed = &Error{
		Detail: "Failed to complete upload. Try again later",
		Status: http.StatusInternalServerError,
	}

	ErrPayloadTooLarge = &Error{
		Detail: "Request body is too large",
		Status: http.StatusBadRequest,
	}

	ErrJSONSyntaxError = &Error{
		Detail: "Request body contains badly-formed JSON (at position %d)",
		Status: http.StatusBadRequest,
	}

	ErrJSONUnknownField = &Error{
		Detail: "Request body contains unknown field '%s'",
		Status: http.StatusBadRequest,
	}

	ErrJSONPayloadInvalid = &Error{
		Detail: "The provided payload is not a valid JSON string",
		Status: http.StatusBadRequest,
	}

	ErrJSONEmpty = &Error{
		Detail: "The request body must not be empty",
		Status: http.StatusBadRequest,
	}

	ErrJSONTypeInvalid = &Error{
		Detail: "Request body contains an invalid value for the %q field (at position %d)",
		Status: http.StatusBadRequest,
	}
)
