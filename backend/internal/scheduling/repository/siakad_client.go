// internal/scheduling/repository/siakad_client.go
package repository

import (
	"bytes"
	"cbt-engine-service/internal/scheduling/domain"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type SiakadClient struct {
	BaseURL    string // URL Cloudflare Tunnel SIAKAD, misal: https://siakad.smkn1.sch.id
	HTTPClient *http.Client
}

func NewSiakadClient(baseURL string) *SiakadClient {
	return &SiakadClient{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second, // Timeout ketat agar tidak membebani VPS jika SIAKAD lambat
		},
	}
}

// ValidateParticipant memanggil API SIAKAD untuk validasi hak ujian
func (c *SiakadClient) ValidateParticipant(req domain.ValidateParticipantRequest) (*domain.ValidateParticipantResponse, error) {
	payloadBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("gagal marshal payload: %w", err)
	}

	// Endpoint di SIAKAD (akan kita definisikan di langkah SIAKAD)
	url := fmt.Sprintf("%s/api/cbt/validate-participant", c.BaseURL)
	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Opsional: Tambahkan Header Secret Token agar API SIAKAD tidak bisa diakses sembarangan
	httpReq.Header.Set("X-CBT-Secret", "your-super-secret-key-123")

	resp, err := c.HTTPClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gagal terhubung ke SIAKAD (cek Cloudflare Tunnel): %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("SIAKAD mengembalikan error status: %d", resp.StatusCode)
	}

	var siakadResp domain.ValidateParticipantResponse
	if err := json.NewDecoder(resp.Body).Decode(&siakadResp); err != nil {
		return nil, fmt.Errorf("gagal decode response SIAKAD: %w", err)
	}

	return &siakadResp, nil
}
