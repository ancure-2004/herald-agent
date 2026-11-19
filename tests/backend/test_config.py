from app.core.config import Settings, get_settings


def test_settings_defaults():
    settings = get_settings()
    assert settings.PROJECT_NAME == "Herald - Multi-Agent Operations Engine"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.PORT == 8000
    assert "http://localhost:3000" in settings.cors_origins_list
    assert "localhost" in settings.allowed_hosts_list


def test_normalized_database_url():
    s1 = Settings(DATABASE_URL="sqlite:///test.db")
    assert s1.normalized_database_url == "sqlite:///test.db"

    s2 = Settings(DATABASE_URL="postgres://user:pass@host/db")
    assert s2.normalized_database_url.startswith("postgresql+psycopg2://")


def test_environment_check():
    dev = Settings(ENVIRONMENT="development")
    assert not dev.is_production

    prod = Settings(ENVIRONMENT="production")
    assert prod.is_production
