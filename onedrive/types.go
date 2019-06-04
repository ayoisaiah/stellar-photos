package onedrive

// Onedrive Application ID
type onedriveID struct {
	ID string `json:"id"`
}

// onedriveAuth represents the request body after a successful authentication
type onedriveAuth struct {
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}
