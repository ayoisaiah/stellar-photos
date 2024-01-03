package models

// Google Drive application key.
type GoogleDriveKey struct {
	Key string `json:"googledrive_key"`
}

// Google Drive Auth response.
type GoogleDriveAuth struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
}
