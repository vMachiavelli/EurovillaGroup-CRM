import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const PROPERTY_TYPES = [
  { value: "semi_detached", label: "Semi-detached" },
  { value: "villa", label: "Villa" },
  { value: "apartment", label: "Apartment" }
];

const STATUS_LABELS = {
  available: "Available",
  deposit: "Deposit Received",
  under_contract: "Under Contract",
  signed_contract: "Signed Contract",
  sold: "Sold"
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label
}));

const STATUS_COLORS = {
  available: "neutral",
  deposit: "info",
  under_contract: "warning",
  signed_contract: "accent",
  sold: "success"
};

const propertyTypeSupportsPhases = (type) => type !== "villa";

const createEmptyBuyer = () => ({
  name: "",
  passportNumber: "",
  purchaseDate: "",
  initialPayment: "",
  firstPayment: "",
  secondPayment: "",
  phone: "",
  passportFile: null
});

const createEmptyContract = () => ({
  reference: "",
  telephone: "",
  documentFile: null
});

const createUnitFormState = () => ({
  unitNumber: "",
  status: STATUS_OPTIONS[0].value,
  listPrice: "",
  salePrice: "",
  totalReceived: "",
  buyer: createEmptyBuyer(),
  contract: createEmptyContract()
});

const numericOrNull = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const convertFileToPayload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64Data = ""] = result.split(",");
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64Data
      });
    };
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });

const formatFileSize = (size) => {
  if (typeof size !== "number" || Number.isNaN(size)) {
    return null;
  }
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${size} B`;
};

const buildFileDataUrl = (file) => {
  if (!file?.data) {
    return null;
  }
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${file.data}`;
};

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] ?? "neutral";
  return <span className={`status-badge status-${color}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function PropertyTypeBadge({ type }) {
  const label = PROPERTY_TYPES.find((option) => option.value === type)?.label ?? type;
  return type ? <span className="type-badge">{label}</span> : null;
}

function App() {
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertyFormError, setPropertyFormError] = useState("");
  const [unitFormError, setUnitFormError] = useState("");
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    location: "",
    type: PROPERTY_TYPES[0].value,
    usesPhases: propertyTypeSupportsPhases(PROPERTY_TYPES[0].value)
  });
  const [unitForm, setUnitForm] = useState(() => createUnitFormState());
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name: "" });
  const [editUnitForm, setEditUnitForm] = useState(() => createUnitFormState());
  const [milestoneForm, setMilestoneForm] = useState({ label: "", amount: "" });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState(1);

  const processFileInput = async (event, setter) => {
    const file = event.target.files?.[0];
    if (!file) {
      setter(null);
      event.target.value = "";
      return;
    }
    try {
      const payload = await convertFileToPayload(file);
      setter(payload);
    } catch (err) {
      console.error(err);
      setUnitFormError("Unable to process the selected file. Please try again.");
    } finally {
      event.target.value = "";
    }
  };

  const applyUnitFormPassportFile = (filePayload) =>
    setUnitForm((prev) => ({
      ...prev,
      buyer: { ...prev.buyer, passportFile: filePayload }
    }));

  const applyUnitFormContractFile = (filePayload) =>
    setUnitForm((prev) => ({
      ...prev,
      contract: { ...prev.contract, documentFile: filePayload }
    }));

  const applyEditPassportFile = (filePayload) =>
    setEditUnitForm((prev) => ({
      ...prev,
      buyer: { ...prev.buyer, passportFile: filePayload }
    }));

  const applyEditContractFile = (filePayload) =>
    setEditUnitForm((prev) => ({
      ...prev,
      contract: { ...prev.contract, documentFile: filePayload }
    }));

  const fetchProperties = useCallback(async (nextSelectedId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/api/properties`);
      if (!response.ok) {
        throw new Error("Unable to load properties");
      }
      const payload = await response.json();
      const list = payload.data ?? [];
      setProperties(list);
      setSelectedPropertyId((current) => {
        if (nextSelectedId) {
          return nextSelectedId;
        }
        if (current && list.some((property) => property.id === current)) {
          return current;
        }
        return list[0]?.id ?? null;
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === selectedPropertyId),
    [properties, selectedPropertyId]
  );

  useEffect(() => {
    if (!selectedProperty) {
      setSelectedPhaseId(null);
      return;
    }

    setSelectedPhaseId((current) => {
      if (current && selectedProperty.phases?.some((phase) => phase.id === current)) {
        return current;
      }
      return selectedProperty.phases?.[0]?.id ?? null;
    });
  }, [selectedProperty]);

  useEffect(() => {
    setSelectedUnit(null);
    setShowUnitForm(false);
    setUnitForm(createUnitFormState());
  }, [selectedPhaseId]);

  const selectedPhase = useMemo(
    () => selectedProperty?.phases?.find((phase) => phase.id === selectedPhaseId) ?? null,
    [selectedProperty, selectedPhaseId]
  );

  const activeUnit = useMemo(
    () =>
      selectedPhase?.units
        ?.map((unit) => ({ phase: selectedPhase, unit }))
        ?.find(({ unit }) => unit.id === selectedUnit) ?? null,
    [selectedPhase, selectedUnit]
  );

  const passportFileUrl = activeUnit?.unit ? buildFileDataUrl(activeUnit.unit.buyer?.passportFile) : null;
  const contractFileUrl = activeUnit?.unit ? buildFileDataUrl(activeUnit.unit.contract?.documentFile) : null;

  const mapUnitToFormState = (unit) => ({
    unitNumber: unit?.unitNumber ?? "",
    status: unit?.status ?? STATUS_OPTIONS[0].value,
    listPrice: typeof unit?.listPrice === "number" ? unit.listPrice.toString() : "",
    salePrice: typeof unit?.salePrice === "number" ? unit.salePrice.toString() : "",
    totalReceived: typeof unit?.totalReceived === "number" ? unit.totalReceived.toString() : "",
    buyer: {
      name: unit?.buyer?.name ?? "",
      passportNumber: unit?.buyer?.passportNumber ?? "",
      purchaseDate: unit?.buyer?.purchaseDate ?? "",
      initialPayment:
        typeof unit?.buyer?.initialPayment === "number" ? unit?.buyer?.initialPayment.toString() : "",
      firstPayment:
        typeof unit?.buyer?.firstPayment === "number" ? unit?.buyer?.firstPayment.toString() : "",
      secondPayment:
        typeof unit?.buyer?.secondPayment === "number" ? unit?.buyer?.secondPayment.toString() : "",
      phone: unit?.buyer?.phone ?? "",
      passportFile: unit?.buyer?.passportFile ?? null
    },
    contract: {
      reference: unit?.contract?.reference ?? "",
      telephone: unit?.contract?.telephone ?? "",
      documentFile: unit?.contract?.documentFile ?? null
    }
  });

  const propertyUsesPhases = selectedProperty ? selectedProperty.usesPhases !== false : true;
  const totalUnits =
    selectedProperty?.phases?.reduce((count, phase) => count + (phase.units?.length ?? 0), 0) ?? 0;
  const unitTabId = propertyUsesPhases ? 3 : 2;

  const tabData = propertyUsesPhases
    ? [
        {
          id: 1,
          title: "Properties",
          description: selectedProperty ? selectedProperty.name : "Pick a property",
          enabled: true
        },
        {
          id: 2,
          title: "Phases",
          description: selectedProperty ? `${selectedProperty.phases?.length ?? 0} phases` : "Select a property",
          enabled: Boolean(selectedProperty)
        },
        {
          id: 3,
          title: "Phase units",
          description: selectedPhase ? `${selectedPhase.units?.length ?? 0} units` : "Choose a phase",
          enabled: Boolean(selectedPhase)
        }
      ]
    : [
        {
          id: 1,
          title: "Properties",
          description: selectedProperty ? selectedProperty.name : "Pick a property",
          enabled: true
        },
        {
          id: 2,
          title: "Units",
          description: selectedProperty ? `${totalUnits} units` : "Select a property",
          enabled: Boolean(selectedProperty)
        }
      ];

  const mainGridStyle = {};
  const propertyPanelClass = `properties-panel ${activeTab === 1 ? "panel-active" : "panel-active expanding-panel"}`;
  const phasePanelClass = `phase-panel panel-hidden`;
  const detailPanelClass = `details-panel panel-hidden`;

  const panelTabProps = (tabId, enabled = true) => {
    if (activeTab === tabId || !enabled) {
      return {};
    }
    return {
      role: "button",
      tabIndex: 0,
      onClick: () => setActiveTab(tabId),
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
          event.preventDefault();
          setActiveTab(tabId);
        }
      }
    };
  };

  useEffect(() => {
    if (!selectedProperty) {
      setActiveTab(1);
    }
    setShowPropertyForm(false);
    setShowPhaseForm(false);
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty && propertyUsesPhases && !selectedPhase) {
      setActiveTab(2);
    }
    setShowUnitForm(false);
    setShowPhaseForm(false);
  }, [selectedProperty, selectedPhase, propertyUsesPhases]);

  useEffect(() => {
    if (selectedProperty && !propertyUsesPhases && activeTab === 3) {
      setActiveTab(2);
    }
  }, [selectedProperty, propertyUsesPhases, activeTab]);

  useEffect(() => {
    if (activeTab !== unitTabId && showEditForm) {
      setShowEditForm(false);
    }
  }, [activeTab, unitTabId, showEditForm]);

  useEffect(() => {
    if (activeUnit) {
      setEditUnitForm(mapUnitToFormState(activeUnit.unit));
      setMilestoneForm({ label: "", amount: "" });
      setShowMilestoneForm(false);
      setShowEditForm(false);
    }
  }, [activeUnit]);

  const handlePropertySubmit = async (event) => {
    event.preventDefault();
    setPropertyFormError("");
    try {
      const response = await fetch(`${API_BASE}/api/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: propertyForm.name,
          location: propertyForm.location,
          type: propertyForm.type,
          usesPhases: propertyTypeSupportsPhases(propertyForm.type) ? propertyForm.usesPhases : false
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add property");
      }
      const defaultType = PROPERTY_TYPES[0].value;
      setPropertyForm({
        name: "",
        location: "",
        type: defaultType,
        usesPhases: propertyTypeSupportsPhases(defaultType)
      });
      setSelectedUnit(null);
      await fetchProperties(payload.data?.id);
      setShowPropertyForm(false);
    } catch (err) {
      setPropertyFormError(err.message);
    }
  };

  const handleUnitSubmit = async (event) => {
    event.preventDefault();
    setUnitFormError("");

    if (!selectedPropertyId) {
      setUnitFormError("Select a property first.");
      return;
    }

    if (propertyUsesPhases && !selectedPhase) {
      setUnitFormError("Select a phase first.");
      return;
    }

    try {
      const payloadBody = {
        unitNumber: unitForm.unitNumber,
        status: unitForm.status,
        listPrice: numericOrNull(unitForm.listPrice),
        salePrice: numericOrNull(unitForm.salePrice),
        totalReceived: numericOrNull(unitForm.totalReceived),
        buyer: {
          name: unitForm.buyer.name,
          passportNumber: unitForm.buyer.passportNumber,
          purchaseDate: unitForm.buyer.purchaseDate,
          initialPayment: numericOrNull(unitForm.buyer.initialPayment),
          firstPayment: numericOrNull(unitForm.buyer.firstPayment),
          secondPayment: numericOrNull(unitForm.buyer.secondPayment),
          phone: unitForm.buyer.phone,
          passportFile: unitForm.buyer.passportFile
        },
        contract: {
          reference: unitForm.contract.reference,
          telephone: unitForm.contract.telephone,
          documentFile: unitForm.contract.documentFile
        }
      };

      if (propertyUsesPhases && selectedPhase?.name) {
        payloadBody.phaseName = selectedPhase.name;
      }

      const response = await fetch(`${API_BASE}/api/properties/${selectedPropertyId}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payloadBody)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add unit");
      }
      setUnitForm(createUnitFormState());
      await fetchProperties(selectedPropertyId);
      const nextPhaseId = payload.data?.phase?.id ?? selectedPhaseId;
      if (nextPhaseId) {
        setSelectedPhaseId(nextPhaseId);
      }
      setSelectedUnit(payload.data?.unit?.id ?? null);
      setActiveTab(propertyUsesPhases ? 3 : 2);
      setShowUnitForm(false);
    } catch (err) {
      setUnitFormError(err.message);
    }
  };

  const handlePhaseSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPropertyId) {
      return;
    }
    const name = phaseForm.name.trim();
    if (!name) {
      return;
    }

    try {
      setUnitFormError("");
      const response = await fetch(`${API_BASE}/api/properties/${selectedPropertyId}/phases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add phase");
      }
      const newPhase = payload.data?.phase;
      setPhaseForm({ name: "" });
      setShowPhaseForm(false);
      await fetchProperties(selectedPropertyId);
      if (newPhase?.id) {
        setSelectedPhaseId(newPhase.id);
                          setActiveTab(unitTabId);
      }
    } catch (err) {
      setUnitFormError(err.message);
    }
  };

  const handleUnitEditSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPropertyId || !selectedUnit) return;

    try {
      setUnitFormError("");
      const payloadBody = {
        unitNumber: editUnitForm.unitNumber,
        status: editUnitForm.status,
        listPrice: numericOrNull(editUnitForm.listPrice),
        salePrice: numericOrNull(editUnitForm.salePrice),
        totalReceived: numericOrNull(editUnitForm.totalReceived),
        buyer: {
          name: editUnitForm.buyer.name,
          passportNumber: editUnitForm.buyer.passportNumber,
          purchaseDate: editUnitForm.buyer.purchaseDate,
          initialPayment: numericOrNull(editUnitForm.buyer.initialPayment),
          firstPayment: numericOrNull(editUnitForm.buyer.firstPayment),
          secondPayment: numericOrNull(editUnitForm.buyer.secondPayment),
          phone: editUnitForm.buyer.phone,
          passportFile: editUnitForm.buyer.passportFile
        },
        contract: {
          reference: editUnitForm.contract.reference,
          telephone: editUnitForm.contract.telephone,
          documentFile: editUnitForm.contract.documentFile
        }
      };

      const response = await fetch(
        `${API_BASE}/api/properties/${selectedPropertyId}/units/${selectedUnit}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payloadBody)
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update unit");
      }
      await fetchProperties(selectedPropertyId);
      setShowEditForm(false);
    } catch (err) {
      setUnitFormError(err.message);
    }
  };

  const handlePropertyDelete = async (propertyId) => {
    const confirmed = window.confirm("Are you sure you want to delete this property?");
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/properties/${propertyId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to delete property");
      }

      setSelectedUnit(null);
      await fetchProperties();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnitDelete = async (unitId) => {
    if (!selectedPropertyId) {
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this unit?");
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(
        `${API_BASE}/api/properties/${selectedPropertyId}/units/${unitId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to delete unit");
      }

      setSelectedUnit((current) => (current === unitId ? null : current));
      await fetchProperties(selectedPropertyId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMilestoneToggle = async (milestone) => {
    if (!selectedPropertyId || !activeUnit?.unit?.id) return;
    try {
      setUnitFormError("");
      const response = await fetch(
        `${API_BASE}/api/properties/${selectedPropertyId}/units/${activeUnit.unit.id}/milestones`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ label: milestone.label, completed: !milestone.completed })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update milestone");
      }
      await fetchProperties(selectedPropertyId);
      setSelectedUnit(activeUnit.unit.id);
    } catch (err) {
      setUnitFormError(err.message);
    }
  };

  const handleMilestoneSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPropertyId || !activeUnit?.unit?.id) return;
    const label = milestoneForm.label.trim();
    if (!label) {
      setUnitFormError("Milestone label is required.");
      return;
    }
    try {
      setUnitFormError("");
      const response = await fetch(
        `${API_BASE}/api/properties/${selectedPropertyId}/units/${activeUnit.unit.id}/milestones`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            label,
            amount: milestoneForm.amount ? Number(milestoneForm.amount) : null
          })
        }
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add milestone");
      }
      setMilestoneForm({ label: "", amount: "" });
      setShowMilestoneForm(false);
      await fetchProperties(selectedPropertyId);
      setSelectedUnit(activeUnit.unit.id);
    } catch (err) {
      setUnitFormError(err.message);
    }
  };

  return (
    <div className="app-shell">
      <div className="selection-tabs" role="tablist" aria-label="Selection steps">
        {tabData.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`selection-tab ${activeTab === tab.id ? "active" : ""} ${
              !tab.enabled ? "disabled" : ""
            }`}
            aria-selected={activeTab === tab.id}
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            disabled={!tab.enabled}
          >
            <span className="selection-tab-label">{tab.title}</span>
            <span className="selection-tab-detail">{tab.description}</span>
          </button>
        ))}
      </div>

      <main className="main-grid" style={mainGridStyle}>
        <section key={activeTab} className={`${propertyPanelClass} panel-grow`}>
          <div
            key={`${activeTab}-${selectedPhaseId ?? "none"}`}
            className={`panel-content panel-step ${
              activeTab === 1 ? "property-enter" : activeTab === 2 ? "phase-enter" : "unit-enter"
            }`}
          >
            {activeTab === 1 && (
              <>
                <div className="panel-header">
                  <h2>Properties</h2>
                  {loading && <span className="pill">Loading…</span>}
                </div>
                {error && <p className="error">{error}</p>}
                <ul className="property-list">
                  {properties.map((property) => (
                    <li key={property.id}>
                      <button
                        type="button"
                        className={property.id === selectedPropertyId ? "property active" : "property"}
                        onClick={() => {
                          setSelectedPropertyId(property.id);
                          setSelectedUnit(null);
                          setActiveTab(2);
                        }}
                      >
                        <span
                          className="delete-icon property-delete-icon"
                          role="button"
                          aria-label={`Delete ${property.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handlePropertyDelete(property.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                              event.preventDefault();
                              event.stopPropagation();
                              void handlePropertyDelete(property.id);
                            }
                          }}
                          tabIndex={0}
                        >
                          ×
                        </span>
                        <p className="eyebrow">#{property.id}</p>
                        <p className="property-name">{property.name}</p>
                        <div className="property-line">
                          <p className="property-meta">{property.location}</p>
                          <PropertyTypeBadge type={property.type} />
                        </div>
                      </button>
                    </li>
                  ))}
                  {!properties.length && !loading && <p>No properties yet.</p>}
                </ul>

                <div className="inline-form-wrapper">
                  {showPropertyForm ? (
                    <article className="form-card inline-form">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">New record</p>
                          <h3>Add property</h3>
                        </div>
                      </div>
                      <form onSubmit={handlePropertySubmit} className="stacked-form">
                        <label>
                          <span>Name</span>
                          <input
                            type="text"
                            value={propertyForm.name}
                            onChange={(event) =>
                              setPropertyForm((prev) => ({ ...prev, name: event.target.value }))
                            }
                            placeholder="e.g., East Village Row"
                            required
                          />
                        </label>
                        <label>
                          <span>Location</span>
                          <input
                            type="text"
                            value={propertyForm.location}
                            onChange={(event) =>
                              setPropertyForm((prev) => ({ ...prev, location: event.target.value }))
                            }
                            placeholder="City, State"
                            required
                          />
                        </label>
                        <label>
                          <span>Type</span>
                          <select
                            value={propertyForm.type}
                            onChange={(event) => {
                              const nextType = event.target.value;
                              setPropertyForm((prev) => {
                                const supportsNextType = propertyTypeSupportsPhases(nextType);
                                const supportsPreviousType = propertyTypeSupportsPhases(prev.type);
                                const nextUsesPhases = supportsNextType
                                  ? supportsPreviousType
                                    ? prev.usesPhases
                                    : true
                                  : false;
                                return {
                                  ...prev,
                                  type: nextType,
                                  usesPhases: nextUsesPhases
                                };
                              });
                            }}
                          >
                            {PROPERTY_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="checkbox-field">
                          <span>Track this property with phases</span>
                          <div className="checkbox-input">
                            <input
                              type="checkbox"
                              id="property-uses-phases"
                              checked={propertyForm.usesPhases}
                              onChange={(event) =>
                                setPropertyForm((prev) => ({ ...prev, usesPhases: event.target.checked }))
                              }
                              disabled={!propertyTypeSupportsPhases(propertyForm.type)}
                            />
                            <span>{propertyForm.usesPhases ? "Phases enabled" : "Single inventory"}</span>
                          </div>
                          {!propertyTypeSupportsPhases(propertyForm.type) && (
                            <span className="property-meta">Villas are tracked without phases.</span>
                          )}
                        </label>
                        {propertyFormError && <p className="form-error">{propertyFormError}</p>}
                        <div className="form-actions">
                          <button type="button" className="ghost-btn" onClick={() => setShowPropertyForm(false)}>
                            Cancel
                          </button>
                          <button type="submit" className="primary-btn">
                            Save property
                          </button>
                        </div>
                      </form>
                    </article>
                  ) : (
                    <button className="floating-btn" type="button" onClick={() => setShowPropertyForm(true)}>
                      +
                      <span className="sr-only">Add property</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {propertyUsesPhases && activeTab === 2 && (
              <>
                <div className="panel-header">
                  <h2>Phases</h2>
                </div>
            {selectedProperty ? (
              selectedProperty.phases?.length ? (
                <div className="phase-tabs">
                  {selectedProperty.phases.map((phase) => (
                    <button
                          key={phase.id}
                          type="button"
                          className={`phase-tab ${phase.id === selectedPhaseId ? "active" : ""}`}
                          onClick={() => {
                            setSelectedPhaseId(phase.id);
                            setActiveTab(unitTabId);
                          }}
                    >
                      <span>{phase.name}</span>
                      <span className="eyebrow">{phase.units?.length ?? 0} units</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="property-meta">This property has no phases yet.</p>
              )
            ) : (
              <p className="property-meta">Select a property to view its phases.</p>
            )}

                <div className="inline-form-wrapper">
                  {showPhaseForm ? (
                    <article className="form-card inline-form">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">New record</p>
                          <h3>Add phase</h3>
                        </div>
                      </div>
                      <form onSubmit={handlePhaseSubmit} className="stacked-form">
                        <label>
                          <span>Phase name</span>
                          <input
                            type="text"
                            value={phaseForm.name}
                            onChange={(event) => setPhaseForm({ name: event.target.value })}
                            placeholder="e.g., Tower B"
                            required
                          />
                        </label>
                        {unitFormError && <p className="form-error">{unitFormError}</p>}
                        <div className="form-actions">
                          <button type="button" className="ghost-btn" onClick={() => setShowPhaseForm(false)}>
                            Cancel
                          </button>
                          <button type="submit" className="primary-btn" disabled={!selectedPropertyId}>
                            {selectedPropertyId ? "Save phase" : "Select a property first"}
                          </button>
                        </div>
                      </form>
                    </article>
                  ) : (
                    <button
                      className="floating-btn"
                      type="button"
                      onClick={() => setShowPhaseForm(true)}
                      disabled={!selectedPropertyId}
                    >
                      +
                      <span className="sr-only">Add phase</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {((propertyUsesPhases && activeTab === 3) || (!propertyUsesPhases && activeTab === 2)) && (
              <>
                <div className="panel-header">
                  <div className="active-property-header">
                    <p className="inline-eyebrow">
                      Active Property:
                      <span className="eyebrow-value">{selectedProperty?.name ?? "None selected"}</span>
                    </p>
                    <div className="property-line compact">
                      <p className="property-meta">{selectedProperty?.location}</p>
                      <PropertyTypeBadge type={selectedProperty?.type} />
                      {!propertyUsesPhases && <span className="pill">No phases</span>}
                    </div>
                  </div>
                </div>
            {selectedPhase ? (
              <div className="phases">
                <article key={selectedPhase.id} className="phase-card">
                  <div className="phase-card-header">
                    <h3>{selectedPhase.name}</h3>
                    <p className="property-meta">{selectedPhase.units?.length ?? 0} units</p>
                  </div>
                  <table className="units-table">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>List price</th>
                        <th>Sale price</th>
                        <th>Received</th>
                        <th>Status</th>
                        <th>Milestones</th>
                        <th aria-label="Actions"></th>
                      </tr>
                    </thead>
                        <tbody>
                          {selectedPhase.units?.map((unit) => (
                        <tr
                          key={unit.id}
                          className={selectedUnit === unit.id ? "active-row" : undefined}
                          onClick={() => setSelectedUnit((current) => (current === unit.id ? null : unit.id))}
                        >
                          <td>
                            <p className="unit-name">{unit.unitNumber}</p>
                            <p className="unit-subtext">
                              {unit.buyer?.name ? unit.buyer.name : "No buyer assigned"}
                            </p>
                            {unit.buyer?.passportNumber && (
                              <p className="unit-subtext">Passport: {unit.buyer.passportNumber}</p>
                            )}
                            {unit.buyer?.phone && <p className="unit-subtext">Phone: {unit.buyer.phone}</p>}
                            {unit.contract?.reference && (
                              <p className="unit-subtext">Contract: {unit.contract.reference}</p>
                            )}
                          </td>
                          <td>
                            {typeof unit.listPrice === "number" ? (
                              <span className="property-meta">${unit.listPrice.toLocaleString()}</span>
                            ) : (
                              <span className="property-meta">-</span>
                            )}
                          </td>
                          <td>
                            {typeof unit.salePrice === "number" ? (
                              <span className="property-meta">${unit.salePrice.toLocaleString()}</span>
                            ) : (
                              <span className="property-meta">-</span>
                            )}
                          </td>
                          <td>
                            {typeof unit.totalReceived === "number" ? (
                              <span className="property-meta">${unit.totalReceived.toLocaleString()}</span>
                            ) : (
                              <span className="property-meta">-</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={unit.status} />
                          </td>
                              <td>
                                {unit.milestones?.length ? (
                                  <div className="milestones">
                                    {unit.milestones.map((milestone) => (
                                      <span
                                        key={milestone.label}
                                        className={
                                          milestone.completed ? "milestone milestone-complete" : "milestone"
                                        }
                                      >
                                        {milestone.label}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="property-meta">No milestones yet</span>
                                )}
                              </td>
                              <td className="unit-action-cell">
                                <span
                                  className="delete-icon unit-delete-icon"
                                  role="button"
                                  aria-label={`Delete ${unit.unitNumber}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleUnitDelete(unit.id);
                                  }}
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === "Enter" ||
                                      event.key === " " ||
                                      event.key === "Spacebar"
                                    ) {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void handleUnitDelete(unit.id);
                                    }
                                  }}
                                  tabIndex={0}
                                >
                                  ×
                                </span>
                              </td>
                            </tr>
                          ))}
                          {!selectedPhase.units?.length && (
                            <tr>
                              <td colSpan={7} className="property-meta">
                                No units in this phase yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </article>
                    <div className="inline-form-wrapper">
                      {showUnitForm ? (
                    <article className="form-card inline-form">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">New record</p>
                          <h3>Add unit</h3>
                            </div>
                          </div>
                          <form onSubmit={handleUnitSubmit} className="stacked-form">
                            <label>
                          <span>Unit number</span>
                          <input
                            type="text"
                            value={unitForm.unitNumber}
                            onChange={(event) =>
                              setUnitForm((prev) => ({ ...prev, unitNumber: event.target.value }))
                            }
                            placeholder="e.g., Villa 8"
                            required
                          />
                        </label>
                        <label>
                          <span>List price</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={unitForm.listPrice}
                            onChange={(event) => setUnitForm((prev) => ({ ...prev, listPrice: event.target.value }))}
                            placeholder="e.g., 850000"
                          />
                        </label>
                        <label>
                          <span>Sale price</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={unitForm.salePrice}
                            onChange={(event) => setUnitForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                            placeholder="e.g., 810000"
                          />
                        </label>
                        <label>
                          <span>Total received</span>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={unitForm.totalReceived}
                            onChange={(event) =>
                              setUnitForm((prev) => ({ ...prev, totalReceived: event.target.value }))
                            }
                            placeholder="e.g., 120000"
                          />
                        </label>
                            <label>
                              <span>Status</span>
                              <select
                                value={unitForm.status}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({ ...prev, status: event.target.value }))
                                }
                              >
                                {STATUS_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                        <div className="form-divider">
                          <p className="eyebrow">Buyer</p>
                          <div className="form-grid">
                            <label>
                              <span>Buyer name</span>
                              <input
                                type="text"
                                value={unitForm.buyer.name}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, name: event.target.value }
                                  }))
                                }
                                placeholder="e.g., Maria Lopez"
                              />
                            </label>
                            <label>
                              <span>Passport number</span>
                              <input
                                type="text"
                                value={unitForm.buyer.passportNumber}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, passportNumber: event.target.value }
                                  }))
                                }
                                placeholder="e.g., A1234567"
                              />
                            </label>
                            <label>
                              <span>Purchase date</span>
                              <input
                                type="date"
                                value={unitForm.buyer.purchaseDate}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, purchaseDate: event.target.value }
                                  }))
                                }
                              />
                            </label>
                            <label>
                              <span>Phone number</span>
                              <input
                                type="tel"
                                value={unitForm.buyer.phone}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, phone: event.target.value }
                                  }))
                                }
                                placeholder="+971500000000"
                              />
                            </label>
                            <label>
                              <span>Initial payment</span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={unitForm.buyer.initialPayment}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, initialPayment: event.target.value }
                                  }))
                                }
                                placeholder="e.g., 50000"
                              />
                            </label>
                            <label>
                              <span>First payment</span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={unitForm.buyer.firstPayment}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, firstPayment: event.target.value }
                                  }))
                                }
                                placeholder="e.g., 30000"
                              />
                            </label>
                            <label>
                              <span>Second payment</span>
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={unitForm.buyer.secondPayment}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    buyer: { ...prev.buyer, secondPayment: event.target.value }
                                  }))
                                }
                                placeholder="e.g., 20000"
                              />
                            </label>
                          </div>
                          <div className="file-field">
                            <span>Passport document</span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={(event) => processFileInput(event, applyUnitFormPassportFile)}
                            />
                            <p className="file-meta">
                              {unitForm.buyer.passportFile?.name
                                ? `Uploaded: ${unitForm.buyer.passportFile.name}${
                                    unitForm.buyer.passportFile.size
                                      ? ` (${formatFileSize(unitForm.buyer.passportFile.size)})`
                                      : ""
                                  }`
                                : "Attach a PDF or image of the passport."}
                            </p>
                            {unitForm.buyer.passportFile && (
                              <button
                                type="button"
                                className="file-remove-btn"
                                onClick={() => applyUnitFormPassportFile(null)}
                              >
                                Remove file
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="form-divider">
                          <p className="eyebrow">Contract</p>
                          <div className="form-grid">
                            <label>
                              <span>Contract reference</span>
                              <input
                                type="text"
                                value={unitForm.contract.reference}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    contract: { ...prev.contract, reference: event.target.value }
                                  }))
                                }
                                placeholder="e.g., CT-0091"
                              />
                            </label>
                            <label>
                              <span>Telephone</span>
                              <input
                                type="tel"
                                value={unitForm.contract.telephone}
                                onChange={(event) =>
                                  setUnitForm((prev) => ({
                                    ...prev,
                                    contract: { ...prev.contract, telephone: event.target.value }
                                  }))
                                }
                                placeholder="+9714000000"
                              />
                            </label>
                          </div>
                          <div className="file-field">
                            <span>Signed contract</span>
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={(event) => processFileInput(event, applyUnitFormContractFile)}
                            />
                            <p className="file-meta">
                              {unitForm.contract.documentFile?.name
                                ? `Uploaded: ${unitForm.contract.documentFile.name}${
                                    unitForm.contract.documentFile.size
                                      ? ` (${formatFileSize(unitForm.contract.documentFile.size)})`
                                      : ""
                                  }`
                                : "Upload the executed contract (PDF or image)."}
                            </p>
                            {unitForm.contract.documentFile && (
                              <button
                                type="button"
                                className="file-remove-btn"
                                onClick={() => applyUnitFormContractFile(null)}
                              >
                                Remove file
                              </button>
                            )}
                          </div>
                        </div>
                            {unitFormError && <p className="form-error">{unitFormError}</p>}
                            <div className="form-actions">
                              <button type="button" className="ghost-btn" onClick={() => setShowUnitForm(false)}>
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="primary-btn"
                                disabled={!selectedPropertyId || (propertyUsesPhases && !selectedPhase)}
                              >
                                {!selectedPropertyId
                                  ? "Select a property first"
                                  : propertyUsesPhases && !selectedPhase
                                  ? "Select a phase first"
                                  : "Save unit"}
                              </button>
                            </div>
                          </form>
                        </article>
                      ) : (
                        <button
                          className="floating-btn"
                          type="button"
                          onClick={() => setShowUnitForm(true)}
                          disabled={!selectedPropertyId || (propertyUsesPhases && !selectedPhase)}
                        >
                          +
                          <span className="sr-only">Add unit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="property-meta">
                    {propertyUsesPhases ? "Select a phase to view its units." : "No units captured for this property yet."}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

      </main>

      {activeUnit && (
        <section className="drawer">
          <div className="drawer-header-row">
            <div>
              <p className="eyebrow">Unit detail</p>
              <h3>{activeUnit.unit.unitNumber}</h3>
            </div>
            <div className="drawer-actions">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setShowEditForm((v) => !v)}
                disabled={activeTab !== unitTabId}
              >
                {showEditForm ? "Close edit" : "Edit unit"}
              </button>
            </div>
          </div>
          <p className="property-meta">
            {selectedProperty?.name} • {activeUnit.phase.name}
          </p>
          <StatusBadge status={activeUnit.unit.status} />
          <div className="detail-grid">
            <article className="detail-card">
              <p className="eyebrow">Buyer</p>
              <dl className="detail-list">
                <div>
                  <dt>Name</dt>
                  <dd>{activeUnit.unit.buyer?.name || "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Passport</dt>
                  <dd>{activeUnit.unit.buyer?.passportNumber || "—"}</dd>
                </div>
                <div>
                  <dt>Purchase date</dt>
                  <dd>{activeUnit.unit.buyer?.purchaseDate || "—"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{activeUnit.unit.buyer?.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Initial payment</dt>
                  <dd>
                    {typeof activeUnit.unit.buyer?.initialPayment === "number"
                      ? `$${activeUnit.unit.buyer.initialPayment.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>First payment</dt>
                  <dd>
                    {typeof activeUnit.unit.buyer?.firstPayment === "number"
                      ? `$${activeUnit.unit.buyer.firstPayment.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Second payment</dt>
                  <dd>
                    {typeof activeUnit.unit.buyer?.secondPayment === "number"
                      ? `$${activeUnit.unit.buyer.secondPayment.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Passport file</dt>
                  <dd>
                    {passportFileUrl ? (
                      <>
                        <a
                          className="file-link"
                          href={passportFileUrl}
                          download={activeUnit.unit.buyer?.passportFile?.name || "passport"}
                        >
                          Download {activeUnit.unit.buyer?.passportFile?.name || "passport"}
                        </a>
                        {typeof activeUnit.unit.buyer?.passportFile?.size === "number" && (
                          <span className="file-meta-inline">
                            ({formatFileSize(activeUnit.unit.buyer.passportFile.size)})
                          </span>
                        )}
                      </>
                    ) : (
                      "No file uploaded"
                    )}
                  </dd>
                </div>
              </dl>
            </article>
            <article className="detail-card">
              <p className="eyebrow">Contract</p>
              <dl className="detail-list">
                <div>
                  <dt>Reference</dt>
                  <dd>{activeUnit.unit.contract?.reference || "—"}</dd>
                </div>
                <div>
                  <dt>Telephone</dt>
                  <dd>{activeUnit.unit.contract?.telephone || "—"}</dd>
                </div>
                <div>
                  <dt>List price</dt>
                  <dd>
                    {typeof activeUnit.unit.listPrice === "number"
                      ? `$${activeUnit.unit.listPrice.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Sale price</dt>
                  <dd>
                    {typeof activeUnit.unit.salePrice === "number"
                      ? `$${activeUnit.unit.salePrice.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Total received</dt>
                  <dd>
                    {typeof activeUnit.unit.totalReceived === "number"
                      ? `$${activeUnit.unit.totalReceived.toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Contract file</dt>
                  <dd>
                    {contractFileUrl ? (
                      <>
                        <a
                          className="file-link"
                          href={contractFileUrl}
                          download={activeUnit.unit.contract?.documentFile?.name || "contract"}
                        >
                          Download {activeUnit.unit.contract?.documentFile?.name || "contract"}
                        </a>
                        {typeof activeUnit.unit.contract?.documentFile?.size === "number" && (
                          <span className="file-meta-inline">
                            ({formatFileSize(activeUnit.unit.contract.documentFile.size)})
                          </span>
                        )}
                      </>
                    ) : (
                      "No file uploaded"
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          </div>
          {showEditForm && activeTab === unitTabId && (
            <article className="form-card inline-form">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Edit unit</p>
              <h3>{activeUnit.unit.unitNumber}</h3>
            </div>
          </div>
          <form onSubmit={handleUnitEditSubmit} className="stacked-form">
            <label>
              <span>Unit number</span>
              <input
                type="text"
                value={editUnitForm.unitNumber}
                onChange={(event) => setEditUnitForm((prev) => ({ ...prev, unitNumber: event.target.value }))}
                required
              />
            </label>
            <label>
              <span>List price</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={editUnitForm.listPrice}
                onChange={(event) => setEditUnitForm((prev) => ({ ...prev, listPrice: event.target.value }))}
              />
            </label>
            <label>
              <span>Sale price</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={editUnitForm.salePrice}
                onChange={(event) => setEditUnitForm((prev) => ({ ...prev, salePrice: event.target.value }))}
              />
            </label>
            <label>
              <span>Total received</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={editUnitForm.totalReceived}
                onChange={(event) =>
                  setEditUnitForm((prev) => ({ ...prev, totalReceived: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={editUnitForm.status}
                onChange={(event) => setEditUnitForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-divider">
              <p className="eyebrow">Buyer</p>
              <div className="form-grid">
                <label>
                  <span>Buyer name</span>
                  <input
                    type="text"
                    value={editUnitForm.buyer.name}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, name: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Passport number</span>
                  <input
                    type="text"
                    value={editUnitForm.buyer.passportNumber}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, passportNumber: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Purchase date</span>
                  <input
                    type="date"
                    value={editUnitForm.buyer.purchaseDate}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, purchaseDate: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Phone number</span>
                  <input
                    type="tel"
                    value={editUnitForm.buyer.phone}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, phone: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Initial payment</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editUnitForm.buyer.initialPayment}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, initialPayment: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>First payment</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editUnitForm.buyer.firstPayment}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, firstPayment: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Second payment</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={editUnitForm.buyer.secondPayment}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        buyer: { ...prev.buyer, secondPayment: event.target.value }
                      }))
                    }
                  />
                </label>
              </div>
              <div className="file-field">
                <span>Passport document</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(event) => processFileInput(event, applyEditPassportFile)}
                />
                <p className="file-meta">
                  {editUnitForm.buyer.passportFile?.name
                    ? `Uploaded: ${editUnitForm.buyer.passportFile.name}${
                        editUnitForm.buyer.passportFile.size
                          ? ` (${formatFileSize(editUnitForm.buyer.passportFile.size)})`
                          : ""
                      }`
                    : "Attach a PDF or image of the passport."}
                </p>
                {editUnitForm.buyer.passportFile && (
                  <button type="button" className="file-remove-btn" onClick={() => applyEditPassportFile(null)}>
                    Remove file
                  </button>
                )}
              </div>
            </div>
            <div className="form-divider">
              <p className="eyebrow">Contract</p>
              <div className="form-grid">
                <label>
                  <span>Contract reference</span>
                  <input
                    type="text"
                    value={editUnitForm.contract.reference}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        contract: { ...prev.contract, reference: event.target.value }
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Telephone</span>
                  <input
                    type="tel"
                    value={editUnitForm.contract.telephone}
                    onChange={(event) =>
                      setEditUnitForm((prev) => ({
                        ...prev,
                        contract: { ...prev.contract, telephone: event.target.value }
                      }))
                    }
                  />
                </label>
              </div>
              <div className="file-field">
                <span>Signed contract</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(event) => processFileInput(event, applyEditContractFile)}
                />
                <p className="file-meta">
                  {editUnitForm.contract.documentFile?.name
                    ? `Uploaded: ${editUnitForm.contract.documentFile.name}${
                        editUnitForm.contract.documentFile.size
                          ? ` (${formatFileSize(editUnitForm.contract.documentFile.size)})`
                          : ""
                      }`
                    : "Upload the executed contract (PDF or image)."}
                </p>
                {editUnitForm.contract.documentFile && (
                  <button type="button" className="file-remove-btn" onClick={() => applyEditContractFile(null)}>
                    Remove file
                  </button>
                )}
              </div>
            </div>
            {unitFormError && <p className="form-error">{unitFormError}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setShowEditForm(false);
                  setUnitFormError("");
                  setEditUnitForm(mapUnitToFormState(activeUnit.unit));
                }}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn">
                Save changes
              </button>
            </div>
          </form>
        </article>
      )}
      <div className="milestones column">
        {(activeUnit.unit.milestones ?? []).map((milestone) => (
          <div
            key={milestone.label}
            className="milestone-row"
                role="button"
                tabIndex={0}
                onClick={() => handleMilestoneToggle(milestone)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
                    event.preventDefault();
                    handleMilestoneToggle(milestone);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span>{milestone.label}</span>
                <span className={milestone.completed ? "badge-complete" : "badge-pending"}>
                  {milestone.completed ? "Complete" : "Pending"}
                </span>
                {milestone.amount && <span className="amount">${milestone.amount.toLocaleString()}</span>}
              </div>
            ))}
            {!activeUnit.unit.milestones?.length && (
              <p className="property-meta">No milestone data yet.</p>
            )}
          </div>
          {showMilestoneForm ? (
            <article className="form-card inline-form">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Add milestone</p>
                </div>
              </div>
              <form onSubmit={handleMilestoneSubmit} className="stacked-form">
                <label>
                  <span>Label</span>
                  <input
                    type="text"
                    value={milestoneForm.label}
                    onChange={(event) => setMilestoneForm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="e.g., Deposit"
                    required
                  />
                </label>
                <label>
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={milestoneForm.amount}
                    onChange={(event) => setMilestoneForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="Optional"
                  />
                </label>
                {unitFormError && <p className="form-error">{unitFormError}</p>}
                <div className="form-actions">
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setShowMilestoneForm(false);
                      setMilestoneForm({ label: "", amount: "" });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn">
                    Save milestone
                  </button>
                </div>
              </form>
            </article>
          ) : (
            <button className="floating-btn" type="button" onClick={() => setShowMilestoneForm(true)}>
              +
              <span className="sr-only">Add milestone</span>
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
