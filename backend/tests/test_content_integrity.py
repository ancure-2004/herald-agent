import pytest
import re
from app.autopilot import (
    clean_clinic_name,
    short_clinic_name,
    extract_locality,
    generate_clean_slug,
    verify_search_entity_match,
    extract_doctor_and_degrees,
    parse_places_opening_hours,
    run_self_check_gate,
    ALWAYS_BANNED_CLAIMS,
    BANNED_UNLESS_SOURCED_CLAIMS,
)

def test_clean_clinic_name():
    # Strips SEO suffixes after |, -, . Dr.
    t1 = "Dr Sharma's 32 Radiant Smiles Dental Clinic. Dr. Sakshi Jainer and Dr. Vishal Sharma - Best Dentist in Dwarka, New Delhi."
    assert clean_clinic_name(t1) == "Dr Sharma's 32 Radiant Smiles Dental Clinic"
    
    t2 = "CAVITY AVENGERS DENTAL CLINIC |Best Dental Clinic of Mohan Garden,Uttam Nagar,RCT,Implant,tooth pain,clinic near,Aligners"
    assert clean_clinic_name(t2) == "CAVITY AVENGERS DENTAL CLINIC"
    
    t3 = "Dr. Ankita's Dental Care - Dentist in Paschim Vihar"
    assert clean_clinic_name(t3) == "Dr. Ankita's Dental Care"

def test_short_clinic_name():
    # Cuts strictly on word boundaries <= 20 chars
    assert short_clinic_name("Dr Sharma's 32 Radiant Smiles Dental Clinic") == "Dr Sharma's 32"
    assert short_clinic_name("CAVITY AVENGERS DENTAL CLINIC") == "CAVITY AVENGERS"
    assert short_clinic_name("SIMPLY TEETH Orthodontic") == "SIMPLY TEETH"

def test_extract_locality():
    addr1 = "Shop No, Second Floor, Manish Global Mall, S-18, Sector 22 Dwarka, Dwarka, Delhi, 110077, India"
    assert extract_locality(addr1) == "Dwarka"
    
    addr2 = "Wz-176, Som Bazar Rd, Shiv Nagar, Janakpuri, New Delhi, Delhi, 110058, India"
    assert extract_locality(addr2) == "Janakpuri"
    
    addr3 = "Shop No. 4, market, Block BG 6, Paschim Vihar, Delhi, 110063, India"
    assert extract_locality(addr3) == "Paschim Vihar"
    
    # Never return 6-digit pincode
    assert not re.search(r"^\d{6}$", extract_locality(addr1))

def test_generate_clean_slug():
    name = "Dr Sharma's 32 Radiant Smiles Dental Clinic"
    slug = generate_clean_slug(name)
    assert slug == "dr-sharmas-32-radiant-smiles-dental-clinic"
    assert not slug.startswith("e2e-")
    assert not slug.startswith("test-")
    assert not slug.endswith("-d")
    assert len(slug) <= 45

def test_verify_search_entity_match():
    # Lead 24 in Dwarka matches Dwarka Practo listing
    l24_url = "https://www.practo.com/delhi/clinic/dr-sharma-s-32-radiant-smiles-dental-clinic-dwarka-sector-22"
    l24_title = "Dr. Sharma's 32 Radiant Smiles Dental Clinic, Dwarka Sector 22, Delhi: Practo"
    l24_snip = "Pediatric Dentistry Clinic in Dwarka Sector 22, Delhi. Visited by Dr. Vishal Sharma."
    ok, _ = verify_search_entity_match("Dr Sharma's 32 Radiant Smiles Dental Clinic", "Dwarka", "+918384027394", l24_url, l24_title, l24_snip)
    assert ok is True
    
    # Lead 28 in Paschim Vihar MUST REJECT Preet Vihar Practo listing
    l28_url = "https://www.practo.com/delhi/doctor/dr-dr-ankita-jain-dentist"
    l28_title = "Dr. Ankita Jain - Orthodontist in Preet Vihar , Delhi"
    l28_snip = "Orthodontist in Preet Vihar, Delhi at Dr. Ankita's Dental Care in Preet Vihar."
    ok_wrong, _ = verify_search_entity_match("Dr. Ankita's Dental Care", "Paschim Vihar", "+919310944358", l28_url, l28_title, l28_snip)
    assert ok_wrong is False

def test_extract_doctor_and_degrees():
    # Maps title with doctors
    raw_title = "Dr Sharma's 32 Radiant Smiles Dental Clinic. Dr. Sakshi Jainer and Dr. Vishal Sharma - Best Dentist in Dwarka, New Delhi."
    doc, deg, src = extract_doctor_and_degrees(raw_title, [])
    assert "Dr. Sakshi Jainer" in doc or "Dr. Vishal Sharma" in doc
    assert deg == ""  # No invented BDS
    assert src == "Google Maps Title"
    
    # Clinic with no doctor in title or search
    doc_none, deg_none, _ = extract_doctor_and_degrees("CAVITY AVENGERS DENTAL CLINIC", [])
    assert doc_none == "Our Dental Team"
    assert deg_none == ""

def test_parse_places_opening_hours():
    mock_places_hours = {
        "weekdayDescriptions": [
            "Monday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Tuesday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Wednesday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Thursday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Friday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Saturday: 10:30 AM – 2:00 PM, 5:00 – 8:30 PM",
            "Sunday: 10:30 AM – 3:00 PM",
        ],
        "periods": [
            {"open": {"day": 0, "hour": 10, "minute": 30}, "close": {"day": 0, "hour": 15, "minute": 0}},
            {"open": {"day": 1, "hour": 10, "minute": 30}, "close": {"day": 1, "hour": 14, "minute": 0}},
        ]
    }
    hours_obj = parse_places_opening_hours(mock_places_hours)
    assert hours_obj["verified"] is True
    assert "Monday to Saturday" in hours_obj["notes"] or "10:30 AM" in hours_obj["notes"]
    assert len(hours_obj["schedule"]) == 7
    # Sunday open
    sun = next(s for s in hours_obj["schedule"] if s["day"] == "Sunday")
    assert sun["isClosed"] is False
    assert sun["open"] == "10:30 AM"

    # Default / missing hours
    empty_hours = parse_places_opening_hours(None)
    assert empty_hours["verified"] is False
    assert empty_hours["notes"] == "Call to confirm hours"
    assert empty_hours["schedule"] == []

def test_self_check_gate():
    # Valid payload
    valid_payload = {
        "clinic": {
            "slug": "dr-sharmas-32-radiant-smiles",
            "clinicName": "Dr Sharma's 32 Radiant Smiles Dental Clinic",
            "locality": "Dwarka",
            "area": "Dwarka, Delhi NCR",
            "phone": "+91 83840 27394",
            "mapEmbedUrl": "https://maps.google.com",
            "hours": {"verified": False, "notes": "Call to confirm hours", "schedule": []},
            "doctor": {"name": "Our Dental Team", "qualifications": "", "experience": ""},
        },
        "claims": {
            "claims": [
                {"id": "claim-rating", "text": "5.0 ★ Google Rating", "status": "VERIFIED", "source": "Google Business Profile"}
            ]
        },
        "services": {"services": [{"title": f"Service {i}"} for i in range(6)]},
        "faqs": {"faqs": [{"question": f"Q {i}"} for i in range(6)]},
    }
    passed, report = run_self_check_gate(valid_payload)
    assert passed is True, f"Gate failed: {report}"

    # Invalid: Pincode as locality
    bad_pincode = dict(valid_payload)
    bad_pincode["clinic"] = dict(valid_payload["clinic"], locality="110077")
    passed_pin, report_pin = run_self_check_gate(bad_pincode)
    assert passed_pin is False
    assert report_pin["no_pincode_locality"] is False

    # Invalid: SEO pipe in clinicName
    bad_name = dict(valid_payload)
    bad_name["clinic"] = dict(valid_payload["clinic"], clinicName="Clinic | Best Dentist")
    passed_name, report_name = run_self_check_gate(bad_name)
    assert passed_name is False
    assert report_name["clean_clinic_name"] is False

    # Invalid: Banned claim "100% guarantee"
    bad_claim = dict(valid_payload)
    bad_claim["claims"] = {"claims": [{"id": "c1", "text": "100% guarantee", "status": "VERIFIED", "source": "Google Business Profile"}]}
    passed_claim, report_claim = run_self_check_gate(bad_claim)
    assert passed_claim is False
    assert report_claim["no_banned_medical_claims"] is False

    # Invalid: Unsourced zirconia claim
    bad_zirconia = dict(valid_payload)
    bad_zirconia["services"] = {"services": [{"title": "Zirconia Crowns"}] + [{"title": f"S {i}"} for i in range(5)]}
    passed_zirc, report_zirc = run_self_check_gate(bad_zirconia, verified_sources=["Places text search"])
    assert passed_zirc is False
    assert report_zirc["no_unsourced_specialty_claims"] is False
