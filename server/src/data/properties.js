import { randomUUID } from "crypto";

export const PROPERTY_TYPES = ["townhouse", "semi_detached", "apartment"];
export const UNIT_STATUS_VALUES = ["available", "deposit", "under_contract", "signed_contract", "sold"];

const createId = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;

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
          { id: "unit-1a", label: "Unit 1A", status: "available", milestones: [] },
          {
            id: "unit-10b",
            label: "Unit 10B",
            status: "signed_contract",
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
            milestones: [
              { label: "LOI", completed: true },
              { label: "Deposit", completed: true },
              { label: "Closing", completed: false }
            ]
          },
          { id: "unit-3g", label: "Unit 3G", status: "available", milestones: [] }
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

export const addUnitToProperty = (propertyId, { label, status, phaseName }) => {
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
