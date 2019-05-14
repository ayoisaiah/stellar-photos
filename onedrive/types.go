package onedrive

type OnedriveId struct {
	Id string `json:"id"`
}

type OnedriveAuth struct {
	Token_type    string `json:"token_type"`
	Expires_in    string `json:"expires_in"`
	Scope         string `json:"scope"`
	Access_token  string `json:"access_token"`
	Refresh_token string `json:"refresh_token"`
}

