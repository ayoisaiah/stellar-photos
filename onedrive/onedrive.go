package onedrive

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/ayoisaiah/stellar-photos-server/utils"
)

func SendOnedriveId(w http.ResponseWriter, r *http.Request) {
	id := fmt.Sprintf("%v", os.Getenv("ONEDRIVE_APPID"))

	d := OnedriveId{
		Id: id,
	}

	utils.SendJson(w, d)
}

func AuthorizeOnedrive(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		utils.InternalServerError(w)
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

func RefreshOnedriveToken(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		utils.InternalServerError(w)
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
		utils.InternalServerError(w)
		return
	}

	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		utils.InternalServerError(w)
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

	utils.SendJson(w, auth)
}
