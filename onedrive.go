package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
)

func sendOnedriveId(w http.ResponseWriter, r *http.Request) {
	id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))

	d := OnedriveId{
		Id: id,
	}

	sendJson(w, d)
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
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"code":          code,
		"redirect_uri":  "https://ayoisaiah.github.io/stellar-photos",
	}

	onedriveToken(w, r, formValues)
}

func refreshOnedriveToken(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		fmt.Println(err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	refresh_token := values.Get("refresh_token")

	id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))
	secret := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_SECRET"))

	formValues := map[string]string{
		"grant_type":    "authorization_code",
		"client_id":     id,
		"client_secret": secret,
		"refresh_token": refresh_token,
		"redirect_uri":  "https://ayoisaiah.github.io/stellar-photos",
	}

	onedriveToken(w, r, formValues)
}

func onedriveToken(w http.ResponseWriter, r *http.Request, formValues map[string]string) {
	form := url.Values{}
	for key, value := range formValues {
		form.Add(key, value)
	}

	endpoint := "https://login.microsoftonline.com/common/oauth2/v2.0/token"

	request, err := http.NewRequest("POST", endpoint, strings.NewReader(form.Encode()))

	if err != nil {
		fmt.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		fmt.Println(err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	defer response.Body.Close()

	auth := &OnedriveAuth{}
	json.NewDecoder(response.Body).Decode(auth)

	if response.StatusCode != 200 {
		body, _ := ioutil.ReadAll(response.Body)
		w.WriteHeader(http.StatusBadRequest)
		w.Write(body)
		fmt.Println(body)
		return
	}

	sendJson(w, auth)
}
