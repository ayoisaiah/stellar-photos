package utils

// AuthorizationError occurs for an Unauthorized request
type AuthorizationError struct {
	ErrString string
}

func (e AuthorizationError) Error() string {
	return e.ErrString
}

// NotFoundError occurs when the resource queried returns a 404.
type NotFoundError struct {
	ErrString string
}

func (e NotFoundError) Error() string {
	return e.ErrString
}
