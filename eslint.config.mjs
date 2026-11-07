import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  ...coreWebVitals,
  ...typescript,
  { ignores: ["reference/**", "lib/channels/generated/**", ".next/**", "node_modules/**", "tests/e2e/__screens__/**"] },
  { rules: { "react-hooks/set-state-in-effect": "off" } },
];
