"""
Advisory loader & intelligent agronomic engine:
Reads JSON from advisory/ directory and provides domain-expert agronomic advice for:
- Pathological crop & vegetable diseases (bacterial/fungal/viral)
- Nutrient deficiencies & soil disorders (Nitrogen, Potassium, Phosphorus, Calcium, Zinc)
- Pest & insect infestations (thrips, caterpillars, borers, armyworms)
- Water & environmental stress (drought, waterlogging, sunburn)
- Optimal healthy crop maintenance
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import Optional, Dict, Any

_ADVISORY_DIR = Path(__file__).parent.parent.parent / "advisory"


def _load_file(lang: str) -> Dict[str, Any]:
    path = _ADVISORY_DIR / f"{lang}.json"
    if path.exists():
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def _generate_dynamic_advisory(slug: str, lang: str = "en") -> Dict[str, Any]:
    parts = slug.split("_")
    crop_name = parts[0].capitalize()
    condition = " ".join(parts[1:]).capitalize()

    is_ta = lang == "ta"

    # 1. Healthy Crop
    if "healthy" in slug:
        return {
            "name": f"{crop_name} Healthy Foliage" if not is_ta else f"ஆரோக்கியமான {crop_name}",
            "category": "Healthy Crop / காய்கறி ஆரோக்கியம்" if is_ta else "Healthy Crop & Plant Vigor",
            "summary": (
                f"The {crop_name} foliage appears vigorous and healthy with well-developed green pigmentation, intact leaf margins, and no visible lesions or necrotic tissue."
                if not is_ta else
                f"{crop_name} பயிர் வலுவான பச்சையத்துடன் ஆரோக்கியமாக காணப்படுகிறது. நோய் அல்லது பூச்சி தாக்குதலின் அறிகுறிகள் எதுவும் இல்லை."
            ),
            "emergency_action": (
                "No emergency action needed. Maintain current balanced fertigation and periodic weed inspection."
                if not is_ta else
                "எந்த அவசர நடவடிக்கையும் தேவையில்லை. வழக்கமான பாசனம் மற்றும் களையெடுப்பை தொடரவும்."
            ),
            "organic_solution": (
                "Apply Panchagavya (3%) or Jeevamrutha every 15 days to promote beneficial soil microbes and maintain natural immunity."
                if not is_ta else
                "15 நாட்களுக்கு ஒருமுறை பஞ்சகாவ்யா (3%) அல்லது ஜீவாமிர்தம் தெளித்து மண் நுண்ணுயிரிகளை பெருக்கவும்."
            ),
            "soil_and_water": (
                "Ensure steady drip or furrow moisture without waterlogging. Keep root zone well aerated."
                if not is_ta else
                "சொட்டு நீர் பாசனம் மூலம் வேர்ப் பகுதியில் சீரான ஈரப்பதத்தை பராமரிக்கவும். நீர் தேங்காமல் பார்த்துக் கொள்ளவும்."
            ),
            "symptoms": [
                "Uniform green chlorophyll distribution" if not is_ta else "சீரான பச்சை நிற இலைகள்",
                "Strong erect stem and healthy leaf turgidity" if not is_ta else "வலுவான தண்டு மற்றும் புத்துணர்ச்சியான இலைகள்",
                "Absence of insect puncture marks or spots" if not is_ta else "பூச்சி கடித்தல் அல்லது புள்ளிகள் இன்மை",
            ],
            "prevention": [
                "Maintain recommended plant-to-plant spacing for proper aeration",
                "Follow regular crop rotation with leguminous green manure crops",
                "Conduct annual soil testing for macro and micronutrient balance",
            ] if not is_ta else [
                "காற்றோட்டத்திற்கு பரிந்துரைக்கப்பட்ட பயிர் இடைவெளியை கடைபிடிக்கவும்",
                "பயறு வகை பயிர்களுடன் பயிர் சுழற்சி செய்யவும்",
                "மண் பரிசோதனை செய்து தேவையான உரங்களை இடவும்",
            ],
            "management": [
                "Keep bunds clean to prevent weed host plants",
                "Monitor sticky traps weekly to detect early pest flights",
            ] if not is_ta else [
                "வரப்புகளை சுத்தமாக வைத்து களைகளை அகற்றவும்",
                "பூச்சிகளைக் கண்காணிக்க ஒட்டும் பொறிகளை பயன்படுத்தவும்",
            ],
            "seek_help_when": [
                "Sudden wilting or localized leaf yellowing occurs",
                "Flowering drops abnormally or unexpected leaf spots appear",
            ] if not is_ta else [
                "திடீரென இலைகள் வாடினாலோ அல்லது மஞ்சள் நிறமாக மாறினாலோ",
                "பூக்கள் உதிர்தல் அதிகமானாலோ",
            ],
            "severity_notes": {
                "none": "Optimal crop health. Continue standard agronomic practices." if not is_ta else "பயிர் ஆரோக்கியமாக உள்ளது."
            },
            "disclaimer": "Prescription optimized for APMC Grade-A crop quality and maximum foliar protection." if not is_ta else "தொடர்ந்து நல்ல விவசாய முறைகளை கடைபிடிக்கவும்.",
        }

    # 2. Nutrient / Soil Deficiencies
    if any(k in slug for k in ["deficiency", "calcium", "potassium", "nitrogen", "soil", "burn"]):
        return {
            "name": f"{crop_name} Nutrient Imbalance ({condition})" if not is_ta else f"{crop_name} ஊட்டச்சத்து குறைபாடு ({condition})",
            "category": "Nutrient & Soil Property / ஊட்டச்சத்து குறைபாடு" if is_ta else "Soil Fertility & Nutrient Disorder",
            "summary": (
                f"Nutrient deficiency or physiological imbalance detected in {crop_name}. "
                "This is not an infectious pathogen, but a soil fertility or root uptake disorder that restricts proper photosynthesis and yield."
                if not is_ta else
                f"{crop_name} பயிரில் ஊட்டச்சத்து பற்றாக்குறை அல்லது மண் குறைபாடு கண்டறியப்பட்டுள்ளது. இது தொற்று நோய் அல்ல, மண் சத்து குறைபாடு."
            ),
            "emergency_action": (
                "Apply recommended water-soluble micronutrient foliar spray (0.5% - 1%) in the early morning or evening for rapid leaf uptake. Avoid heavy urea application."
                if not is_ta else
                "இலைவழி ஊட்டச்சத்தாக பரிந்துரைக்கப்பட்ட நுண்ணூட்டக் கலவையை (0.5% - 1%) அதிகாலை அல்லது மாலையில் தெளிக்கவும்."
            ),
            "organic_solution": (
                "Incorporate enriched vermicompost (2 tonnes/acre) mixed with Trichoderma viride and Pseudomonas fluorescens to enhance nutrient solubilization."
                if not is_ta else
                "மண்புழு உரம் (ஏக்கருக்கு 2 டன்) உடன் டிரைக்கோடெர்மா விரிடி கலந்து மண்ணில் இடவும்."
            ),
            "soil_and_water": (
                "Test soil pH; overly alkaline or acidic soils lock up micronutrients. Maintain balanced moisture to facilitate root nutrient transport."
                if not is_ta else
                "மண்ணின் கார அமில நிலையை (pH) பரிசோதிக்கவும். சீரான நீர் பாசனம் செய்து வேர் சத்துக்களை உறிஞ்ச உதவவும்."
            ),
            "symptoms": [
                "Interveinal chlorosis (yellowing between veins) or marginal tip scorching" if not is_ta else "இலை நரம்புகளுக்கு இடையே மஞ்சள் நிறமாதல் அல்லது விளிம்புகள் கருகல்",
                "Stunted vegetative growth and reduced leaf surface area" if not is_ta else "வளர்ச்சி குன்றுதல் மற்றும் சிறிய இலைகள்",
                "Poor fruit set or blossom end rot (calcium deficit)" if not is_ta else "பூ மற்றும் பிஞ்சு உதிர்தல்",
            ],
            "prevention": [
                "Perform pre-sowing soil health card testing",
                "Apply well-decomposed Farm Yard Manure (FYM) before planting",
                "Practice split application of fertilizers rather than a single heavy dose",
            ] if not is_ta else [
                "விதைப்பதற்கு முன் மண் பரிசோதனை செய்து மண்வள அட்டை பெறவும்",
                "நன்றாக மக்கிய தொழுவுரத்தை நடவுக்கு முன் இடவும்",
                "உரங்களை ஒரே நேரத்தில் இடாமல் பிரித்து இடவும்",
            ],
            "management": [
                "Spray 0.2% Borax or 0.5% Zinc sulphate if interveinal yellowing persists",
                "Mulch the field with organic biomass to preserve root zone nutrients",
            ] if not is_ta else [
                "மஞ்சள் நிறம் தொடர்ந்தால் ஜிங்க் சல்பேட் 0.5% அல்லது போராக்ஸ் 0.2% தெளிக்கவும்",
                "மண்ணின் ஈரப்பதம் காக்க இயற்கை மூடாக்கு இடவும்",
            ],
            "seek_help_when": [
                "Symptoms spread to more than 25% of the field despite fertilizer application",
                "Soil shows signs of salinity or severe nutrient lockout",
            ] if not is_ta else [
                "உரமிட்ட பிறகும் அறிகுறிகள் வயலின் 25% பரப்பிற்கு மேல் பரவினால்",
            ],
            "severity_notes": {
                "low": "Mild deficiency. Foliar nutrition will restore green color in 5-7 days.",
                "moderate": "Significant deficiency. Soil correction and split foliar feeding required.",
                "high": "Severe nutrient lockout. Contact Agriculture Officer for soil test interpretation.",
            },
            "disclaimer": "Consult your block Agriculture Extension Officer or KVK soil testing lab for accurate fertilizer dosage.",
        }

    # 3. Pest & Insect Infestations
    if any(k in slug for k in ["thrips", "borer", "armyworm", "caterpillar", "pest", "whitefly"]):
        return {
            "name": f"{crop_name} Pest Infestation ({condition})" if not is_ta else f"{crop_name} பூச்சி தாக்குதல் ({condition})",
            "category": "Pest & Insect Attack / பூச்சி தாக்குதல்" if is_ta else "Pest & Insect Infestation",
            "summary": (
                f"Insect pest attack or larval damage detected on {crop_name}. "
                "Pests feed on leaf tissue, suck sap, or bore into stems and fruits, reducing plant vigor and potentially transmitting viral vectors."
                if not is_ta else
                f"{crop_name} பயிரில் பூச்சி அல்லது புழுக்களின் தாக்குதல் கண்டறியப்பட்டுள்ளது. இவை இலை சாற்றை உறிஞ்சி அல்லது துளையிட்டு சேதப்படுத்துகின்றன."
            ),
            "emergency_action": (
                "Spray cold-pressed Neem Oil (Azadirachtin 10,000 ppm) @ 3-5 ml per litre of water with a mild emulsifier. Hand-pick large caterpillars and destroy them."
                if not is_ta else
                "வேப்பெண்ணெய் கரைசல் (1 லிட்டர் தண்ணீருக்கு 5 மி.லி) சோப்புத்தூள் கலந்து உடனடியாக மாலை வேளையில் தெளிக்கவும்."
            ),
            "organic_solution": (
                "Install 6-8 yellow and blue sticky traps per acre for sucking pests. Erect bird perches (15-20 per acre) to invite natural predatory birds."
                if not is_ta else
                "ஏக்கருக்கு 6-8 மஞ்சள் மற்றும் நீல வண்ண ஒட்டும் பொறிகளை வைக்கவும். பறவைகள் அமர குச்சிகளை நடவும்."
            ),
            "soil_and_water": (
                "Deep summer ploughing to expose pupae to sunlight. Avoid excessive nitrogen fertilizers that make foliage overly succulent and attractive to pests."
                if not is_ta else
                "கோடை உழவு செய்து கூட்டுப்புழுக்களை அழிக்கவும். அதிகப்படியான தழைச்சத்தை (யூரியா) தவிர்க்கவும்."
            ),
            "symptoms": [
                "Upward/downward leaf curling, silvery streaks, or irregular chewed holes" if not is_ta else "இலை சுருட்டுதல், துளைகள் அல்லது வெள்ளி போன்ற கோடுகள்",
                "Presence of tiny insects, webbings, or excreta on leaf undersides" if not is_ta else "இலையின் அடிப்பகுதியில் பூச்சிகள் அல்லது கழிவுகள் காணப்படுதல்",
                "Wilted shoots or bored entry holes with frass" if not is_ta else "வாடிய தண்டு அல்லது துளைகளில் புழுக்களின் கழிவு",
            ],
            "prevention": [
                "Grow trap crops like marigold on field borders to attract pests away from main crop",
                "Release biological biocontrol agents like Trichogramma egg parasitoids",
                "Clean field bunds of alternate weed host plants",
            ] if not is_ta else [
                "எல்லைப் பயிராக சாமந்தி பூ செடிகளை நடவு செய்து பூச்சிகளை திசைதிருப்பவும்",
                "டிரைக்கோகிரம்மா ஒட்டுண்ணி அட்டைகளை வயலில் கட்டவும்",
                "களைகளை அகற்றி வயலை சுத்தமாக வைத்திருக்கவும்",
            ],
            "management": [
                "Spray Beauveria bassiana or Bacillus thuringiensis (Bt) for organic caterpillar control",
                "Apply sticky traps and neem seed kernel extract (5%) for early pest interruption",
            ] if not is_ta else [
                "பியூவேரியா பேசியானா அல்லது பேசிலஸ் துரிஞ்சியென்சிஸ் இயற்கை பூஞ்சாணத்தை தெளிக்கவும்",
                "ஒட்டும் பொறிகள் மற்றும் வேப்பங்கொட்டை சாறு தெளிக்கவும்",
            ],
            "seek_help_when": [
                "Pest population exceeds Economic Threshold Level (>10-15% leaf/shoot damage)",
                "Borer larvae penetrate inside stems or developing pods/fruits",
            ] if not is_ta else [
                "சேதம் பொருளாதார சேத நிலையைத் தாண்டினால் (15% மேல்)",
            ],
            "severity_notes": {
                "low": "Early infestation. Sticky traps and neem oil spray will control.",
                "moderate": "Pest population increasing. Apply biological spray and remove damaged shoots.",
                "high": "Severe outbreak. Apply targeted botanical bio-defense spray immediately.",
            },
            "disclaimer": "IPM biological protocol adhering to residue-free APMC Mandi quality guidelines.",
        }

    # 4. Water / Moisture / Environmental Stress
    if any(k in slug for k in ["moisture", "stress", "drought", "sunburn", "heat", "scorch"]):
        return {
            "name": f"{crop_name} Abiotic Environmental Stress" if not is_ta else f"{crop_name} சுற்றுச்சூழல் / நீர் பற்றாக்குறை அழுத்தம்",
            "category": "Environmental & Moisture Stress / நீர் & தட்பவெப்ப அழுத்தம்" if is_ta else "Abiotic & Water Stress",
            "summary": (
                f"Abiotic stress detected on {crop_name}. "
                "Caused by extreme heat, high vapor pressure deficit, or inadequate root-zone moisture rather than an infectious disease."
                if not is_ta else
                f"{crop_name} பயிரில் கடுமையான வெயில், வெப்பம் அல்லது நீர் பற்றாக்குறையினால் ஏற்படும் பாதிப்பு கண்டறியப்பட்டுள்ளது."
            ),
            "emergency_action": (
                "Provide immediate light irrigation during the evening or night hours. Avoid irrigating in peak afternoon sun. Mulch around base with crop residue."
                if not is_ta else
                "மாலையில் மிதமான நீர் பாசனம் செய்யவும். நண்பகல் வெயிலில் பாசனம் செய்ய வேண்டாம். வேர்ப்பகுதியில் மூடாக்கு இடவும்."
            ),
            "organic_solution": (
                "Spray anti-transpirant such as Kaolin clay (3%) or Seaweed extract (2 ml/L) to reduce excessive transpiration and leaf cell collapse."
                if not is_ta else
                "இலை வழியே நீர் ஆவியாவதை குறைக்க கடல்பாசி சாறு (2 மி.லி/லிட்டர்) தெளிக்கவும்."
            ),
            "soil_and_water": (
                "Switch to drip irrigation with organic mulching to cut water evaporation by up to 50%. Keep soil crumbly and moisture-retentive."
                if not is_ta else
                "சொட்டு நீர் பாசனம் அமைத்து ஆவியாதலை குறைக்கவும்."
            ),
            "symptoms": [
                "Wilting, rolling, or crispy necrotic leaf margins" if not is_ta else "இலைகள் சுருங்குதல், வாடுதல் அல்லது விளிம்புகள் காய்ந்து போதல்",
                "Bleached, papery white or scorched patches on sun-facing leaves" if not is_ta else "வெயிலில் உள்ள இலைகள் வெளிறி காய்ந்து போதல்",
            ],
            "prevention": [
                "Incorporate biochar or vermicompost to increase soil water retention capacity",
                "Plant windbreaks and shade trees along field perimeter",
            ] if not is_ta else [
                "மண்ணின் ஈரப்பதம் காக்கும் திறனை அதிகரிக்க மண்புழு உரம் அல்லது மரக்கரி தூள் இடவும்",
            ],
            "management": [
                "Schedule irrigation early mornings or evenings based on tensiometer readings",
            ] if not is_ta else [
                "காலை அல்லது மாலை வேளையில் மட்டுமே பாசனம் செய்யவும்",
            ],
            "seek_help_when": [
                "Permanent wilting point is reached and plants do not recover overnight",
            ] if not is_ta else [
                "இரவிலும் பயிர் வாட்டம் தீராமல் காய்ந்து போனால்",
            ],
            "severity_notes": {
                "low": "Plants recover with prompt evening irrigation.",
                "moderate": "Mulching and irrigation scheduling required immediately.",
                "high": "Severe water deficit. Implement emergency drip irrigation.",
            },
            "disclaimer": "Consult your local water management and agriculture extension specialist.",
        }

    # 5. General Pathological Disease Fallback
    return {
        "name": f"{crop_name} {condition}" if not is_ta else f"{crop_name} {condition}",
        "category": "Pathological Disease / பயிர் நோய்" if is_ta else "Pathological Disease",
        "summary": (
            f"Infection suspected on {crop_name}. "
            "Leaf spots, blights, or lesions can rapidly reduce photosynthetic leaf area and lower harvest yield if not contained."
            if not is_ta else
            f"{crop_name} பயிரில் இலைப்புள்ளி அல்லது கருகல் போன்ற நோய் தொற்று சந்தேகிக்கப்படுகிறது. உரிய நேரத்தில் கட்டுப்படுத்தாவிட்டால் மகசூல் குறையலாம்."
        ),
        "emergency_action": (
            "Prune and safely destroy severely infected lower leaves. Spray Pseudomonas fluorescens (10g/litre) or certified organic copper-based formulation in the evening."
            if not is_ta else
            "அதிகமாக பாதிக்கப்பட்ட இலைகளை கிள்ளி எடுத்து அழித்துவிடவும். சூடோமோனாஸ் புளோரசன்ஸ் (1 லிட்டருக்கு 10 கிராம்) கரைத்து மாலை வேளையில் தெளிக்கவும்."
        ),
        "organic_solution": (
            "Apply fermented sour buttermilk (5%) or Neem Cake solution as a safe biological fungistatic agent."
            if not is_ta else
            "புளித்த மோர் கரைசல் (5%) அல்லது வேப்பம் புண்ணாக்கு சாறு தெளித்து பூஞ்சாண வளர்ச்சியை தடுக்கவும்."
        ),
        "soil_and_water": (
            "Avoid overhead sprinkler irrigation that splashes pathogens between plants. Water strictly at root level."
            if not is_ta else
            "இலைகளின் மேல் தண்ணீர் தெளிப்பதை தவிர்த்து, வேர் பகுதிக்கு மட்டும் நீர் பாய்ச்சவும்."
        ),
        "symptoms": [
            "Circular or angular spots with dark margins on leaves" if not is_ta else "இலைகளில் வட்ட வடிவ அல்லது ஒழுங்கற்ற கரும் புள்ளிகள்",
            "Yellow halo around lesions and premature leaf defoliation" if not is_ta else "புள்ளிகளைச் சுற்றி மஞ்சள் வளையம் மற்றும் இலை உதிர்தல்",
        ],
        "prevention": [
            "Use certified disease-resistant seeds",
            "Maintain wide plant spacing for rapid drying of morning dew",
            "Sterilize pruning shears between rows",
        ] if not is_ta else [
            "நோய் எதிர்ப்பு திறன் கொண்ட சான்றளிக்கப்பட்ட விதைகளை பயன்படுத்தவும்",
            "காற்றோட்டம் கிடைக்க போதுமான இடைவெளியில் நடவு செய்யவும்",
        ],
        "management": [
            "Remove diseased crop debris from field borders",
            "Apply targeted bio-fungicide formulation (Pseudomonas fluorescens 10g/L or Trichoderma viride)",
        ] if not is_ta else [
            "பாதிக்கப்பட்ட பயிர் கழிவுகளை வயலில் இருந்து அகற்றி எரிக்கவும்",
            "சூடோமோனாஸ் அல்லது டிரைக்கோடெர்மா பூஞ்சாணக் கொல்லியை பயன்படுத்தவும்",
        ],
        "seek_help_when": [
            "Lesions spread across more than 20% of crop canopy within 48 hours",
        ] if not is_ta else [
            "இரண்டு நாட்களுக்குள் நோய் வேகமாக பரவினால்",
        ],
        "severity_notes": {
            "low": "Early stage. Remove affected foliage and apply biological preventative.",
            "moderate": "Disease spreading. Apply targeted bio-fungicide and maintain canopy aeration.",
            "high": "Severe infection. Apply curative bio-formulation and prune heavily blighted foliage.",
        },
        "disclaimer": "Prescription optimized for Grade-A foliar protection and export safety standards.",
    }


def get_advisory(disease_slug: str, lang: str = "en") -> Optional[Dict[str, Any]]:
    data = _load_file(lang)
    if disease_slug in data:
        return data[disease_slug]
    # Fallback to English file
    if lang != "en":
        data = _load_file("en")
        if disease_slug in data:
            return data[disease_slug]
    # Intelligent Dynamic Agronomic Fallback
    return _generate_dynamic_advisory(disease_slug, lang)
