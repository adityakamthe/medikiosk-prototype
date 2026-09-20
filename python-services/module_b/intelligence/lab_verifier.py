"""
Lab Verifier Engine for MediKiosk Module B.
Standardizes laboratory analytes against LOINC definitions, verifies units, and classifies
severity into NORMAL, ABNORMAL, and CRITICAL_PANIC tiers.
"""
import re
from typing import Any

try:
    from module_b.normalizers.loinc_mapper import loinc_mapper
    from module_b.schemas.verification_schemas import EvaluatedLabItem, SeverityTier
except (ImportError, ValueError):
    try:
        from ..normalizers.loinc_mapper import loinc_mapper  # type: ignore[no-redef]
        from ..schemas.verification_schemas import EvaluatedLabItem, SeverityTier  # type: ignore[no-redef]
    except (ImportError, ValueError):
        from normalizers.loinc_mapper import loinc_mapper  # type: ignore[no-redef]
        from schemas.verification_schemas import EvaluatedLabItem, SeverityTier  # type: ignore[no-redef]


def parse_numeric_lab_value(val_str: Any) -> tuple[float | None, str | None]:
    """
    Extracts numeric value and comparison qualifier (e.g. '>', '<', '<=') from a string.
    """
    if val_str is None:
        return None, None

    s = str(val_str).strip().replace(',', '')
    qualifier = None

    if s.startswith(('>', '<', '>=', '<=')):
        m = re.match(r'([><]=?)\s*([0-9]+(?:\.[0-9]+)?)', s)
        if m:
            qualifier = m.group(1)
            return float(m.group(2)), qualifier

    # Match numeric float/integer
    m = re.search(r'([0-9]+(?:\.[0-9]+)?)', s)
    if m:
        return float(m.group(1)), qualifier

    return None, None


class LabVerifier:
    """
    Evaluates extracted laboratory analytes against physiological intervals and panic boundaries.
    """

    def __init__(self):
        self.mapper = loinc_mapper

    def evaluate_item(
        self,
        test_name: str,
        raw_value: Any,
        unit: str | None = None
    ) -> EvaluatedLabItem:
        """
        Evaluates a single lab item returning a validated EvaluatedLabItem schema.
        """
        raw_val_str = str(raw_value) if raw_value is not None else ""
        num_val, _qualifier = parse_numeric_lab_value(raw_val_str)

        # Map to LOINC definition
        loinc_entry = self.mapper.map_test_name(test_name)

        if not loinc_entry or num_val is None:
            return EvaluatedLabItem(
                test_name=test_name,
                raw_test_query=test_name,
                parsed_value=num_val,
                raw_value=raw_val_str,
                unit=unit,
                status="UNASSESSED",
                flag=SeverityTier.INFO,
                is_panic=False,
                alert_message=None,
                reference_range=None,
                loinc_code=None,
                panel=None
            )

        # Standardize unit and value if needed
        converted_val, standardized_unit = self.mapper.standardize_unit_and_value(
            num_val, unit, loinc_entry
        )

        status = "NORMAL"
        flag = SeverityTier.NORMAL
        is_panic = False
        alert_message = None

        display_name = loinc_entry["canonical_name"]
        panic_low = loinc_entry.get("panic_low")
        panic_high = loinc_entry.get("panic_high")
        ref_min = loinc_entry.get("reference_min")
        ref_max = loinc_entry.get("reference_max")

        # 1. Panic Low Check
        if panic_low is not None and converted_val < panic_low:
            status = "PANIC_LOW"
            flag = SeverityTier.CRITICAL_PANIC
            is_panic = True
            alert_message = (
                f"CRITICAL PANIC LOW: {display_name} {converted_val} {standardized_unit} "
                f"is beneath critical threshold ({panic_low}). Immediate medical attention required."
            )
        # 2. Panic High Check
        elif panic_high is not None and converted_val > panic_high:
            status = "PANIC_HIGH"
            flag = SeverityTier.CRITICAL_PANIC
            is_panic = True
            alert_message = (
                f"CRITICAL PANIC HIGH: {display_name} {converted_val} {standardized_unit} "
                f"exceeds critical threshold ({panic_high}). Immediate medical attention required."
            )
        # 3. Abnormal Low Check
        elif ref_min is not None and converted_val < ref_min:
            status = "ABNORMAL_LOW"
            flag = SeverityTier.ABNORMAL
            alert_message = (
                f"Low: {display_name} {converted_val} {standardized_unit} is below reference range "
                f"({ref_min} - {ref_max} {standardized_unit})."
            )
        # 4. Abnormal High Check
        elif ref_max is not None and converted_val > ref_max:
            status = "ABNORMAL_HIGH"
            flag = SeverityTier.ABNORMAL
            alert_message = (
                f"High: {display_name} {converted_val} {standardized_unit} exceeds reference range "
                f"({ref_min} - {ref_max} {standardized_unit})."
            )

        ref_range_str = f"{ref_min} - {ref_max} {standardized_unit}".strip()

        return EvaluatedLabItem(
            test_name=display_name,
            raw_test_query=test_name,
            parsed_value=converted_val,
            raw_value=raw_val_str,
            unit=standardized_unit,
            status=status,
            flag=flag,
            is_panic=is_panic,
            alert_message=alert_message,
            reference_range=ref_range_str,
            loinc_code=loinc_entry["loinc_code"],
            panel=loinc_entry.get("panel")
        )

    def evaluate_batch(self, lab_items: list[dict[str, Any]]) -> list[EvaluatedLabItem]:
        """Evaluates a batch of raw lab dictionaries."""
        results: list[EvaluatedLabItem] = []
        for item in lab_items:
            t_name = item.get("test_name") or item.get("name") or ""
            r_val = item.get("value") or item.get("raw_value") or ""
            u = item.get("unit")
            results.append(self.evaluate_item(t_name, r_val, u))
        return results


# Singleton instance
lab_verifier = LabVerifier()
