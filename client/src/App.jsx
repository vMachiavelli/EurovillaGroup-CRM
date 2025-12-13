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
    phaseName: "",
    label: "",
    status: STATUS_OPTIONS[0].value
  });
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

  const collapsedWidth = "72px";
  const propertyWidth = activeTab === 1 ? "260px" : collapsedWidth;
  const phaseWidth = activeTab === 2 ? "260px" : collapsedWidth;
  const detailsWidth = activeTab === 3 ? "1fr" : collapsedWidth;
  const mainGridStyle = {
    "--prop-width": propertyWidth,
    "--phase-width": phaseWidth,
    "--details-width": detailsWidth
  };
  const propertyPanelClass = `properties-panel ${activeTab === 1 ? "panel-active" : "panel-collapsed"}`;
  const phasePanelClass = `phase-panel ${activeTab === 2 ? "panel-active" : "panel-collapsed"}`;
  const detailPanelClass = `details-panel ${activeTab === 3 ? "panel-active" : "panel-collapsed"}`;

  useEffect(() => {
    if (!selectedProperty) {
      setActiveTab(1);
    }
  }, [selectedProperty]);

  useEffect(() => {
    if (selectedProperty && !selectedPhase) {
      setActiveTab(2);
    }
  }, [selectedProperty, selectedPhase]);

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

    try {
      const response = await fetch(`${API_BASE}/api/properties/${selectedPropertyId}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(unitForm)
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to add unit");
      }
      setUnitForm({ phaseName: "", label: "", status: STATUS_OPTIONS[0].value });
      await fetchProperties(selectedPropertyId);
      setSelectedUnit(payload.data?.unit?.id ?? null);
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

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">ATT CRM</p>
          <h1>Project status at a glance</h1>
        </div>
      </header>

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
        <section className={propertyPanelClass}>
          <div
            className="panel-collapsed-indicator"
            role="button"
            tabIndex={activeTab === 1 ? -1 : 0}
            onClick={() => setActiveTab(1)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveTab(1);
              }
            }}
          >
            <span>Properties</span>
            <strong>{selectedProperty ? selectedProperty.name : "Select a property"}</strong>
          </div>
          <div className="panel-content">
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
          </div>
        </section>

        <section className={phasePanelClass}>
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
        </section>

        <section className="details-panel">
          {selectedProperty ? (
            <>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Active property</p>
                  <h2>{selectedProperty.name}</h2>
                  <div className="property-line">
                    <p className="property-meta">{selectedProperty.location}</p>
                    <PropertyTypeBadge type={selectedProperty.type} />
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
                    <table>
                      <thead>
                        <tr>
                          <th>Unit</th>
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
                            onClick={() => setSelectedUnit(unit.id)}
                          >
                            <td>
                              <p className="unit-name">{unit.label}</p>
                              <p className="eyebrow">#{unit.id}</p>
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
                                  if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
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
                            <td colSpan={4} className="property-meta">
                              No units in this phase yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </article>
                </div>
              ) : (
                <p className="property-meta">Select a phase to view its units.</p>
              )}
            </>
          ) : (
            <div className="empty-state">
              <p>Select a property to view its details.</p>
            </div>
          )}
        </section>
      </main>

      <section className="form-grid">
        <article className="form-card">
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
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))}
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
                onChange={(event) => setPropertyForm((prev) => ({ ...prev, type: event.target.value }))}
              >
                {PROPERTY_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {propertyFormError && <p className="form-error">{propertyFormError}</p>}
            <button type="submit" className="primary-btn">
              Save property
            </button>
          </form>
        </article>

        <article className="form-card">
          <div className="panel-header">
            <div>
              <p className="eyebrow">New record</p>
              <h3>Add unit</h3>
            </div>
          </div>
          <form onSubmit={handleUnitSubmit} className="stacked-form">
            <label>
              <span>Phase name</span>
              <input
                type="text"
                value={unitForm.phaseName}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, phaseName: event.target.value }))}
                placeholder="e.g., Tower B"
                required
              />
            </label>
            <label>
              <span>Unit label</span>
              <input
                type="text"
                value={unitForm.label}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, label: event.target.value }))}
                placeholder="e.g., Unit 5C"
                required
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={unitForm.status}
                onChange={(event) => setUnitForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {unitFormError && <p className="form-error">{unitFormError}</p>}
            <button type="submit" className="primary-btn" disabled={!selectedPropertyId}>
              {selectedPropertyId ? "Save unit" : "Select a property first"}
            </button>
          </form>
        </article>
      </section>

      {activeUnit && (
        <section className="drawer">
          <div>
            <p className="eyebrow">Unit detail</p>
            <h3>{activeUnit.unit.label}</h3>
          </div>
          <p className="property-meta">
            {selectedProperty?.name} • {activeUnit.phase.name}
          </p>
          <StatusBadge status={activeUnit.unit.status} />
          <div className="milestones column">
            {(activeUnit.unit.milestones ?? []).map((milestone) => (
              <div key={milestone.label} className="milestone-row">
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
        </section>
      )}
    </div>
  );
}

export default App;
