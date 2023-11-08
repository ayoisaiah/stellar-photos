package app

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/ayoisaiah/stellar-photos/internal/models"
	"github.com/ayoisaiah/stellar-photos/internal/utils"
)

func checkDropboxUploadStatus(ctx context.Context, jobID, token string) error {
	v := fmt.Sprintf("Bearer %s", token)

	requestBody, err := json.Marshal(map[string]string{
		"async_job_id": jobID,
	})
	if err != nil {
		return err
	}

	endpoint := "https://api.dropboxapi.com/2/files/save_url/check_job_status"

	request, err := http.NewRequestWithContext(
		ctx,
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

	resp := &models.DropboxSaveURLResponse{}

	err = json.Unmarshal(b, resp)
	if err != nil {
		return err
	}

	if resp.Tag == "complete" {
		return nil
	} else if resp.Tag == "in_progress" {
		time.Sleep(1 * time.Second)
		return checkDropboxUploadStatus(ctx, jobID, token)
	}

	return fmt.Errorf("job failed. response from dropbox: %s", string(b))
}
