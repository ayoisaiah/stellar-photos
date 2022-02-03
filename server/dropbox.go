package stellar

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

// Dropbox application key.
type dropbox struct {
	Key string `json:"dropbox_key"`
}

type SaveURLResponse struct {
	Tag        string `json:".tag"`
	AsyncJobID string `json:"async_job_id"`
}

// SendDropboxKey sends the application key to the client on request to avoid
// exposing it in the extension code.
func (a *App) SendDropboxKey(w http.ResponseWriter, r *http.Request) error {
	dropboxKey := a.Config.Dropbox.Key

	d := dropbox{
		Key: dropboxKey,
	}

	bs, err := json.Marshal(d)
	if err != nil {
		return err
	}

	return utils.JSONResponse(w, bs)
}

func checkJobStatus(jobID, token string) error {
	v := fmt.Sprintf("Bearer %s", token)
	requestBody, err := json.Marshal(map[string]string{
		"async_job_id": jobID,
	})

	if err != nil {
		return err
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url/check_job_status"

	request, err := http.NewRequest(
		"POST",
		endpoint,
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	response, err := utils.Client.Do(request)
	if err != nil {
		return err
	}

	defer response.Body.Close()

	b, err := utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	resp := &SaveURLResponse{}

	err = json.Unmarshal(b, resp)
	if err != nil {
		return err
	}

	if resp.Tag == "complete" {
		return nil
	} else if resp.Tag == "in_progress" {
		time.Sleep(1 * time.Second)
		return checkJobStatus(jobID, token)
	}

	return fmt.Errorf("job failed. response from dropbox: %s", string(b))
}

// SaveToDropbox saves the requested photo to the current user's Dropbox account.
func (a *App) SaveToDropbox(w http.ResponseWriter, r *http.Request) error {
	values, err := utils.GetURLQueryParams(r.URL.String())
	if err != nil {
		return err
	}

	token := values.Get("token")
	id := values.Get("id")
	url := values.Get("url")

	_, err = a.TrackPhotoDownload(id)
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

	request, err := http.NewRequest(
		"POST",
		endpoint,
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return err
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", v)

	response, err := utils.Client.Do(request)
	if err != nil {
		return err
	}

	defer response.Body.Close()

	b, err := utils.CheckForErrors(response)
	if err != nil {
		return err
	}

	resp := &SaveURLResponse{}

	err = json.Unmarshal(b, resp)
	if err != nil {
		return err
	}

	if resp.Tag == "async_job_id" {
		err = checkJobStatus(resp.AsyncJobID, token)
		if err != nil {
			return err
		}

		w.WriteHeader(http.StatusOK)

		return nil
	} else if resp.Tag == "complete" {
		w.WriteHeader(http.StatusOK)
		return nil
	}

	return fmt.Errorf("save URL error. response from dropbox: %s", string(b))
}
