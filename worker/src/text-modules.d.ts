// Wrangler bundles *.txt files as string modules by default.
declare module '*.txt' {
  const text: string;
  export default text;
}
