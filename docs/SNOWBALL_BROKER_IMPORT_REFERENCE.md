# Snowball Analytics — Broker Statement Import Reference

> **Note:** This data was collected from Snowball Analytics public help documentation (help.snowball-analytics.com). Direct access to the Snowball dashboard was blocked by administrator settings, so broker-specific UI details (column headers, field mappings, tips shown in-app) may vary. Use this as a reference; verify in the live app when possible.

---

## Custom CSV/Excel Import (Unsupported Brokers)

For brokers not listed below, use the custom template format.

### Templates
- **Excel Template:** https://snowball-analytics.com/media/brokersHowTo/Other/Excel_Template.xlsx
- **CSV Template:** https://snowball-analytics.com/media/brokersHowTo/Other/CSV_Template.csv
- **Example:** https://snowball-analytics.com/media/brokersHowTo/Other/Example.csv

### Required Columns

| Column | Description | Notes |
|--------|-------------|-------|
| **Event*** | Transaction type | See accepted values below |
| **Date*** | Transaction date | Format: `yyyy-mm-dd` (e.g., 2021-01-15) |
| **Symbol** | Stock ticker, ISIN, or currency code | Leave empty for fees |
| **Price*** | Varies by event type | See event-specific rules below |
| **Quantity*** | Varies by event type | See event-specific rules below |
| **Currency*** | Transaction currency | |
| **FeeTax*** | Commission or withheld tax | Commission for most events; tax withheld for dividends |

### Accepted Event Values
- `Buy` — Purchase
- `Sell` — Sale
- `Dividend` — Dividend payment
- `Stock_As_Dividend` — Stock dividend
- `Split` — Stock split
- `Spinoff` — Spinoff
- `Fee` — Commission
- `Cash_In` — Account top-ups
- `Cash_Out` — Withdrawal of funds
- `Cash_Gain` — Other income
- `Cash_Expense` — Other expenses (e.g., taxes)
- `Cash_Convert` — Currency conversion

### Price Field by Event Type
- **Buy/Sell:** Price per share
- **Dividend:** Amount per share
- **Split:** Split coefficient (e.g., 4 for AAPL 4:1 split)
- **Currency conversion:** Amount of currency spent (converted) into new currency
- **Cash In/Out/Gain/Expense:** Use 1
- **Spinoff, Commission:** Use 0
- **Stock dividend:** Use 0

### Quantity Field by Event Type
- **Buy/Sell:** Number of assets
- **Dividend:** Total dividend amount
- **Stock dividend:** Number of shares received
- **Split/Spinoff:** Number of assets received
- **Currency conversion:** Total amount of currency received from conversion
- **Cash In/Out/Gain/Expense:** Amount of funds
- **Commission:** Use 0

### Optional Columns
| Column | Description |
|--------|-------------|
| **Exchange** | Stock exchange (NYSE, NASDAQ, LSE, HK, etc.) |
| **FeeCurrency** | Currency of fee if different from transaction currency |
| **DoNotAdjustCash** | Set to `True` if movement did not affect portfolio balance |
| **Note** | Additional notes |

### Currency Conversion Example
| Event | Date | Symbol | Price | Quantity | Currency | FeeTax | Exchange | FeeCurrency |
|-------|------|--------|-------|----------|----------|--------|-----------|-------------|
| CASH_CONVERT | 2020-01-08 | EUR | 100 | 82 | USD | 2.5 | | |

*Bought 82 EUR, paid 100 USD + 2.5 USD fee.*

---

## Supported Brokers — Import Instructions

### 1. Interactive Brokers (IBKR)
- **Format:** CSV
- **Source:** Profitability and Statements → Activities
- **Steps:**
  1. Go to Profitability and Statements tab in IBKR account
  2. Click Activities
  3. Select Period (or Customized period, up to 365 days)
  4. Select CSV format and English language
  5. Click Run to prepare report
- **Note:** Native automatic integration also available (Jan 2026)
- **Ongoing imports:** Plus sign → Import a spreadsheet (from last import date)

---

### 2. DEGIRO
- **Format:** CSV
- **Steps:**
  1. Click Export → select CSV
  2. Set Start date to first transaction, End date to present
  3. Select Transactions
  4. Navigate to Inbox (left sidebar)
  5. Login to DEGIRO account
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 3. Trading 212
- **Format:** CSV
- **Web app:**
  1. Press email address (top right)
  2. Go to History
  3. Select Export icon
  4. Pick timeframe and data to include
  5. Confirm
- **Mobile:**
  1. History section (top right)
  2. Download CSV (max 1 calendar year per report)
  3. Select timeframe; control data type (e.g., omit deposits/withdrawals)
- **Note:** Not available for CFD accounts
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 4. Revolut
- **Format:** Excel
- **Steps:**
  1. Revolut app → Stocks
  2. Three dots next to Invest and + Add money tabs
  3. Dropdown → Statements → Account statement
  4. Select Excel tab, choose time period
  5. Click Get statement
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 5. Charles Schwab
- **Format:** CSV (export from History)
- **Steps:**
  1. Sign in to Charles Schwab account
  2. Account dropdown → select trading account
  3. History from dropdown
  4. Optional: filter by Brokerage Account, Date Range
  5. Click Export (top right)
- **Ongoing imports:** Add button → Import a spreadsheet

---

### 6. Fidelity
- **Format:** CSV (Activity & Orders)
- **Steps:**
  1. Login to Fidelity account
  2. Go to Activity & Orders
  3. Select Past 30 days dropdown → Custom
  4. Set From Date to To Date (up to 366 days)
  5. Download symbol (upper right) → Download as CSV
  6. Specify save name
- **Note:** Upload from first transaction date; if >1 year, upload yearly reports oldest to newest
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 7. Freetrade
- **Format:** Export from app
- **Steps:**
  1. Go to activity page on Freetrade app
  2. Press export button (top right)
  3. Use pop-up option to export
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 8. Questrade
- **Format:** Excel
- **Steps:**
  1. Go to Accounts menu
  2. Select Account Activity
  3. Select Date Range
  4. Download Excel
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 9. eToro
- **Format:** XLS (Excel)
- **Steps:**
  1. eToro account → Settings (left menu)
  2. Click Account
  3. Documents → Account Statement → View
  4. Select timeframe → Create
  5. Export to XLS (top right)
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 10. Wealthsimple
- **Format:** CSV (Activities Export)
- **Note:** Desktop/PC only (not Android app)
- **Steps:**
  1. Profile icon (top right)
  2. Click Documents
  3. Request Documents (top right, below profile)
  4. Document type: Activities Export (CSV)
  5. Select period
  6. Next → Checkbox for desired account(s)
  7. Download CSV
- **Ongoing imports:** Plus sign → Import a spreadsheet
- **Changelog:** CSV monthly statements (Jul 2025); new CSV format support (Jan 2026)

---

### 11. M1 Finance
- **Format:** CSV (via Apex clearinghouse)
- **Steps:**
  1. Go to apexfintechsolutions.com (sign up if needed)
  2. Apex Online Menu → Activity
  3. Enter M1 account number (top left)
  4. Change dates
  5. Submit → Export to CSV (top right)
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 12. Firstrade
- **Format:** Excel CSV
- **Steps:**
  1. Main dashboard → Accounts
  2. Tax Center
  3. Scroll to Download account information
  4. Select Excel CSV Files
  5. Select start and end date
  6. Download
- **Ongoing imports:** Plus sign → Import a spreadsheet
- **Changelog:** Added Jun 2025

---

### 13. Royal Bank of Canada (RBC)
- **Format:** CSV
- **Steps:**
  1. Home Page → My Accounts → click account
  2. Transactions (top)
  3. Filter → adjust date to include all transactions from first
  4. Apply
  5. Export (top right, above Submitted transactions)
- **Ongoing imports:** Plus sign → Import a spreadsheet
- **Changelog:** Added May 2025

---

### 14. Tiger Brokerage
- **Format:** CSV
- **Steps:**
  1. Tiger broker website → My Account (top right)
  2. Statement menu
  3. Select time period
  4. Download as CSV
- **Ongoing imports:** Plus sign → Import a spreadsheet
- **Changelog:** Delisting support added May 2025

---

### 15. Sharesies
- **Format:** Transaction Report CSV
- **Mobile (iOS):**
  1. Account icon → Login
  2. Generate Reports (Portfolio and investments)
  3. Select time period
  4. Select From/To month and year
  5. Investment report type: Transaction Report CSV
  6. Export Report → Save to Files (share icon)
- **Web (app.sharesies.com):**
  1. Hamburger menu → Login
  2. Generate Reports (Portfolio and investments)
  3. Select time period, From/To
  4. Investment report type: Transaction Report CSV
  5. Export Report
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 16. Nordnet
- **Format:** CSV
- **Steps:**
  1. Login to nordnet.no (or local Nordnet site)
  2. Select Transactions tab
  3. Select date range (from account opening for new portfolio)
  4. Press Export csv
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 17. XTB
- **Format:** Excel (Full Report)
- **Steps:**
  1. Login to XTB brokerage website
  2. Account History
  3. Closed Positions tab
  4. Export Button
  5. Select Full Report, Excel format
  6. Select date range (from account opening for new portfolio)
  7. Press Export Report
- **Ongoing imports:** Add button → Import a spreadsheet

---

### 18. Tastytrade
- **Format:** CSV
- **Steps:**
  1. Download Tastytrade Desktop platform
  2. Sign in → clock symbol (left column) → History
  3. Filter by dates if needed
  4. Click csv button (top right) to download
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 19. Disnat (Desjardins)
- **Format:** Not specified (likely CSV/Excel from History)
- **Steps:**
  1. Login at disnat.com
  2. Open desired account (+ next to name)
  3. Third box: History
  4. Choose period (3 months, 6 months, custom)
- **Ongoing imports:** Plus sign → Import a spreadsheet

---

### 20. Interactive Investor (UK)
- **Format:** Download from Transaction History
- **Steps:**
  1. Login to brokerage website
  2. Main Portfolio Menu
  3. Select Transaction History
  4. Select time period (Maximum for new portfolio)
  5. Press Download icon
- **Ongoing imports:** Add button → Import a spreadsheet

---

## Brokers with Changelog Mentions (No Dedicated Help Page Found)

| Broker | Format / Notes | Changelog Date |
|--------|----------------|----------------|
| E*Trade | CSV reports | Jan 2026 |
| Saxo Bank | Excel format | May 2025 |
| Saxo Trader GO | — | Apr 2024 |
| Lightyear | — | Dec 2023 |
| National Bank Direct Brokerage | — | Nov 2023 |

---

## Common Import Errors & Fixes

### File does not contain data (0 transactions, 0 payments, 0 commissions)
1. Ensure statement is not empty (check export period)
2. Verify correct brokerage statement type per instructions
3. Verify correct broker selected in Snowball

### It looks like something went wrong
1. Verify correct brokerage statement exported
2. Verify correct broker selected

### Number of shares is incorrect
1. If you transferred stocks from another broker/account, import that account’s history first
2. Upload statements from first transaction date; if >1 year, upload yearly reports (oldest to newest)

### Most common mistake
**Uploading statements for last day/month/year instead of from first transaction date.** Always upload from the very first transaction.

---

## General Import Process

1. Click **Add** (or plus sign) on top panel
2. Select **Import a spreadsheet**
3. Click **How to get a broker's report** for broker-specific instructions
4. Select your broker from the list
5. Download report from broker per instructions
6. Upload to Snowball Analytics

---

## Automatic Broker Connections

Snowball also offers:
- **Yodlee / SnapTrade** — automatic sync for some brokers
- **Interactive Brokers** — native automatic integration (Jan 2026)

---

## References

- [Importing broker's report](https://help.snowball-analytics.com/importing-brokers-report)
- [Importing transactions from CSV](https://help.snowball-analytics.com/import-custom)
- [Common import errors](https://help.snowball-analytics.com/common-errors-when-importing-transaction-history-from-a-broker)
- [Changelog](https://help.snowball-analytics.com/changelog)
