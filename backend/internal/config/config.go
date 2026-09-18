package config

import (
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

type Config struct {
	AppPort                  string `mapstructure:"APP_PORT"`
	DbSource                 string `mapstructure:"DB_SOURCE"`
	RedisAddr                string `mapstructure:"REDIS_ADDR"`
	RedisPassword            string `mapstructure:"REDIS_PASSWORD"`
	AllowedOrigin            string `mapstructure:"ALLOWED_ORIGIN"`
	JWTSecret                string `mapstructure:"JWT_SECRET"`
	SiakadBaseURL            string `mapstructure:"SIAKAD_BASE_URL"`
	CredentialsEncryptionKey string `mapstructure:"CREDENTIALS_ENCRYPTION_KEY"`
	AppEnv                   string `mapstructure:"APP_ENV"` // "development" | "production"
	LoadTestToken            string `mapstructure:"LOAD_TEST_TOKEN"`
	// ==== Phase 1 Multi-Tenant ====
	MultiTenantMode      bool   `mapstructure:"MULTI_TENANT_MODE"`
	PlatformDBPath       string `mapstructure:"PLATFORM_DB_PATH"`
	TenantBasePath       string `mapstructure:"TENANT_BASE_PATH"`
	TenantMaxOpen        int    `mapstructure:"TENANT_MAX_OPEN"`
	TenantIdleTTLMinutes int    `mapstructure:"TENANT_IDLE_TTL_MINUTES"`
}

func LoadConfig(path string) (config Config, err error) {
	viper.AddConfigPath(path)
	viper.SetConfigName(".env")
	viper.SetConfigType("env")
	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		log.Error().Err(err).Msg("Gagal membaca file .env CBT Engine")
		return config, nil
	}

	err = viper.Unmarshal(&config)
	if config.PlatformDBPath == "" {
		config.PlatformDBPath = "/var/lib/cbt/platform/platform.db"
	}
	if config.TenantBasePath == "" {
		config.TenantBasePath = "/var/lib/cbt"
	}
	if config.TenantMaxOpen == 0 {
		config.TenantMaxOpen = 20
	}
	if config.TenantIdleTTLMinutes == 0 {
		config.TenantIdleTTLMinutes = 30
	}
	return
}
func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
}
