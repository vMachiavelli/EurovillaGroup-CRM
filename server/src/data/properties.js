import { randomUUID } from "crypto";

export const PROPERTY_TYPES = ["townhouse", "semi_detached", "apartment"];
export const UNIT_STATUS_VALUES = ["available", "deposit", "under_contract", "signed_contract", "sold"];

const createId = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;

const asNumberOrNull = (value) => {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && !Number.isNaN(numeric) ? numeric : null;
};

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const propertyStore = [
  {
    id: "prop-001",
    name: "Maple Gardens",
    type: "apartment",
    location: "Queens, NY",
    phases: [
      {
        id: "phase-1",
        name: "Tower A",
        units: [
          {
            id: "unit-1a",
            label: "Unit 1A",
            status: "available",
            listPrice: 650000,
            salePrice: null,
            totalReceived: null,
            milestones: []
          },
          {
            id: "unit-10b",
            label: "Unit 10B",
            status: "signed_contract",
            listPrice: 950000,
            salePrice: 900000,
            totalReceived: 120000,
            milestones: [
              { label: "Deposit", completed: true, amount: 25000 },
              { label: "First Draw", completed: false, amount: 95000 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "prop-002",
    name: "Hudson Lofts",
    type: "townhouse",
    location: "Hoboken, NJ",
    phases: [
      {
        id: "phase-1",
        name: "Conversion",
        units: [
          {
            id: "unit-2f",
            label: "Unit 2F",
            status: "under_contract",
            listPrice: 850000,
            salePrice: null,
            totalReceived: 60000,
            milestones: [
              { label: "LOI", completed: true },
              { label: "Deposit", completed: true },
              { label: "Closing", completed: false }
            ]
          },
          {
            id: "unit-3g",
            label: "Unit 3G",
            status: "available",
            listPrice: 775000,
            salePrice: null,
            totalReceived: null,
            milestones: []
          }
        ]
      }
    ]
  }
];

export const listProperties = () => propertyStore;

export const findPropertyById = (propertyId) =>
  propertyStore.find((property) => property.id === propertyId);

export const createProperty = ({ name, location, type }) => {
  if (!name || !location || !type) {
    throw httpError("Name, location, and type are required.");
  }

  if (!PROPERTY_TYPES.includes(type)) {
    throw httpError(`Invalid property type. Valid options: ${PROPERTY_TYPES.join(", ")}`);
  }

  const newProperty = {
    id: createId("prop"),
    name,
    location,
    type,
    phases: []
  };

  propertyStore.push(newProperty);
  return newProperty;
};

export const addUnitToProperty = (propertyId, { label, status, phaseName, listPrice, salePrice, totalReceived }) => {
  const property = findPropertyById(propertyId);

  if (!property) {
    throw httpError("Property not found.", 404);
  }

  if (!label || !status || !phaseName) {
    throw httpError("Label, status, and phase name are required.");
  }

  if (!UNIT_STATUS_VALUES.includes(status)) {
    throw httpError(`Invalid unit status. Valid options: ${UNIT_STATUS_VALUES.join(", ")}`);
  }

  const normalizedPhaseName = phaseName.trim().toLowerCase();
  let phase = property.phases.find((p) => p.name.toLowerCase() === normalizedPhaseName);

  if (!phase) {
    phase = {
      id: createId("phase"),
      name: phaseName.trim(),
      units: []
    };
    property.phases.push(phase);
  }
  const newUnit = {
    id: createId("unit"),
    label,
    status,
    listPrice: asNumberOrNull(listPrice),
    salePrice: asNumberOrNull(salePrice),
    totalReceived: asNumberOrNull(totalReceived),
    milestones: []
  };

  phase.units.push(newUnit);

  return {
    propertyId: property.id,
    phase,
    unit: newUnit
  };
};

export const deletePropertyById = (propertyId) => {
  const index = propertyStore.findIndex((property) => property.id === propertyId);
  if (index === -1) {
    throw httpError("Property not found.", 404);
  }

  propertyStore.splice(index, 1);
};

export const deleteUnitFromProperty = (propertyId, unitId) => {
  const property = findPropertyById(propertyId);
  if (!property) {
    throw httpError("Property not found.", 404);
  }

  for (const phase of property.phases ?? []) {
    const unitIndex = phase.units?.findIndex((unit) => unit.id === unitId) ?? -1;
    if (unitIndex >= 0) {
      const [deletedUnit] = phase.units.splice(unitIndex, 1);
      return {
        propertyId: property.id,
        phaseId: phase.id,
        unit: deletedUnit
      };
    }
  }

  throw httpError("Unit not found.", 404);
};

export const createPhaseForProperty = (propertyId, phaseName) => {
  const property = findPropertyById(propertyId);

  if (!property) {
    throw httpError("Property not found.", 404);
  }

  const normalizedPhaseName = (phaseName || "").trim();
  if (!normalizedPhaseName) {
    throw httpError("Phase name is required.");
  }

  const existing = property.phases.find((phase) => phase.name.toLowerCase() === normalizedPhaseName.toLowerCase());
  if (existing) {
    return existing;
  }

  const newPhase = {
    id: createId("phase"),
    name: normalizedPhaseName,
    units: []
  };

  property.phases.push(newPhase);
  return newPhase;
};

export const updateUnitForProperty = (propertyId, unitId, updates) => {
  const property = findPropertyById(propertyId);
  if (!property) {
    throw httpError("Property not found.", 404);
  }

  for (const phase of property.phases ?? []) {
    const unit = phase.units.find((u) => u.id === unitId);
    if (unit) {
      if (updates.label) {
        unit.label = updates.label;
      }
      if (updates.status && UNIT_STATUS_VALUES.includes(updates.status)) {
        unit.status = updates.status;
      }
      if (Object.prototype.hasOwnProperty.call(updates, "listPrice")) {
        unit.listPrice = asNumberOrNull(updates.listPrice);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "salePrice")) {
        unit.salePrice = asNumberOrNull(updates.salePrice);
      }
      if (Object.prototype.hasOwnProperty.call(updates, "totalReceived")) {
        unit.totalReceived = asNumberOrNull(updates.totalReceived);
      }
      return { propertyId, phaseId: phase.id, unit };
    }
  }

  throw httpError("Unit not found.", 404);
};

export const updateMilestoneForUnit = (propertyId, unitId, milestoneLabel, updates = {}) => {
  const property = findPropertyById(propertyId);
  if (!property) {
    throw httpError("Property not found.", 404);
  }

  for (const phase of property.phases ?? []) {
    const unit = phase.units.find((u) => u.id === unitId);
    if (!unit) continue;

    const milestone = (unit.milestones ?? []).find(
      (m) => m.label.toLowerCase() === (milestoneLabel || "").toLowerCase()
    );

    if (!milestone) {
      throw httpError("Milestone not found.", 404);
    }

    if (Object.prototype.hasOwnProperty.call(updates, "completed")) {
      milestone.completed = Boolean(updates.completed);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "amount")) {
      milestone.amount = asNumberOrNull(updates.amount);
    }

    return { propertyId, phaseId: phase.id, unit };
  }

  throw httpError("Unit not found.", 404);
};

export const addMilestoneToUnit = (propertyId, unitId, { label, amount }) => {
  const property = findPropertyById(propertyId);
  if (!property) {
    throw httpError("Property not found.", 404);
  }

  const normalizedLabel = (label || "").trim();
  if (!normalizedLabel) {
    throw httpError("Milestone label is required.");
  }

  for (const phase of property.phases ?? []) {
    const unit = phase.units.find((u) => u.id === unitId);
    if (!unit) continue;

    unit.milestones = unit.milestones || [];
    const exists = unit.milestones.some(
      (m) => m.label.toLowerCase() === normalizedLabel.toLowerCase()
    );
    if (exists) {
      throw httpError("Milestone label already exists for this unit.");
    }

    const milestone = {
      label: normalizedLabel,
      completed: false,
      amount: asNumberOrNull(amount)
    };
    unit.milestones.push(milestone);
    return { propertyId, phaseId: phase.id, unit };
  }

  throw httpError("Unit not found.", 404);
};
