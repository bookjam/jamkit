# Jamkit CLI

A powerful command-line tool for building native mobile apps using web-like technologies. Jamkit enables developers to create cross-platform applications for iOS and Android using SBML (markup), SBSS (styling), and JavaScript.

## 🚀 Features

- **Cross-Platform Development**: Build for both iOS and Android from a single codebase
- **Native App Generation**: Creates fully native mobile applications
- **Real-time Development**: Live reload and debugging support
- **IPFS Publishing**: Built-in decentralized app distribution
- **Template System**: Quick project scaffolding with various templates
- **Simulator Integration**: Seamless iOS Simulator and Android Emulator support
- **BON Configuration**: Human-readable configuration format
- **TypeScript Support**: Full TypeScript codebase with comprehensive type definitions

## 📋 Requirements

### macOS
- **Node.js** 18+ and npm
- **Xcode** (from Mac App Store) - Required for iOS development
- **Xcode Command Line Tools** - Required for iOS development
- **Android SDK** - Required for Android development

### Windows
- **Node.js** 18+ and npm
- **Android SDK** - Required for Android development
- **Note**: iOS development not supported

### Linux
- **Node.js** 18+ and npm
- **Android SDK** - Required for Android development
- **Note**: iOS development not supported

## 🛠 Installation

### macOS

#### 1. Install Node.js and npm
Using Homebrew (recommended):
```bash
brew update
brew install node
```

Or download from [Node.js official website](https://nodejs.org/)

#### 2. Install Jamkit globally
```bash
npm install -g jamkit
```

#### 3. Install Xcode (for iOS development)
- Download from [Mac App Store](https://itunes.apple.com/us/app/xcode/id497799835?mt=12)
- Install Xcode command line tools:
```bash
xcode-select --install
```

#### 4. Install Android SDK (for Android development)
- Download [Android Studio](https://developer.android.com/studio)
- Install Android SDK and create AVD (Android Virtual Device)

### Windows

#### 1. Install Node.js and npm
- Download and install from [Node.js official website](https://nodejs.org/)
- Verify installation:
```cmd
node --version
npm --version
```

#### 2. Install Jamkit globally
```cmd
npm install -g jamkit
```

#### 3. Install Android SDK (for Android development)
- Download [Android Studio](https://developer.android.com/studio)
- Install Android SDK and create AVD (Android Virtual Device)
- Add Android SDK to PATH environment variable

**Note**: iOS development is not supported on Windows. Use macOS for iOS app development.

### Linux

#### 1. Install Node.js and npm
Using package manager (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Or download from [Node.js official website](https://nodejs.org/)

#### 2. Install Jamkit globally
```bash
npm install -g jamkit
```

#### 3. Install Android SDK (for Android development)
- Download [Android Studio](https://developer.android.com/studio)
- Install Android SDK and create AVD (Android Virtual Device)

**Note**: iOS development is not supported on Linux. Use macOS for iOS app development.

## 📖 Quick Start

### Create a New Project
```bash
# Create a new app project
jamkit create my-app --type app --template hello-world

# Create a new book project
jamkit create my-book --type book --template hello-world
```

### Run on Simulator
```bash
# Run on iOS Simulator (macOS only)
jamkit run --platform ios

# Run on Android Emulator
jamkit run --platform android
```

### Build Your App
```bash
# Build app package
jamkit build

# Install on simulator
jamkit install --platform ios
```

### Publish to IPFS
```bash
jamkit publish --shorten-url
```

## 📚 CLI Commands

### Project Management
- `jamkit create <directory>` - Create a new project
- `jamkit run` - Run project on simulator with live reload
- `jamkit build` - Build app package (.jam or .bxp)
- `jamkit install` - Install app on simulator

### Publishing & Distribution
- `jamkit publish` - Publish to IPFS with QR code generation
- `jamkit open <url>` - Open URL in simulator

### Development Tools
- `jamkit database generate <excel-file>` - Generate database from Excel
- `jamkit style migrate` - Migrate old SBSS styles to new format
- `jamkit native compose <path>` - Integrate native code

## 🏗 Project Structure

```
my-app/
├── package.bon        # Project configuration (BON format)
├── catalogs/          # App resources and content
│   ├── MainApp/       # Main application catalog
│   │   ├── catalog.bon
│   │   └── catalog.sqlite
│   └── ...
└── ...
```

## ⚙️ Configuration

### package.bon
The main configuration file uses BON (Bookjam Object Notation) format:

```bon
{
    id: com.yourcompany.yourapp,
    version: 1.0,
    title: Your App Title,
    localization: {
        en: {
            title: App Title
        },
        ko: {
            title: 앱 제목
        }
    }
}
```

### CLI Options

#### Create Command
```bash
jamkit create <directory> [options]
  --type <type>           Project type: 'app' or 'book' (default: app)
  --app-id <id>           App identifier (default: auto-generated)
  --version <version>     App version (default: 1.0)
  --template <template>   Template name (default: hello-world)
  --repository <repo>     Template repository (default: bookjam/jamkit-templates)
  --language <lang>       Language code (default: global)
  --theme <theme>         UI theme
```

#### Run Command
```bash
jamkit run [options]
  --platform <platform>   Platform: 'ios' or 'android' (default: auto-detect)
  --mode <mode>           Run mode: 'main', 'jam', or 'widget' (default: main)
  --shell-host <host>     Shell host (default: 127.0.0.1)
  --shell-port <port>     Shell port (default: 8888)
  --skip-sync             Skip file synchronization
```

#### Publish Command
```bash
jamkit publish [options]
  --host-url <url>           Custom host URL
  --file-url <url>           Direct file URL
  --image-url <url>          App icon URL
  --image-file <path>        App icon file path
  --title <title>            Custom app title
  --language <lang>          Language for localization
  --ipfs-host <host>         IPFS host (default: ipfs.infura.io)
  --ipfs-port <port>         IPFS port (default: 5001)
  --ipfs-protocol <proto>    IPFS protocol: 'http' or 'https' (default: https)
  --shorten-url              Generate shortened URL with QR code
  --apple-install-url <url>  iOS installation URL
  --google-install-url <url> Android installation URL
```

## 🔧 Development

### Building from Source
```bash
# Clone the repository
git clone <repository-url>
cd jamkit

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run in development mode
npm run dev

# Type checking only
npm run typecheck
```

### Architecture

This is a Node.js CLI application written in TypeScript with ESM modules:

- **Entry Point**: `src/index.ts` - Commander.js CLI interface
- **Core Logic**: `src/commands.ts` - All command implementations
- **Platform Support**:
  - `src/simulator.ts` - iOS/Android simulator management
  - `src/simctl.ts` - iOS Simulator control
  - `src/avdctl.ts` - Android Emulator control
- **Build Tools**:
  - `src/template.ts` - Project template management
  - `src/catalog.ts` - Excel to SQLite conversion
  - `src/obfuscator.ts` - Code obfuscation
- **Utilities**:
  - `src/shell.ts` - Simulator shell communication
  - `src/syncfolder.ts` - File synchronization
  - `src/native.ts` - Native code integration
  - `src/bon.ts` - BON format parser/writer

### TypeScript Configuration

The project uses comprehensive TypeScript configuration with:
- **Target**: ES2022 with ESM modules
- **Custom Types**: `src/@types/` directory with module-specific type definitions
- **Build Output**: `dist/` directory with JavaScript and type declarations
- **Source Maps**: Enabled for debugging

## 🧪 Testing

```bash
# Run built CLI
node dist/index.js --help

# Test specific commands
node dist/index.js create test-app --type app
```

## 📄 File Formats

### BON (Bookjam Object Notation)
A configuration format based on JSON with simplified string-only values:

**Key Features:**
- JSON-like structure with objects `{}` and arrays `[]`
- All property keys can be unquoted (unless they contain special characters)
- **All values are strings** - no numbers, booleans, or null types
- Trailing commas are allowed
- More forgiving syntax for human readability

**Example:**
```bon
{
    id: com.example.app,
    version: 1.0,
    debug: true,
    port: 8080
}
```

Note that `1.0`, `true`, and `8080` are all treated as string values, not their respective JSON types.

### Catalog Files
- **catalog.bon**: Human-readable catalog configuration
- **catalog.sqlite**: Generated database for app runtime

### App UI Files
- **SBML**: Markup format for app layout (similar to HTML)
- **SBSS**: Stylesheet format for app styling (similar to CSS)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper TypeScript typing
4. Build and test (`npm run build && npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](docs/)
- [CLI Reference](docs/references/cli.md)
- [Template Repository](https://github.com/bookjam/jamkit-templates)
- [Issue Tracker](https://github.com/bookjam/jamkit/issues)

## 🆘 Support

- **Issues**: Report bugs and feature requests on [GitHub Issues](https://github.com/bookjam/jamkit/issues)
- **Documentation**: Comprehensive guides in the `docs/` directory
- **CLI Help**: Use `jamkit <command> --help` for command-specific help

---

Made with ❤️ by the Jamkit team