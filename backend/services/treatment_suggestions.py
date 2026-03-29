"""
Treatment suggestions based on severity
"""
from typing import Dict, Any, List

def get_treatment_suggestions(severity: str, analysis_type: str) -> Dict[str, Any]:
    """
    Generate treatment suggestions based on severity and analysis type
    """
    suggestions = {
        "acne": {
            "mild": {
                "duration_days": 30,
                "recommendations": [
                    "Gentle cleanser twice daily",
                    "Non-comedogenic moisturizer",
                    "Salicylic acid 2% (BHA) 2-3 times per week",
                    "Avoid picking or squeezing lesions"
                ],
                "products": [
                    "Salicylic acid cleanser",
                    "Lightweight, oil-free moisturizer",
                    "SPF 30+ sunscreen"
                ]
            },
            "moderate": {
                "duration_days": 60,
                "recommendations": [
                    "Benzoyl peroxide 2.5-5% daily",
                    "Salicylic acid (BHA) 3-4 times per week",
                    "Retinoid cream (start with low concentration)",
                    "Gentle exfoliation 1-2 times per week",
                    "Consult dermatologist if no improvement after 8 weeks"
                ],
                "products": [
                    "Benzoyl peroxide gel",
                    "Salicylic acid treatment",
                    "Retinoid cream (0.025-0.05%)",
                    "Hydrating, non-comedogenic moisturizer"
                ]
            },
            "severe": {
                "duration_days": 90,
                "recommendations": [
                    "Consult dermatologist immediately",
                    "Prescription retinoids (tretinoin/adapalene)",
                    "Oral antibiotics may be needed",
                    "Isotretinoin may be considered for severe cases",
                    "Professional extraction procedures",
                    "Avoid harsh scrubs or over-washing"
                ],
                "products": [
                    "Prescription retinoid",
                    "Antibacterial cleanser",
                    "Moisturizer for sensitive skin",
                    "SPF 50+ sunscreen"
                ]
            }
        },
        "pigmentation": {
            "mild": {
                "duration_days": 60,
                "recommendations": [
                    "Vitamin C serum daily",
                    "SPF 30+ sunscreen (reapply every 2 hours)",
                    "Niacinamide 5% serum",
                    "Gentle exfoliation with AHA 1-2 times per week",
                    "Avoid sun exposure during peak hours"
                ],
                "products": [
                    "Vitamin C serum (L-ascorbic acid)",
                    "Broad-spectrum SPF 30+",
                    "Niacinamide serum",
                    "Glycolic acid or lactic acid (AHA)"
                ]
            },
            "moderate": {
                "duration_days": 90,
                "recommendations": [
                    "Hydroquinone 2-4% (under supervision)",
                    "Retinoid cream",
                    "Vitamin C + Niacinamide combination",
                    "Chemical peels (professional or at-home)",
                    "SPF 50+ sunscreen mandatory",
                    "Consult dermatologist for prescription options"
                ],
                "products": [
                    "Hydroquinone cream (2-4%)",
                    "Retinoid cream",
                    "Vitamin C serum",
                    "SPF 50+ sunscreen",
                    "AHA/BHA exfoliant"
                ]
            },
            "severe": {
                "duration_days": 120,
                "recommendations": [
                    "Consult dermatologist for prescription treatment",
                    "Prescription hydroquinone 4%",
                    "Tretinoin or tazarotene",
                    "Professional chemical peels",
                    "Laser therapy may be recommended",
                    "Strict sun protection (SPF 50+, hats, shade)",
                    "Avoid picking or scratching pigmented areas"
                ],
                "products": [
                    "Prescription hydroquinone",
                    "Prescription retinoid",
                    "SPF 50+ mineral sunscreen",
                    "Brightening serum with multiple actives"
                ]
            }
        },
        "wrinkles": {
            "mild": {
                "duration_days": 90,
                "recommendations": [
                    "Retinoid cream (start with retinol 0.25-0.5%)",
                    "Peptide serum",
                    "Hyaluronic acid moisturizer",
                    "SPF 30+ daily",
                    "Gentle facial massage",
                    "Stay hydrated"
                ],
                "products": [
                    "Retinol cream (0.25-0.5%)",
                    "Peptide serum",
                    "Hyaluronic acid serum/moisturizer",
                    "SPF 30+ sunscreen"
                ]
            },
            "moderate": {
                "duration_days": 120,
                "recommendations": [
                    "Prescription retinoid (tretinoin 0.025-0.05%)",
                    "Peptide + growth factor serum",
                    "Antioxidant serum (Vitamin C, E)",
                    "Collagen-boosting ingredients",
                    "SPF 50+ daily",
                    "Consider professional treatments (microneedling, radiofrequency)"
                ],
                "products": [
                    "Prescription tretinoin",
                    "Peptide complex serum",
                    "Antioxidant serum",
                    "Rich moisturizer with ceramides",
                    "SPF 50+ sunscreen"
                ]
            },
            "severe": {
                "duration_days": 180,
                "recommendations": [
                    "Consult dermatologist",
                    "Prescription tretinoin 0.05-0.1%",
                    "Professional treatments: Botox, fillers, laser resurfacing",
                    "Microneedling with growth factors",
                    "Radiofrequency or ultrasound therapy",
                    "Strict sun protection",
                    "Comprehensive anti-aging skincare routine"
                ],
                "products": [
                    "Prescription tretinoin",
                    "Growth factor serum",
                    "Peptide complex",
                    "Rich anti-aging moisturizer",
                    "SPF 50+ mineral sunscreen"
                ]
            }
        }
    }
    
    analysis_type_lower = analysis_type.lower()
    severity_lower = severity.lower()
    
    if analysis_type_lower not in suggestions:
        return {
            "duration_days": 60,
            "recommendations": ["Consult with a dermatologist"],
            "products": []
        }
    
    if severity_lower not in suggestions[analysis_type_lower]:
        # Default to moderate if severity not found
        severity_lower = "moderate"
    
    return suggestions[analysis_type_lower][severity_lower]
