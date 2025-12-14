import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const PROPERTY_TYPES = [
  { value: "townhouse", label: "Townhouse" },
  { value: "semi_detached", label: "Semi-detached" },
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
    type: PROPERTY_TYPES[0].value
  });
  const [unitForm, setUnitForm] = useState({
    label: "",
    status: STATUS_OPTIONS[0].value,
    listPrice: "",
    salePrice: "",
    totalReceived: ""
  });
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name: "" });
  const [editUnitForm, setEditUnitForm] = useState({
    label: "",
    status: STATUS_OPTIONS[0].value,
    listPrice: "",
    salePrice: "",
    totalReceived: ""
  });
  const [milestoneForm, setMilestoneForm] = useState({ label: "", amount: "" });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activeTab, setActiveTab] = useState(1);

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
    setUnitForm({
      label: "",
      status: STATUS_OPTIONS[0].value,
      listPrice: "",
      salePrice: "",
      totalReceived: ""
    });
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

  const tabData = [
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
    if (selectedProperty && !selectedPhase) {
      setActiveTab(2);
    }
    setShowUnitForm(false);
    setShowPhaseForm(false);
  }, [selectedProperty, selectedPhase]);

  useEffect(() => {
    if (activeUnit) {
      setEditUnitForm({
        label: activeUnit.unit.label,
        status: activeUnit.unit.status,
        listPrice: activeUnit.unit.listPrice ?? "",
        salePrice: activeUnit.unit.salePrice ?? "",
        totalReceived: activeUnit.unit.totalReceived ?? ""
      });
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
        body: JSON.stringify(propertyForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add property");
      }
      setPropertyForm({ name: "", location: "", type: PROPERTY_TYPES[0].value });
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

    if (!selectedPropertyId || !selectedPhase) {
      setUnitFormError("Select a property and phase first.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/properties/${selectedPropertyId}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...unitForm,
          listPrice: unitForm.listPrice ? Number(unitForm.listPrice) : null,
          salePrice: unitForm.salePrice ? Number(unitForm.salePrice) : null,
          totalReceived: unitForm.totalReceived ? Number(unitForm.totalReceived) : null,
          phaseName: selectedPhase.name
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add unit");
      }
      setUnitForm({
        label: "",
        status: STATUS_OPTIONS[0].value,
        listPrice: "",
        salePrice: "",
        totalReceived: ""
      });
      await fetchProperties(selectedPropertyId);
      const nextPhaseId = payload.data?.phase?.id ?? selectedPhaseId;
      if (nextPhaseId) {
        setSelectedPhaseId(nextPhaseId);
      }
      setSelectedUnit(payload.data?.unit?.id ?? null);
      setActiveTab(3);
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
        setActiveTab(3);
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
      const response = await fetch(
        `${API_BASE}/api/properties/${selectedPropertyId}/units/${selectedUnit}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            label: editUnitForm.label,
            status: editUnitForm.status,
            listPrice: editUnitForm.listPrice ? Number(editUnitForm.listPrice) : null,
            salePrice: editUnitForm.salePrice ? Number(editUnitForm.salePrice) : null,
            totalReceived: editUnitForm.totalReceived ? Number(editUnitForm.totalReceived) : null
          })
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
                            onChange={(event) =>
                              setPropertyForm((prev) => ({ ...prev, type: event.target.value }))
                            }
                          >
                            {PROPERTY_TYPES.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
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

            {activeTab === 2 && (
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
                            setActiveTab(3);
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

            {activeTab === 3 && (
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
                            <p className="unit-name">{unit.label}</p>
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
                                  aria-label={`Delete ${unit.label}`}
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
                          <span>Unit label</span>
                          <input
                            type="text"
                            value={unitForm.label}
                            onChange={(event) =>
                              setUnitForm((prev) => ({ ...prev, label: event.target.value }))
                            }
                            placeholder="e.g., Unit 5C"
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
                            {unitFormError && <p className="form-error">{unitFormError}</p>}
                            <div className="form-actions">
                              <button type="button" className="ghost-btn" onClick={() => setShowUnitForm(false)}>
                                Cancel
                              </button>
                              <button type="submit" className="primary-btn" disabled={!selectedPhase}>
                                {selectedPhase ? "Save unit" : "Select a phase first"}
                              </button>
                            </div>
                          </form>
                        </article>
                      ) : (
                        <button
                          className="floating-btn"
                          type="button"
                          onClick={() => setShowUnitForm(true)}
                          disabled={!selectedPhase}
                        >
                          +
                          <span className="sr-only">Add unit</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="property-meta">Select a phase to view its units.</p>
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
              <h3>{activeUnit.unit.label}</h3>
            </div>
            <div className="drawer-actions">
              <button className="ghost-btn" type="button" onClick={() => setShowEditForm((v) => !v)}>
                {showEditForm ? "Close edit" : "Edit unit"}
              </button>
            </div>
          </div>
          <p className="property-meta">
            {selectedProperty?.name} • {activeUnit.phase.name}
          </p>
          <StatusBadge status={activeUnit.unit.status} />
          {showEditForm && (
            <article className="form-card inline-form">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Edit unit</p>
              <h3>{activeUnit.unit.label}</h3>
            </div>
          </div>
          <form onSubmit={handleUnitEditSubmit} className="stacked-form">
            <label>
              <span>Unit label</span>
              <input
                type="text"
                value={editUnitForm.label}
                onChange={(event) => setEditUnitForm((prev) => ({ ...prev, label: event.target.value }))}
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
            {unitFormError && <p className="form-error">{unitFormError}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setShowEditForm(false);
                  setUnitFormError("");
                  setEditUnitForm({
                    label: activeUnit.unit.label,
                    status: activeUnit.unit.status,
                    listPrice: activeUnit.unit.listPrice ?? "",
                    salePrice: activeUnit.unit.salePrice ?? "",
                    totalReceived: activeUnit.unit.totalReceived ?? ""
                  });
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
