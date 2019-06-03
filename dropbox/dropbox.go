package dropbox

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

func SendDropboxKey(w http.ResponseWriter, r *http.Request) {
	DROPBOX_KEY := fmt.Sprintf("%s", os.Getenv("DROPBOX_KEY"))

	d := Key{
		Dropbox_key: DROPBOX_KEY,
	}

	utils.SendJson(w, d)
}

func SaveToDropbox(w http.ResponseWriter, r *http.Request) {
	values, err := utils.GetURLQueryParams(r.URL.String())

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	token := values.Get("token")
	id := values.Get("id")

	data, err := unsplash.GetPhotoDownloadLocation(id)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	v := fmt.Sprintf("Bearer %s", token)

	requestBody, err := json.Marshal(map[string]string{
		"path": fmt.Sprintf("/photo-%s.jpg", id),
		"url":  data.URL,
	})

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url"

	request, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(requestBody))

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	client := &http.Client{}
	response, err := client.Do(request)

	if err != nil {
		utils.InternalServerError(w)
		return
	}

	defer response.Body.Close()

	if response.StatusCode == 200 {
		w.WriteHeader(http.StatusOK)
	} else {
		w.WriteHeader(http.StatusBadRequest)
	}
}
