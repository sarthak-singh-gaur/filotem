# Filotem & Friends Table

Filotem is a multi-application ecosystem container that acts as a central landing field for a variety of web and mobile tools. This repository uses a highly modular architecture where the web shell remains lightweight, while complex apps like **Friends Table** are separated into dedicated full-stack modules.

## 📁 Infrastructure Overview

The project is structured to separate the **Landing Shell** from **App Implementations**:

- `src/`: The core Filotem Shell (React + Vite + TypeScript + Tailwind).
- `friends table/`: A dedicated full-stack micro-app containing the native mobile frontend (Capacitor) and the Express backend API.

## 🚀 Getting Started

To thoroughly understand how this project connects and manages its various parts, please refer to the detailed architectural guide:

👉 **[infrastructure-guide.md](./infrastructure-guide.md)**

### Key Commands

- `npm run dev`: Launch the Filotem Web Shell in development mode.
- `npm run build`: Compile the production-ready Filotem Web Shell.
- `npm run clean`: Remove standard build artifacts and temp files.

## 📱 Friends Table Mobile

The Friends Table application within this repo is designed for real-world mobile usage via Android. For detailed build instructions regarding its APK generation, maneuver to:
- `friends table/frontend/README.md`
- `friends table/backend/README.md`

---

Built for scalability and mobile-first experiences.
