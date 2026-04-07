import { C } from "../../lib/theme";

export default function Badge({ children, color = C.orange }) {
  return (
    <span style={{
      background: color + "22", color,
      borderRadius: 5, fontSize: 10,
      padding: "2px 8px", fontWeight: 700,
    }}>
      {children}
    </span>
  );
}
