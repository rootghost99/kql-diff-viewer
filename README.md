# KQL Query Diff Viewer

A web-based tool for comparing Microsoft Sentinel Analytic Rule queries and visualizing changes between versions.

## Live Demo

**[Launch App](https://rootghost99.github.io/kql-diff-viewer)**

## Purpose

Built for MSSP teams managing Microsoft Sentinel deployments. This tool simplifies the process of reviewing and validating changes to KQL-based analytic rules before deployment.

## Features

- **Side-by-side comparison** of original and updated KQL queries
- **Line-level highlighting** shows added, removed, and modified lines
- **Character-level highlighting** pinpoints exact changes within modified lines
- **Edit mode** allows quick adjustments without starting over
- **Clean interface** optimized for rapid query reviews

## Use Cases

- Validate analytic rule updates before deploying to production
- Review changes submitted by team members
- Document query modifications for compliance or audit trails
- Compare rule versions across different Sentinel workspaces

## How to Use

1. Paste your original KQL query in the left panel
2. Paste the updated query in the right panel
3. Click "Compare Queries"
4. Review highlighted differences:
   - **Green**: Added content
   - **Red**: Removed content
   - **Yellow**: Modified lines with character-level highlighting
5. Use "Back to Edit" to make adjustments or "Start Over" to clear both panels

## Technology Stack

- React 18
- Tailwind CSS
- Deployed via GitHub Pages

## Local Development

```bash
# Clone the repository
git clone https://github.com/rootghost99/kql-diff-viewer.git
cd kql-diff-viewer

# Install dependencies
npm install

# Run locally
npm start

# Build for production
npm run build
```

## License

MIT