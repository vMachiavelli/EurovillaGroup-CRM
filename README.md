# ATT-CRM

An in-house CRM system built to accommodate the needs of the ATT Real Estate development group. The current version is a minimal full-stack skeleton that tracks the lifecycle of development properties/units and gives us a place to plug in AWS-backed services later.

## Stack

- **Backend:** Node.js + Express (simple in-memory dataset for now) – `server/`
- **Frontend:** React + Vite – `client/`
- **Future services:** hook up AWS-hosted database, Cognito/Auth, deployment targets

## Getting started

```bash
# Backend
cd server
npm install            # already run once, re-run after pulling new deps
npm run dev            # http://localhost:4000

# Frontend
cd client
npm install
npm run dev            # http://localhost:5173 (proxying /api to the backend)
```

Both apps hot-reload. Update the sample data in `server/src/data/properties.js` to experiment with different property/unit states.

The web UI already includes simple forms to add new properties (with type + location) and units tied to a property/phase. Data is kept in memory until we wire up AWS persistence.

## Next steps

1. Replace the in-memory dataset with AWS persistence (DynamoDB, RDS, etc.).
2. Add authentication/authorization (e.g., Cognito) with role-based views.
3. Layer in create/update endpoints and UI flows for adding projects, units, and sales milestones.
