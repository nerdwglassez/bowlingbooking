import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [".next/**", "node_modules/**", "public/**", ".vscode/**", "next-env.d.ts", "generated/**"],
  },
  ...nextConfig,
];
