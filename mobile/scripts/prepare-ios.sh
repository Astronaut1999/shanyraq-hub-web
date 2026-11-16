#!/usr/bin/env bash
# iOS жобасын (ios/ папкасы) бұлтта жасайды. Mac керек емес: Codemagic өзі іске қосады.
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) ios/ папкасы жоқ болса, Capacitor арқылы жасаймыз
if [ ! -d ios ]; then
  npx cap add ios
fi

# 2) Белгіше (иконка) мен ашылу экраны
ASSETS=ios/App/App/Assets.xcassets
ICON_DIR="$ASSETS/AppIcon.appiconset"
for f in "$ICON_DIR"/*.png; do cp resources/icon-1024.png "$f"; done
SPLASH_DIR="$ASSETS/Splash.imageset"
if [ -d "$SPLASH_DIR" ]; then
  for f in "$SPLASH_DIR"/*.png; do cp resources/splash-2732.png "$f"; done
fi

# 3) Фото/видео жүктеу үшін рұқсат мәтіндері (бұларсыз Apple қабылдамайды)
PLIST=ios/App/App/Info.plist
setkey() { plutil -replace "$1" -string "$2" "$PLIST"; }
setkey NSCameraUsageDescription "Іс-шара фотосы мен видеосын түсіріп жүктеу үшін камера керек."
setkey NSPhotoLibraryUsageDescription "Галереядан фото мен видео таңдап жүктеу үшін керек."
setkey NSPhotoLibraryAddUsageDescription "Фотоны галереяға сақтау үшін керек."
setkey NSMicrophoneUsageDescription "Видео түсіргенде дыбыс жазу үшін керек."
setkey CFBundleDevelopmentRegion "kk"
plutil -replace ITSAppUsesNonExemptEncryption -bool NO "$PLIST"

# 4) Баптауларды ios/ ішіне көшіру
npx cap sync ios
echo "iOS жобасы дайын."
