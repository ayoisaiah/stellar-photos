package models

// OnedriveAuth represents the request body after a successful authentication.
type OnedriveAuth struct {
	TokenType    string `json:"token_type"`
	Scope        string `json:"scope"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}
