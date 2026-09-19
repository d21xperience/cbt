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
	PlatformDBPath           string `mapstructure:"PLATFORM_DB_PATH"`
	TenantBasePath           string `mapstructure:"TENANT_BASE_PATH"`
	TenantMaxOpen            int    `mapstructure:"TENANT_MAX_OPEN"`
	TenantIdleTTLMinutes     int    `mapstructure:"TENANT_IDLE_TTL_MINUTES"`
	DefaultTenantSubdomain   string `mapstructure:"DEFAULT_TENANT_SUBDOMAIN"`
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
	if err != nil {
		return config, err
	}

	if config.PlatformDBPath == "" {
		config.PlatformDBPath = "./data/platform/platform.db"
	}
	if config.TenantBasePath == "" {
		config.TenantBasePath = "./data"
	}
	if config.TenantMaxOpen == 0 {
		config.TenantMaxOpen = 20
	}
	if config.TenantIdleTTLMinutes == 0 {
		config.TenantIdleTTLMinutes = 30
	}
	if config.DefaultTenantSubdomain == "" {
		config.DefaultTenantSubdomain = "default"
	}
	return
}
func (c Config) IsProduction() bool {
	return c.AppEnv == "production"
}
