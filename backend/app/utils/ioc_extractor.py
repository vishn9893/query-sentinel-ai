"""IOC (Indicator of Compromise) extractor using regex patterns."""
from __future__ import annotations

import re

# ---------------------------------------------------------------------------
# Compiled regex patterns
# ---------------------------------------------------------------------------

_IPv4 = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)

_DOMAIN = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)"
    r"+(?:com|net|org|edu|gov|mil|int|io|co|uk|de|fr|ru|cn|br|au|in|jp"
    r"|xyz|top|info|biz|online|site|tech|cloud|app|dev|eu|us|ca|nl|se|no"
    r"|fi|dk|pl|cz|sk|hu|ro|bg|gr|pt|es|it|ch|at|be|ie|nz|za|sg|hk|tw"
    r"|kr|th|id|ph|vn|my|ae|sa|eg|ng|ke|gh|tz|ug|zw|mz|na|bw|ls|sz"
    r"|rw|er|dj|so|et|sd|ly|tn|ma|dz|mr|ml|sn|gn|ci|gh|bj|tg|bf|ne"
    r"|gm|gw|sl|lr|cm|ga|cg|cd|cf|st|gq|ao|zm|mw|mg|km|mv|mu|sc|re"
    r"|yt|pm|tf|wf|pf|nc|vu|fj|sb|to|ws|ck|nu|tk|as|gu|mp|vi|pr|um"
    r")\b",
    re.IGNORECASE,
)

_MD5 = re.compile(r"\b[0-9a-fA-F]{32}\b")

_SHA256 = re.compile(r"\b[0-9a-fA-F]{64}\b")

_CVE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.IGNORECASE)

_EMAIL = re.compile(
    r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"
)

# Private / loopback ranges to exclude from IP matches (reduces noise)
_PRIVATE_IP_PREFIXES = (
    "10.", "192.168.", "127.", "169.254.", "172.16.", "172.17.", "172.18.",
    "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
    "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.",
    "172.31.", "0.0.0.0", "255.255.255.255",
)

_MAX_IOCS = 50


def _is_private_ip(ip: str) -> bool:
    return any(ip.startswith(prefix) for prefix in _PRIVATE_IP_PREFIXES)


def extract_iocs(text: str) -> list[dict]:
    """Extract IOCs from free text using regex patterns.

    Returns a deduplicated list of ``{"type": str, "value": str}`` dicts,
    capped at 50 entries.

    Detected types: ``ip``, ``domain``, ``hash_md5``, ``hash_sha256``,
    ``cve``, ``email``.
    """
    seen: set[tuple[str, str]] = set()
    results: list[dict] = []

    def _add(ioc_type: str, value: str) -> None:
        key = (ioc_type, value.lower())
        if key not in seen and len(results) < _MAX_IOCS:
            seen.add(key)
            results.append({"type": ioc_type, "value": value})

    # SHA-256 before MD5 so 64-char hex is not also matched as two 32-char MD5s
    for match in _SHA256.finditer(text):
        _add("hash_sha256", match.group())

    # Strip SHA-256 hits before scanning for MD5 to avoid false positives
    text_no_sha256 = _SHA256.sub(" ", text)
    for match in _MD5.finditer(text_no_sha256):
        _add("hash_md5", match.group())

    # CVEs
    for match in _CVE.finditer(text):
        _add("cve", match.group().upper())

    # Emails (before domain so the domain part isn't also extracted)
    for match in _EMAIL.finditer(text):
        _add("email", match.group())

    # Strip email addresses before domain scan
    text_no_email = _EMAIL.sub(" ", text)

    # IPs (exclude private/loopback ranges for signal quality)
    for match in _IPv4.finditer(text_no_email):
        ip = match.group()
        if not _is_private_ip(ip):
            _add("ip", ip)

    # Domains — run after IPs to reduce overlap
    for match in _DOMAIN.finditer(text_no_email):
        domain = match.group().lower()
        # Skip if value is actually an IP address
        if not _IPv4.match(domain):
            _add("domain", domain)

    return results
