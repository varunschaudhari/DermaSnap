# SkinQuant AI - Mobile App

AI-powered skin analysis mobile application built with Expo and React Native.

## Features

- **Acne Analysis**: Detect and classify lesions, measure inflammation, analyze pores
- **Pigmentation Analysis**: Measure dark spots, calculate coverage and intensity
- **Wrinkles Analysis**: Detect fine lines, measure depth and density
- **Full Skin Scan**: Complete analysis of all three conditions
- **History Tracking**: Save and compare analysis results over time
- **Offline-First**: All analysis performed on-device, data stored locally

## Technology Stack

- **Frontend**: Expo, React Native, TypeScript
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Computer Vision**: Custom on-device image analysis algorithms

## Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB
- Expo CLI

### Setup

1. Install frontend dependencies:
```bash
cd frontend
yarn install
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

3. Start MongoDB:
```bash
mongod
```

4. Start backend server:
```bash
cd backend
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

5. Start Expo app:
```bash
cd frontend
expo start
```

## Usage

1. Open the app on your mobile device using Expo Go
2. Accept the medical disclaimer
3. Choose an analysis type or full scan
4. Grant camera permissions
5. Take a selfie following the on-screen guide
6. Wait for analysis to complete
7. View detailed results and recommendations
8. Access scan history anytime

## Analysis Metrics

### Acne Analysis
- Total lesion count and types (comedones, pustules, papules, nodules)
- Lesion density per cm²
- Inflammation percentage
- Redness index
- Pore count and density

### Pigmentation Analysis
- Pigmented area percentage
- Intensity difference (ΔGray)
- Skin Hyperpigmentation Index (SHI)
- Spot count and density
- Uniformity metrics

### Wrinkles Analysis
- Line count per cm²
- Average length and depth
- Density percentage
- Region-specific analysis

## Severity Levels

Each condition is graded as:
- **Mild**: Home remedies recommended (2-4 weeks)
- **Moderate**: OTC products recommended (4-8 weeks)
- **Severe**: Professional consultation required

## Medical Disclaimer

This application is for informational purposes only and does not provide medical diagnosis or treatment. Always consult a qualified dermatologist for professional medical advice.

## License

MIT License