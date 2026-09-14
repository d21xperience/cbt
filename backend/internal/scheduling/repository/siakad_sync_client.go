package repository

import (
	"bytes"
	archiveDomain "cbt-engine-service/internal/archive/domain"
	"cbt-engine-service/internal/scheduling/domain"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type SiakadSyncClient struct {
	BaseURL    string
	HTTPClient *http.Client
}

func NewSiakadSyncClient(baseURL string) *SiakadSyncClient {
	return &SiakadSyncClient{
		BaseURL:    baseURL,
		HTTPClient: &http.Client{Timeout: 60 * time.Second}, // Timeout lebih lama untuk sync massal
	}
}

// FetchEligibleParticipants menarik daftar siswa dari SIAKAD untuk di-sync ke VPS
func (c *SiakadSyncClient) FetchEligibleParticipants(pembelajaranID, semesterID string) ([]domain.EligibleParticipant, error) {
	payload := map[string]string{
		"pembelajaran_id": pembelajaranID,
		"semester_id":     semesterID,
	}
	payloadBytes, _ := json.Marshal(payload)

	url := fmt.Sprintf("%s/api/cbt/sync-eligible-participants", c.BaseURL)
	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CBT-Secret", "your-super-secret-key-123") // Keamanan ekstra

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke SIAKAD untuk sync: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Data []domain.EligibleParticipant `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return result.Data, nil
}

// PushSemesterArchive mengirim data audit ke SIAKAD
func (c *SiakadSyncClient) PushSemesterArchive(payload archiveDomain.SemesterArchive) error {
	payloadBytes, _ := json.Marshal(payload)
	url := fmt.Sprintf("%s/api/cbt/archive-semester", c.BaseURL)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-CBT-Secret", "your-super-secret-key-123")

	// Timeout lebih lama karena payload bisa besar (ribuan siswa)
	client := &http.Client{Timeout: 5 * time.Minute}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("SIAKAD menolak archive, status: %d", resp.StatusCode)
	}
	return nil
}
