package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type Key struct {
	Dropbox_key string
}

func sendDropboxKey(w http.ResponseWriter, r *http.Request) {
	DROPBOX_KEY := fmt.Sprintf("%v", os.Getenv("DROPBOX_KEY"))

	d := Key{
		Dropbox_key: DROPBOX_KEY,
	}

	sendJson(w, d)
}

func saveToDropbox(w http.ResponseWriter, r *http.Request) {
	values, err := getURLQueryParams(r.URL.String())

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	token := values.Get("token")
	id := values.Get("id")

	data, err := getPhotoDownloadLocation(id)

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	v := fmt.Sprintf("Bearer %v", token)

	requestBody, _ := json.Marshal(map[string]string{
		"path": fmt.Sprintf("/photo-%v.jpg", id),
		"url":  data.URL,
	})

	endpoint := "https://api.dropboxapi.com/2/files/save_url"

	request, _ := http.NewRequest("POST", endpoint, bytes.NewBuffer(requestBody))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	defer response.Body.Close()

	if response.StatusCode == 200 {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}
}
