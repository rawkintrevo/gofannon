# Building the Website

This project uses [Docusaurus](https://docusaurus.io/) to build and maintain the documentation website.

## What is Docusaurus?

Docusaurus is an open-source static site generator built by Meta. It is designed specifically for building documentation websites and allows you to write content in Markdown, which is then compiled into a fast, optimized static website. Key features include:

- **Markdown-based content**: Write documentation in Markdown with support for MDX (Markdown + JSX)
- **Versioning**: Built-in support for documentation versioning
- **Search**: Integrated search functionality
- **Theming**: Customizable themes and styling
- **React-powered**: Build custom pages and components using React

## Prerequisites

- [Node.js](https://nodejs.org/) version 18.0 or higher

## Development

To run the website locally for development:

```bash
cd website
npm install
npm start
```

This will start a local development server at `http://localhost:3000` with hot reloading enabled.

## Building for Production

To build the static site for production:

```bash
cd website
npm run build
```

The built files will be output to the `website/build` directory.

## Serving the Production Build

To preview the production build locally:

```bash
cd website
npm run serve
```

## Project Structure

- `website/docs/` - Documentation pages in Markdown
- `website/blog/` - Blog posts
- `website/src/` - React components and custom pages
- `website/static/` - Static assets (images, etc.)
- `website/docusaurus.config.ts` - Main configuration file
- `website/sidebars.ts` - Sidebar navigation configuration

## Further Reading

For more information, see the [Docusaurus documentation](https://docusaurus.io/docs).
