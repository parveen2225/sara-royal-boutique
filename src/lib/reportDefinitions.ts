// Shared by the dashboard, the exports and the Reports page (dependency-free so client code can import it).
export const REPORT_DEFINITIONS = [
  "Orders are grouped by the day they were created (India time).",
  "Product sales and delivery charges count every order in the range that is not cancelled; delivery is reported separately.",
  "Confirmed order total = product sales + delivery charges. Cancelled orders are listed separately and never count as sales.",
  "Completed refunds are refunds whose payment was marked completed with a refund date in the range.",
  "Net sales = confirmed order total − completed refunds.",
  "Collected vs awaiting payment splits the confirmed total by payment status. Unpaid COD orders are not counted as cash collected.",
];
