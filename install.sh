#!/usr/bin/env bash
set -euo pipefail

# ─── Phplay installer ─────────────────────────────────────────────────────────
# curl -fsSL https://raw.githubusercontent.com/rhaymisonbetini/Phplay/main/install.sh | bash
# ──────────────────────────────────────────────────────────────────────────────

REPO="rhaymisonbetini/Phplay"
APP_NAME="phplay"
INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/256x256/apps"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log()    { echo -e "  ${GREEN}✓${NC} $1"; }
info()   { echo -e "  ${CYAN}→${NC} $1"; }
warn()   { echo -e "  ${YELLOW}!${NC} $1"; }
error()  { echo -e "  ${RED}✗${NC} $1" >&2; }
die()    { error "$1"; exit 1; }

# ── Header ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}  Phplay — Desktop PHP REPL${NC}"
echo -e "${DIM}  https://github.com/$REPO${NC}"
echo ""

# ── OS check ─────────────────────────────────────────────────────────────────
if [[ "$(uname -s)" != "Linux" ]]; then
  die "This installer only supports Linux. Download manually from https://github.com/$REPO/releases"
fi

# ── Architecture check ────────────────────────────────────────────────────────
ARCH="$(uname -m)"
if [[ "$ARCH" != "x86_64" ]]; then
  die "Phplay currently only ships x64 binaries (detected: $ARCH)."
fi

# ── Dependency: curl or wget ──────────────────────────────────────────────────
if command -v curl &>/dev/null; then
  FETCH="curl -fsSL"
elif command -v wget &>/dev/null; then
  FETCH="wget -qO-"
else
  die "curl or wget is required. Install one and try again."
fi

# ── Dependency: PHP ───────────────────────────────────────────────────────────
if ! command -v php &>/dev/null; then
  warn "PHP was not found on your system."
  warn "Phplay requires PHP 8.1+ to execute code."
  warn "Install it and then restart Phplay."
  echo ""
fi

# ── FUSE check (required to run AppImage) ─────────────────────────────────────
FUSE_OK=false
if command -v fusermount &>/dev/null || command -v fusermount3 &>/dev/null; then
  FUSE_OK=true
fi

if [[ "$FUSE_OK" == "false" ]]; then
  info "FUSE not detected — attempting to install libfuse2..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get install -y libfuse2 2>/dev/null && FUSE_OK=true || true
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y fuse-libs 2>/dev/null && FUSE_OK=true || true
  elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm fuse2 2>/dev/null && FUSE_OK=true || true
  fi

  if [[ "$FUSE_OK" == "false" ]]; then
    warn "Could not install FUSE automatically."
    warn "If the app fails to launch, run: sudo apt-get install libfuse2"
  fi
fi

# ── Fetch latest release from GitHub API ─────────────────────────────────────
info "Fetching latest release..."

RELEASE_JSON=$($FETCH "https://api.github.com/repos/$REPO/releases/latest")

if echo "$RELEASE_JSON" | grep -q '"message": "Not Found"'; then
  die "No release found. Visit https://github.com/$REPO/releases"
fi

TAG=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
DOWNLOAD_URL=$(echo "$RELEASE_JSON" | grep '"browser_download_url"' | grep '\.AppImage"' | head -1 | sed 's/.*"browser_download_url": *"\([^"]*\)".*/\1/')

if [[ -z "$DOWNLOAD_URL" ]]; then
  die "Could not find an AppImage asset in the latest release ($TAG). Visit https://github.com/$REPO/releases"
fi

APPIMAGE_NAME="$(basename "$DOWNLOAD_URL")"
log "Found $TAG → $APPIMAGE_NAME"

# ── Install directories ───────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
mkdir -p "$DESKTOP_DIR"
mkdir -p "$ICON_DIR"

# ── Download ──────────────────────────────────────────────────────────────────
DEST="$INSTALL_DIR/$APP_NAME.AppImage"
info "Downloading to $DEST..."

if command -v curl &>/dev/null; then
  curl -fL --progress-bar "$DOWNLOAD_URL" -o "$DEST"
else
  wget -q --show-progress "$DOWNLOAD_URL" -O "$DEST"
fi

chmod +x "$DEST"
log "Downloaded and made executable"

# ── Wrapper script with --no-sandbox (required on most Linux distros) ─────────
WRAPPER="$INSTALL_DIR/$APP_NAME"
cat > "$WRAPPER" <<WRAPPER
#!/usr/bin/env bash
exec "$DEST" --no-sandbox "\$@"
WRAPPER
chmod +x "$WRAPPER"
log "Created launcher → $WRAPPER"

# ── Icon ──────────────────────────────────────────────────────────────────────
ICON_URL="https://raw.githubusercontent.com/$REPO/main/resources/icon.png"
mkdir -p "$HOME/.local/share/icons/hicolor/512x512/apps"
mkdir -p "$HOME/.local/share/icons/hicolor/256x256/apps"

if command -v curl &>/dev/null; then
  curl -fsSL "$ICON_URL" -o "$HOME/.local/share/icons/hicolor/512x512/apps/phplay.png" 2>/dev/null || true
  curl -fsSL "$ICON_URL" -o "$HOME/.local/share/icons/hicolor/256x256/apps/phplay.png" 2>/dev/null || true
else
  wget -qO "$HOME/.local/share/icons/hicolor/512x512/apps/phplay.png" "$ICON_URL" 2>/dev/null || true
  wget -qO "$HOME/.local/share/icons/hicolor/256x256/apps/phplay.png" "$ICON_URL" 2>/dev/null || true
fi

if command -v gtk-update-icon-cache &>/dev/null; then
  gtk-update-icon-cache -f "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi
log "Installed icon"

# ── .desktop entry ───────────────────────────────────────────────────────────
DESKTOP_FILE="$DESKTOP_DIR/phplay.desktop"
cat > "$DESKTOP_FILE" <<DESKTOP
[Desktop Entry]
Name=Phplay
Comment=Desktop PHP REPL — execute PHP in the context of your real projects
Exec=$WRAPPER %U
Icon=$HOME/.local/share/icons/hicolor/512x512/apps/phplay.png
Type=Application
Categories=Development;IDE;
Keywords=PHP;REPL;Laravel;Developer;
StartupWMClass=phplay
DESKTOP

log "Created .desktop entry → $DESKTOP_FILE"

if command -v update-desktop-database &>/dev/null; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

# ── PATH reminder ─────────────────────────────────────────────────────────────
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
  echo ""
  warn "$INSTALL_DIR is not in your PATH."
  warn "Add this to your ~/.bashrc or ~/.zshrc:"
  echo ""
  echo -e "    ${DIM}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
  echo ""
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}${GREEN}Phplay $TAG installed!${NC}"
echo ""
echo -e "  Launch:   ${CYAN}$APP_NAME${NC}"
echo -e "  Or find it in your application launcher."
echo ""
echo -e "  ${DIM}Uninstall: rm $DEST $WRAPPER $DESKTOP_FILE${NC}"
echo ""
