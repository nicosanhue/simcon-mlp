# Asset Guardian

I need a web application for "Industrial Equipment Condition Monitoring". I am currently using a PowerPoint to track this manually, but I need a database-driven solution.

The app must have the following Architecture and Data Structure:

Database Schema (Supabase/PostgreSQL concept):

Areas: (e.g., Puerto Desaladora, TF, Tranque Mauro).

Systems: Children of Areas (e.g., Espesadores, Bombas de Arenas, ShipLoader).

Equipment (Assets): Children of Systems. Fields: Tag (e.g., 370PP089), Name, Criticality.

WeeklyReports: This is the transactional table. Fields: Equipment_ID, Week_Number (e.g., 52), Year (e.g., 2025), Status (Operativo, Stand By, Falla, Alerta), SAP_Notification (text), SAP_Order (text), Technical_Description (text), Planned_Date (date).

Core Features:

A. Dashboard (Home):

Global Status: Pie chart showing the % of equipment in "Operativo" vs "Falla" vs "Alerta" for the current week.

Filter by Area: A dropdown to filter the statistics by "Puerto", "TF", etc.

Critical Alerts: A list of equipment currently in "Falla" or "Alerta" status requiring immediate attention.

B. Data Entry (The most important part):

A view to "Create Weekly Report".

User selects the Week and Year.

User selects an Area.

The app displays a table or grid of all equipment in that Area.

Each row allows the user to input/update: Status, SAP Notification, SAP Order, and Comments.

Feature request: "Clone previous week". A button to copy the status of all equipment from Week 51 to Week 52, so I only have to edit the changes (deltas).

C. Equipment History:

A search bar to find a specific Tag (e.g., TK020).

Clicking a tag shows a timeline or list of its condition over the past weeks to analyze degradation trends.

UI/UX Style:

Professional, clean, industrial dashboard style.

Use a sidebar for navigation (Dashboard, Data Entry, Assets, History).

Use color coding for status: Green (Operativo), Yellow (Alerta/Stand By), Red (Falla).

Specific Context from my data:

I handle distinct technical statuses like "Lubricar portarodamientos", "Fuga sello", "Desbalance motor". The text fields need to support technical details.

Include fields for maintenance dates (Fecha Plan).

Start by building the database structure and the Dashboard view.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://simcon-mlp.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/02fe1ba4-8bab-4b50-b6ae-6bfc05fd0270).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
