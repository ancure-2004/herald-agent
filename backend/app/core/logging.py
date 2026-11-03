import logging
import re
import sys

SENSITIVE_PATTERNS = [
    (re.compile(r"(AIzaSy[A-Za-z0-9_-]{33})"), "[REDACTED_API_KEY]"),
    (re.compile(r"(npg_[A-Za-z0-9_-]+)"), "[REDACTED_DB_PASS]"),
    (re.compile(r"Bearer\s+([A-Za-z0-9\-._~+/]+=*)", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"(BSAX[A-Za-z0-9_-]{28,})"), "[REDACTED_BRAVE_KEY]"),
    (re.compile(r"(\b[A-Fa-f0-9]{32,64}\b)"), "[REDACTED_HEX_KEY]"),
]


class RedactingFormatter(logging.Formatter):
    """Formatter that redacts API keys, credentials, and tokens from all log messages."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern, replacement in SENSITIVE_PATTERNS:
            msg = pattern.sub(replacement, msg)
        return msg


def setup_logging(debug: bool = False) -> logging.Logger:
    level = logging.DEBUG if debug else logging.INFO
    logger = logging.getLogger("personal_os")
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = RedactingFormatter(
            fmt="%(asctime)s [%(levelname)s] [req:%(request_id)s] %(name)s: %(message)s",
            defaults={"request_id": "-"},
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
