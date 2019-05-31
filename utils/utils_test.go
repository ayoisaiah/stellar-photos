package utils

import (
	"testing"
)

var imageUrls = []struct {
	url    string
	result bool
}{
	{"https://freshman.tech/assets/dist/images/vim-javascript/featured-400.jpg", true},
	{"https://freshman.tech/assets/dist/images/articles/freshman-1600.png", false},
}

func TestImageUrlToBase64(t *testing.T) {
	for _, value := range imageUrls {
		str, err := ImageUrlToBase64(value.url)
		if value.result == true {
			if str == "" {
				t.Errorf("Expected result, got empty string")
				return
			}
		}

		if value.result == false {
			if err == nil {
				t.Errorf("Expected error, but got no error")
			}
		}
	}
}
