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

// SendDropboxKey sends the application key to the client on request to avoid
// exposing it in the extension code
func SendDropboxKey(w http.ResponseWriter, r *http.Request) {
	dropboxKey := os.Getenv("DROPBOX_KEY")

	d := key{
		DropboxKey: dropboxKey,
	}

	utils.SendJSON(w, d)
}

// SaveToDropbox saves the requested photo to the current user's Dropbox account
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
