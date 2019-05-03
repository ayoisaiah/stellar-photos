package main

import (
  "fmt"
  "net/http"
  "net/url"
  "os"
  "strings"
  "encoding/json"
)

type OnedriveId struct {
  Id string
}

func sendOnedriveId(w http.ResponseWriter, r *http.Request) {
  id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))

  d := OnedriveId{
    Id: id,
  }

  sendJson(w, d)
}

type OnedriveAuth struct {
  Token_type string `json:"token_type"`
  Expires_in string `json:"expires_in"`
  Scope string `json:"scope"`
  Access_token string `json:"access_token"`
  Refresh_token string `json:"refresh_token"`
}

func authorizeOnedrive(w http.ResponseWriter, r *http.Request) {
  values, err := getURLQueryParams(r.URL.String())

  if err != nil {
    w.WriteHeader(http.StatusBadRequest)
    return
  }

  code := values.Get("code")

  id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))
  secret := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_SECRET"))

  formValues := map[string]string{
    "grant_type": "authorization_code",
    "client_id": id,
    "client_secret": secret,
    "code": code,
    "redirect_uri": "https://ayoisaiah.github.io/stellar-photos",
  }

  onedriveToken(w, r, formValues)
}

func refreshOnedriveToken(w http.ResponseWriter, r *http.Request) {
  values, err := getURLQueryParams(r.URL.String())

  if err != nil {
    w.WriteHeader(http.StatusBadRequest)
    return
  }

  refresh_token := values.Get("refresh_token")

  id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))
  secret := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_SECRET"))

  formValues := map[string]string{
    "grant_type": "authorization_code",
    "client_id": id,
    "client_secret": secret,
    "refresh_token": refresh_token,
    "redirect_uri": "https://ayoisaiah.github.io/stellar-photos",
  }

  onedriveToken(w, r, formValues)
}

func onedriveToken(w http.ResponseWriter, r *http.Request, formValues map[string]string) {
  form := url.Values{}
  for key, value := range formValues {
    form.Add(key, value)
  }

  endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

  request, _ := http.NewRequest("POST", endpoint, strings.NewReader(form.Encode()))
  request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

  client := &http.Client{}
  response, err := client.Do(request)

  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    return
  }

  defer response.Body.Close()

  if response.StatusCode != 200 {
    w.WriteHeader(http.StatusBadRequest)
    return
  }

  auth := new(OnedriveAuth)
  json.NewDecoder(response.Body).Decode(auth)

  sendJson(w, auth)
}
