package models

// DropboxUploadStatus represents the JSON payload received from Dropbox
// when uploading a file
type DropboxUploadStatus struct {
	Tag        string `json:".tag"`
	AsyncJobID string `json:"async_job_id"`
}
