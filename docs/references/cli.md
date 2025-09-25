# Jamkit CLI Reference

Jamkit is a command-line tool for developing native mobile apps and books.

## Installation

```bash
npm install -g jamkit
```

### Requirements

- Node.js >= 18.0
- macOS: Xcode and Command Line Tools
- Android development: Android SDK

## Usage

```bash
jamkit <command> [arguments] [options]
```

## Commands

### `jamkit create`

Create a new project.

```bash
jamkit create <directory> [options]
```

#### Arguments
- `<directory>` - Directory where the project will be created

#### Options
- `-t, --type <type>` - Project type: `app` or `book` (default: `app`)
- `--app-id <identifier>` - App identifier. Use `manual` to leave it blank (default: `auto`)
- `--version <version>` - Version of the app or book (default: `1.0`)
- `--template <template>` - Template to use (default: `hello-world`)
- `--repository <repository>` - Template repository (default: `bookjam/jamkit-templates`)
- `--language <language>` - Language of the app or book (default: `global`)
- `--theme <theme>` - Theme for the app or book

#### Examples
```bash
# Create a basic app project
jamkit create myapp

# Create a book project
jamkit create mybook --type book

# Create an app with custom app ID
jamkit create myapp --app-id com.mycompany.myapp

# Use a specific template
jamkit create myapp --template advanced-ui
```

---

### `jamkit run`

Run the app or book on simulator.

```bash
jamkit run [options]
```

#### Options
- `-t, --type <type>` - Project type: `app`, `book`, or `auto` (default: `auto`)
- `--platform <platform>` - Simulator platform: `ios` or `android` (default: `ios` on macOS, `android` otherwise)
- `--mode <mode>` - Run mode: `main`, `jam`, or `widget` (default: `main`)
- `--shell-host <host>` - Simulator shell host (default: `127.0.0.1`)
- `--shell-port <port>` - Simulator shell port (default: `8888`)
- `--skip-sync` - Skip file synchronization

#### Examples
```bash
# Run with auto-detection
jamkit run

# Run on iOS simulator
jamkit run --platform ios

# Run in widget mode on Android emulator
jamkit run --platform android --mode widget

# Run without file synchronization
jamkit run --skip-sync
```

---

### `jamkit build`

Build an app or book package.

```bash
jamkit build [options]
```

#### Options
- `-t, --type <type>` - Project type to build: `app`, `book`, or `auto` (default: `auto`)

#### Examples
```bash
# Build with auto-detection
jamkit build

# Build app project
jamkit build --type app
```

---

### `jamkit install`

Install the app or book on simulator.

```bash
jamkit install [options]
```

#### Options
- `-t, --type <type>` - Project type to install: `app`, `book`, or `auto` (default: `auto`)
- `--platform <platform>` - Simulator platform: `ios` or `android`

#### Examples
```bash
# Install on iOS simulator
jamkit install --platform ios

# Install on Android emulator
jamkit install --platform android
```

---

### `jamkit publish`

Publish a package to IPFS.

```bash
jamkit publish [options]
```

#### Options
- `-t, --type <type>` - Project type to publish: `app`, `book`, or `auto` (default: `auto`)
- `--host-scheme <scheme>` - Custom scheme used by the host app (default: `jamkit`)
- `--host-url <url>` - URL to automatically run the host app
- `--file-url <url>` - File URL of the app or book
- `--image-url <url>` - Image URL of the app or book
- `--image-file <path>` - Image file path
- `--title <title>` - Title of the app or book
- `--language <language>` - Language to use
- `--ipfs-host <host>` - IPFS host to connect (default: `ipfs.infura.io`)
- `--ipfs-port <port>` - IPFS port to connect (default: `5001`)
- `--ipfs-protocol <scheme>` - IPFS protocol: `https` or `http` (default: `https`)
- `--shorten-url` - Use URL shortening
- `--apple-install-url <url>` - Installation URL of the host app for iOS (default: `auto`)
- `--google-install-url <url>` - Installation URL of the host app for Android (default: `auto`)

#### Examples
```bash
# Publish with default settings
jamkit publish

# Publish with title and image
jamkit publish --title "My App" --image-file ./icon.png

# Use custom IPFS server
jamkit publish --ipfs-host my-ipfs.com --ipfs-port 5001

# Use URL shortening
jamkit publish --shorten-url
```

---

### `jamkit open`

Open a URL in simulator.

```bash
jamkit open <url> [options]
```

#### Arguments
- `<url>` - URL to open

#### Options
- `--platform <platform>` - Simulator platform: `ios` or `android`

#### Examples
```bash
# Open URL in iOS simulator
jamkit open https://example.com --platform ios

# Open jamkit scheme URL
jamkit open jamkit://myapp
```

---

### `jamkit database`

Database management commands.

#### `jamkit database generate`

Generate a database from an Excel file.

```bash
jamkit database generate <path>
```

##### Arguments
- `<path>` - Path to the Excel file

##### Examples
```bash
# Generate database from Excel file
jamkit database generate ./data/mydata.xlsx
```

---

### `jamkit style`

Style file management commands.

#### `jamkit style migrate`

Migrate old style SBSS to new style.

```bash
jamkit style migrate
```

##### Examples
```bash
# Run style migration
jamkit style migrate
```

---

### `jamkit native`

Native code management commands.

#### `jamkit native compose`

Combine native code with your app's codebase.

```bash
jamkit native compose <path> [options]
```

##### Arguments
- `<path>` - Path to the native code

##### Options
- `--platform <platform>` - Platform for the native code: `ios`, `android`, or `all` (default: `all`)

##### Examples
```bash
# Compose iOS native code only
jamkit native compose ./native-code --platform ios

# Compose Android native code only
jamkit native compose ./native-code --platform android
```

## Debugging

When using VSCode, debugger configuration is automatically added to `.vscode/launch.json`:

```json
{
  "name": "Jamkit attach",
  "type": "node",
  "request": "attach",
  "port": 9229
}
```

## Troubleshooting

### Cannot find package.bon or book.bon
Make sure you're running the command from the project root directory.

### iOS simulator won't start
Make sure Xcode and Command Line Tools are installed:
```bash
xcode-select --install
```

### Android emulator won't start
Make sure Android SDK is properly installed and configured in PATH.

## Additional Information

- GitHub: https://github.com/bookjam/jamkit
- Issues: https://github.com/bookjam/jamkit/issues
- License: MIT