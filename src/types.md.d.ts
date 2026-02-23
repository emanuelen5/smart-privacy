/** Allow importing Markdown files as plain text strings (loaded by esbuild). */
declare module '*.md' {
  const content: string;
  export default content;
}
