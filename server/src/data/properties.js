import { randomUUID } from "crypto";

export const PROPERTY_TYPES = ["semi_detached", "villa", "apartment"];
export const UNIT_STATUS_VALUES = ["available", "deposit", "under_contract", "signed_contract", "sold"];

const createId = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;

const asNumberOrNull = (value) => {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && !Number.isNaN(numeric) ? numeric : null;
};

const sanitizeText = (value) => (typeof value === "string" ? value.trim() : "");

const httpError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeFilePayload = (file, defaults = null) => {
  if (file === null) {
    return null;
  }

  if (!file && defaults) {
    return defaults ?? null;
  }

  if (!file || typeof file !== "object") {
    return defaults ?? null;
  }

  const normalizedName = sanitizeText(file.name ?? "");
  const normalizedType = sanitizeText(file.type ?? "");
  const normalizedSize =
    typeof file.size === "number" && !Number.isNaN(file.size) ? file.size : defaults?.size ?? null;
  const normalizedData =
    typeof file.data === "string" && file.data.trim() ? file.data.trim() : defaults?.data ?? null;

  if (!normalizedName && !normalizedData) {
    return defaults ?? null;
  }

  return {
    name: normalizedName || defaults?.name || "",
    type: normalizedType || defaults?.type || "",
    size: normalizedSize,
    data: normalizedData
  };
};

const createBuyer = (buyer = {}, defaults = {}) => ({
  name: sanitizeText(Object.prototype.hasOwnProperty.call(buyer, "name") ? buyer.name : defaults.name ?? ""),
  passportNumber: sanitizeText(
    Object.prototype.hasOwnProperty.call(buyer, "passportNumber") ? buyer.passportNumber : defaults.passportNumber ?? ""
  ),
  purchaseDate: sanitizeText(
    Object.prototype.hasOwnProperty.call(buyer, "purchaseDate") ? buyer.purchaseDate : defaults.purchaseDate ?? ""
  ),
  initialPayment: Object.prototype.hasOwnProperty.call(buyer, "initialPayment")
    ? asNumberOrNull(buyer.initialPayment)
    : defaults.initialPayment ?? null,
  firstPayment: Object.prototype.hasOwnProperty.call(buyer, "firstPayment")
    ? asNumberOrNull(buyer.firstPayment)
    : defaults.firstPayment ?? null,
  secondPayment: Object.prototype.hasOwnProperty.call(buyer, "secondPayment")
    ? asNumberOrNull(buyer.secondPayment)
    : defaults.secondPayment ?? null,
  phone: sanitizeText(Object.prototype.hasOwnProperty.call(buyer, "phone") ? buyer.phone : defaults.phone ?? ""),
  passportFile: normalizeFilePayload(buyer.passportFile, defaults.passportFile ?? null)
});

const createContract = (contract = {}, defaults = {}) => ({
  reference: sanitizeText(
    Object.prototype.hasOwnProperty.call(contract, "reference") ? contract.reference : defaults.reference ?? ""
  ),
  telephone: sanitizeText(
    Object.prototype.hasOwnProperty.call(contract, "telephone") ? contract.telephone : defaults.telephone ?? ""
  ),
  documentFile: normalizeFilePayload(contract.documentFile, defaults.documentFile ?? null)
});

const createDefaultPhase = (name = "General Inventory") => ({
  id: createId("phase"),
  name,
  units: []
});

const propertyHasPhases = (property) => property?.usesPhases !== false;

const ensureDefaultPhaseForProperty = (property) => {
  if (!Array.isArray(property.phases)) {
    property.phases = [];
  }
  if (!property.phases.length) {
    property.phases.push(createDefaultPhase());
  }
  return property.phases[0];
};

const getPhaseForProperty = (property, phaseName) => {
  if (!Array.isArray(property.phases)) {
    property.phases = [];
  }

  if (!propertyHasPhases(property)) {
    return ensureDefaultPhaseForProperty(property);
  }

  const normalizedPhaseName = sanitizeText(phaseName);
  if (!normalizedPhaseName) {
    throw httpError("Phase name is required for this property.");
  }

  let phase = property.phases.find(
    (p) => p.name.toLowerCase() === normalizedPhaseName.toLowerCase()
  );

  if (!phase) {
    phase = {
      id: createId("phase"),
      name: normalizedPhaseName,
      units: []
    };
    property.phases.push(phase);
  }

  return phase;
};

const propertyStore = [
  {
    id: "prop-001",
    name: "Palm Residences",
    type: "semi_detached",
    usesPhases: true,
    location: "Abu Dhabi, UAE",
    phases: [
      {
        id: "phase-1",
        name: "Palm North",
        units: [
          {
            id: "unit-1a",
            unitNumber: "SD-101",
            status: "available",
            listPrice: 1250000,
            salePrice: null,
            totalReceived: null,
            buyer: createBuyer(),
            contract: createContract(),
            milestones: []
          },
          {
            id: "unit-1b",
            unitNumber: "SD-115",
            status: "sold",
            listPrice: 1395000,
            salePrice: 1375000,
            totalReceived: 450000,
            buyer: createBuyer({
              name: "Layla Kader",
              passportNumber: "A45599871",
              purchaseDate: "2024-05-18",
              initialPayment: 150000,
              firstPayment: 200000,
              secondPayment: 100000,
              phone: "+971501112233"
            }),
            contract: createContract({
              reference: "PR-SD-115",
              telephone: "+97125555000"
            }),
            milestones: [
              { label: "Reservation", completed: true, amount: 50000 },
              { label: "Deposit", completed: true, amount: 100000 },
              { label: "Handover", completed: false, amount: 300000 }
            ]
          }
        ]
      },
      {
        id: "phase-2",
        name: "Palm South",
        units: [
          {
            id: "unit-2a",
            unitNumber: "SD-220",
            status: "under_contract",
            listPrice: 1320000,
            salePrice: null,
            totalReceived: 250000,
            buyer: createBuyer({
              name: "Aamir Rahman",
              passportNumber: "P77892344",
              purchaseDate: "2024-04-02",
              initialPayment: 100000,
              firstPayment: 150000,
              secondPayment: null,
              phone: "+971509998877"
            }),
            contract: createContract({
              reference: "PR-SD-220",
              telephone: "+97125555123"
            }),
            milestones: [
              { label: "Deposit", completed: true, amount: 100000 },
              { label: "First Draw", completed: true, amount: 150000 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "prop-002",
    name: "Azure Retreat Villas",
    type: "villa",
    usesPhases: false,
    location: "Dubai, UAE",
    phases: [
      {
        id: "phase-villas",
        name: "General Inventory",
        units: [
          {
            id: "villa-5",
            unitNumber: "Villa 5",
            status: "available",
            listPrice: 3850000,
            salePrice: null,
            totalReceived: null,
            buyer: createBuyer(),
            contract: createContract(),
            milestones: []
          },
          {
            id: "villa-7",
            unitNumber: "Villa 7",
            status: "signed_contract",
            listPrice: 4120000,
            salePrice: 4075000,
            totalReceived: 750000,
            buyer: createBuyer({
              name: "Farah Aziz",
              passportNumber: "AA0993456",
              purchaseDate: "2024-01-12",
              initialPayment: 250000,
              firstPayment: 300000,
              secondPayment: 200000,
              phone: "+971504561234"
            }),
            contract: createContract({
              reference: "ARV-07",
              telephone: "+97145557890"
            }),
            milestones: [
              { label: "Deposit", completed: true, amount: 250000 },
              { label: "Construction", completed: true, amount: 300000 },
              { label: "Finishing", completed: false, amount: 200000 }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "prop-003",
    name: "Harbor Heights",
    type: "apartment",
    usesPhases: false,
    location: "Doha, Qatar",
    phases: [
      {
        id: "phase-harbor",
        name: "Inventory",
        units: [
          {
            id: "apt-1402",
            unitNumber: "Apt 1402",
            status: "deposit",
            listPrice: 980000,
            salePrice: null,
            totalReceived: 90000,
            buyer: createBuyer({
              name: "Jude Carter",
              passportNumber: "M4456778",
              purchaseDate: "2024-06-05",
              initialPayment: 50000,
              firstPayment: 40000,
              secondPayment: null,
              phone: "+97455501122"
            }),
            contract: createContract({
              reference: "HH-A1402",
              telephone: "+97433334444"
            }),
            milestones: [
              { label: "Deposit", completed: true, amount: 50000 },
              { label: "Financing", completed: false, amount: 40000 }
            ]
          },
          {
            id: "apt-1708",
            unitNumber: "Apt 1708",
            status: "available",
            listPrice: 1150000,
            salePrice: null,
            totalReceived: null,
            buyer: createBuyer(),
            contract: createContract(),
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

export const createProperty = ({ name, location, type, usesPhases }) => {
  if (!name || !location || !type) {
    throw httpError("Name, location, and type are required.");
  }

  if (!PROPERTY_TYPES.includes(type)) {
    throw httpError(`Invalid property type. Valid options: ${PROPERTY_TYPES.join(", ")}`);
  }

  const normalizedName = sanitizeText(name);
  const normalizedLocation = sanitizeText(location);
  if (!normalizedName || !normalizedLocation) {
    throw httpError("Name and location are required.");
  }

  let normalizedUsesPhases = Boolean(usesPhases);
  if (type === "villa") {
    normalizedUsesPhases = false;
  }

  const newProperty = {
    id: createId("prop"),
    name: normalizedName,
    location: normalizedLocation,
    type,
    usesPhases: normalizedUsesPhases,
    phases: normalizedUsesPhases ? [] : [createDefaultPhase()]
  };

  propertyStore.push(newProperty);
  return newProperty;
};

export const addUnitToProperty = (
  propertyId,
  { unitNumber, status, phaseName, listPrice, salePrice, totalReceived, buyer, contract }
) => {
  const property = findPropertyById(propertyId);

  if (!property) {
    throw httpError("Property not found.", 404);
  }

  const normalizedUnitNumber = sanitizeText(unitNumber);
  if (!normalizedUnitNumber) {
    throw httpError("Unit number is required.");
  }

  if (!status) {
    throw httpError("Status is required.");
  }

  if (!UNIT_STATUS_VALUES.includes(status)) {
    throw httpError(`Invalid unit status. Valid options: ${UNIT_STATUS_VALUES.join(", ")}`);
  }

  const phase = getPhaseForProperty(property, phaseName);
  const newUnit = {
    id: createId("unit"),
    unitNumber: normalizedUnitNumber,
    status,
    listPrice: asNumberOrNull(listPrice),
    salePrice: asNumberOrNull(salePrice),
    totalReceived: asNumberOrNull(totalReceived),
    buyer: createBuyer(buyer),
    contract: createContract(contract),
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

  if (!propertyHasPhases(property)) {
    throw httpError("This property does not use phases.");
  }

  if (!Array.isArray(property.phases)) {
    property.phases = [];
  }

  const normalizedPhaseName = sanitizeText(phaseName);
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
      if (
        Object.prototype.hasOwnProperty.call(updates, "unitNumber") ||
        Object.prototype.hasOwnProperty.call(updates, "label")
      ) {
        const nextUnitNumber = sanitizeText(
          Object.prototype.hasOwnProperty.call(updates, "unitNumber") ? updates.unitNumber : updates.label
        );
        if (!nextUnitNumber) {
          throw httpError("Unit number is required.");
        }
        unit.unitNumber = nextUnitNumber;
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
      if (Object.prototype.hasOwnProperty.call(updates, "buyer")) {
        unit.buyer = createBuyer(updates.buyer, unit.buyer || {});
      }
      if (Object.prototype.hasOwnProperty.call(updates, "contract")) {
        unit.contract = createContract(updates.contract, unit.contract || {});
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
