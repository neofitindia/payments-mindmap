# Payment Distribution Mindmap

A React-based payment distribution visualizer with an interactive hand-drawn mindmap interface, featuring multi-budget system and local data persistence.

## Current State

This application is a fully functional payment tracking tool built with React 19 and TypeScript. It provides an intuitive visual interface for managing payment distributions across multiple recipients and budgets.

**Key Features:**
- Multi-budget system with data isolation
- Interactive SVG canvas with drag and drop positioning
- Real-time currency formatting (Indian Rupees)
- Context menus and keyboard shortcuts (r/t/m/b/?)
- Import/export functionality with JSON backup
- Transfer system between recipients
- Recipient consolidation for transaction management
- Local data persistence using IndexedDB
- Hand-drawn aesthetic with responsive design

**Technical Stack:**
- React 19 with TypeScript (strict mode)
- IndexedDB v2 for client-side storage
- Custom CSS with comprehensive design system
- No external API dependencies

**Performance:**
- Bundle size: 76.52 kB gzipped
- Optimized with React.memo on all components
- Efficient IndexedDB usage with proper indexing

## How to Use

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup Instructions

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd payments-mindmap
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

### Live Demo

Experience the application at: https://neofitindia.github.io/payments-mindmap

## Issue Reporting

While we welcome issue reports from the community, **we are not accepting contributions** at this time. If you encounter bugs or have suggestions, please feel free to open an issue on the GitHub repository.

## Disclaimer

This software is provided by the organization "neofitindia" and Neofit India Private Limited on an "as is" basis. The organization, its members, Neofit India Private Limited, and any associated parties disclaim all warranties and make no representations regarding the software's functionality, reliability, or suitability for any purpose.

Users assume full responsibility for any decisions made using this application. The organization and associated parties shall not be liable for any financial losses, data corruption, or other damages arising from the use of this software.

This application handles financial data locally in your browser. Users are responsible for maintaining their own data backups and ensuring the security of their information.

## License

This project is released into the public domain under the Unlicense. See [LICENSE](LICENSE) for details.

For information about third-party dependencies and their licenses, see [LICENSE-3RD-PARTY.md](LICENSE-3RD-PARTY.md).