package dropbox

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/ayoisaiah/stellar-photos-server/config"
	"github.com/ayoisaiah/stellar-photos-server/unsplash"
	"github.com/ayoisaiah/stellar-photos-server/utils"
)

// Dropbox application key
type key struct {
	DropboxKey string `json:"dropbox_key"`
}

// SendDropboxKey sends the application key to the client on request to avoid
// exposing it in the extension code
func SendDropboxKey(w http.ResponseWriter, r *http.Request) error {
	dropboxKey := config.Conf.Dropbox.Key

	d := key{
		DropboxKey: dropboxKey,
	}

	bytes, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JsonResponse(w, bytes)
}

// SaveToDropbox saves the requested photo to the current user's Dropbox account
func SaveToDropbox(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	token := values.Get("token")
	id := values.Get("id")
	url := values.Get("url")

	err = unsplash.TrackPhotoDownload(id)
	if err != nil {
		return err
	}

	v := fmt.Sprintf("Bearer %s", token)

	requestBody, err := json.Marshal(map[string]string{
		"path": fmt.Sprintf("/photo-%s.jpg", id),
		"url":  url,
	})
	if err != nil {
		return err
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url"

	request, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(requestBody))
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		if os.IsTimeout(err) {
			return utils.NewHTTPError(err, http.StatusRequestTimeout, "Request to external API timed out")
		}

		return err
	}

	defer response.Body.Close()

	_, err = utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	w.WriteHeader(http.StatusOK)
	return nil
}
