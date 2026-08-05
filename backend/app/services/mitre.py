"""MITRE ATT&CK technique reference data and lookup helpers."""
from __future__ import annotations

_BASE_URL = "https://attack.mitre.org/techniques"

TECHNIQUES: dict[str, dict] = {
    "T1003": {
        "name": "OS Credential Dumping",
        "tactic": "Credential Access",
        "url": f"{_BASE_URL}/T1003/",
    },
    "T1027": {
        "name": "Obfuscated Files or Information",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1027/",
    },
    "T1036": {
        "name": "Masquerading",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1036/",
    },
    "T1040": {
        "name": "Network Sniffing",
        "tactic": "Credential Access",
        "url": f"{_BASE_URL}/T1040/",
    },
    "T1046": {
        "name": "Network Service Discovery",
        "tactic": "Discovery",
        "url": f"{_BASE_URL}/T1046/",
    },
    "T1049": {
        "name": "System Network Connections Discovery",
        "tactic": "Discovery",
        "url": f"{_BASE_URL}/T1049/",
    },
    "T1055": {
        "name": "Process Injection",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1055/",
    },
    "T1057": {
        "name": "Process Discovery",
        "tactic": "Discovery",
        "url": f"{_BASE_URL}/T1057/",
    },
    "T1059": {
        "name": "Command and Scripting Interpreter",
        "tactic": "Execution",
        "url": f"{_BASE_URL}/T1059/",
    },
    "T1068": {
        "name": "Exploitation for Privilege Escalation",
        "tactic": "Privilege Escalation",
        "url": f"{_BASE_URL}/T1068/",
    },
    "T1070": {
        "name": "Indicator Removal",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1070/",
    },
    "T1071": {
        "name": "Application Layer Protocol",
        "tactic": "Command and Control",
        "url": f"{_BASE_URL}/T1071/",
    },
    "T1078": {
        "name": "Valid Accounts",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1078/",
    },
    "T1082": {
        "name": "System Information Discovery",
        "tactic": "Discovery",
        "url": f"{_BASE_URL}/T1082/",
    },
    "T1083": {
        "name": "File and Directory Discovery",
        "tactic": "Discovery",
        "url": f"{_BASE_URL}/T1083/",
    },
    "T1098": {
        "name": "Account Manipulation",
        "tactic": "Persistence",
        "url": f"{_BASE_URL}/T1098/",
    },
    "T1105": {
        "name": "Ingress Tool Transfer",
        "tactic": "Command and Control",
        "url": f"{_BASE_URL}/T1105/",
    },
    "T1110": {
        "name": "Brute Force",
        "tactic": "Credential Access",
        "url": f"{_BASE_URL}/T1110/",
    },
    "T1133": {
        "name": "External Remote Services",
        "tactic": "Persistence",
        "url": f"{_BASE_URL}/T1133/",
    },
    "T1136": {
        "name": "Create Account",
        "tactic": "Persistence",
        "url": f"{_BASE_URL}/T1136/",
    },
    "T1140": {
        "name": "Deobfuscate/Decode Files or Information",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1140/",
    },
    "T1190": {
        "name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "url": f"{_BASE_URL}/T1190/",
    },
    "T1543": {
        "name": "Create or Modify System Process",
        "tactic": "Persistence",
        "url": f"{_BASE_URL}/T1543/",
    },
    "T1547": {
        "name": "Boot or Logon Autostart Execution",
        "tactic": "Persistence",
        "url": f"{_BASE_URL}/T1547/",
    },
    "T1548": {
        "name": "Abuse Elevation Control Mechanism",
        "tactic": "Privilege Escalation",
        "url": f"{_BASE_URL}/T1548/",
    },
    "T1562": {
        "name": "Impair Defenses",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1562/",
    },
    "T1566": {
        "name": "Phishing",
        "tactic": "Initial Access",
        "url": f"{_BASE_URL}/T1566/",
    },
    "T1570": {
        "name": "Lateral Tool Transfer",
        "tactic": "Lateral Movement",
        "url": f"{_BASE_URL}/T1570/",
    },
    "T1573": {
        "name": "Encrypted Channel",
        "tactic": "Command and Control",
        "url": f"{_BASE_URL}/T1573/",
    },
    "T1574": {
        "name": "Hijack Execution Flow",
        "tactic": "Defense Evasion",
        "url": f"{_BASE_URL}/T1574/",
    },
}


def get_technique(technique_id: str) -> dict | None:
    """Look up a MITRE technique by ID (case-insensitive).

    Returns the technique dict enriched with its ID, or ``None`` if not found.
    """
    normalised = technique_id.upper().strip()
    entry = TECHNIQUES.get(normalised)
    if entry is None:
        return None
    return {"id": normalised, **entry}


def enrich_techniques(technique_ids: list[str]) -> list[dict]:
    """Return enriched technique dicts for a list of technique IDs.

    Unknown IDs are included with a placeholder name so callers always get
    a result for every requested ID.
    """
    enriched: list[dict] = []
    for tid in technique_ids:
        result = get_technique(tid)
        if result is not None:
            enriched.append(result)
        else:
            normalised = tid.upper().strip()
            enriched.append(
                {
                    "id": normalised,
                    "name": "Unknown Technique",
                    "tactic": "Unknown",
                    "url": f"{_BASE_URL}/{normalised}/",
                }
            )
    return enriched
